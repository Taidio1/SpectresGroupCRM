"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authApi } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"
import { logger } from "@/lib/logger"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface AuthContextType {
  loading: boolean
  error: string | null
  retryAuth: () => void
}

const AuthContext = createContext<AuthContextType>({
  loading: true,
  error: null,
  retryAuth: () => {}
})

export const useAuthContext = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

// Skrócone timeouty dla lepszego UX
const AUTH_TIMEOUT_MS = 8000 // 8 sekund na inicjalizację
const MAX_RETRY_ATTEMPTS = 2 // Mniej prób
const LOADING_HANG_TIMEOUT_MS = 15000 // 15 sekund na wykrycie zawieszenia

export function EnhancedAuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [sessionHanged, setSessionHanged] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { user, isAuthenticated, setUser, setAuthenticated, clearStore } = useAuth()
  
  // Refs dla timeoutów
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hangDetectionRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializingRef = useRef(false)
  
  // Memoized values
  const publicRoutes = ["/login", "/register"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Funkcja do czyszczenia sesji
  const clearSession = useCallback(async () => {
    try {
      logger.loading("Clearing corrupted session", { 
        component: 'enhanced-auth-provider',
        pathname,
        retryCount
      })
      
      // Wyloguj z Supabase
      await authApi.signOut()
      
      // Wyczyść localStorage i store
      clearStore()
      
      logger.success("Session cleared successfully", { 
        component: 'enhanced-auth-provider',
        pathname
      })
    } catch (clearError) {
      logger.error("Error clearing session", clearError, { 
        component: 'enhanced-auth-provider',
        pathname
      })
    }
  }, [clearStore, pathname, retryCount])

  // Funkcja do wykrywania i resetowania zawieszenia
  const handleSessionHang = useCallback(async () => {
    logger.error("Session hang detected - initiating emergency reset", new Error("Session hang timeout"), {
      component: 'enhanced-auth-provider',
      pathname,
      retryCount,
      action: 'session_hang_reset'
    })
    setSessionHanged(true)
    
    await clearSession()
    
    // Po 2 sekundach przekieruj do logowania
    setTimeout(() => {
      router.push("/login?error=session_reset")
    }, 2000)
  }, [clearSession, router, pathname, retryCount])

  // Funkcja inicjalizacji autoryzacji z timeoutem
  const initAuthWithTimeout = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const abortController = new AbortController()
      let isCompleted = false
      
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          abortController.abort()
          reject(new Error("Authentication timeout - sprawdź połączenie internetowe"))
        }
      }, AUTH_TIMEOUT_MS)

      const performAuth = async () => {
        try {
          // Jeśli mamy już dane użytkownika w store z localStorage, użyj ich
          if (user && isAuthenticated) {
            logger.info("User data found in persisted store, verifying session", {
              component: 'enhanced-auth-provider',
              userId: user.id,
              userEmail: user.email
            })
            
            // Sprawdź czy sesja w Supabase jest nadal ważna
            const session = await authApi.getSession()
            
            if (session?.user && session.user.id === user.id) {
              logger.success("Persisted session is valid", {
                component: 'enhanced-auth-provider',
                userId: user.id
              })
              
              // Sesja jest ważna, nie potrzeba ponownej autoryzacji
              if (isPublicRoute) {
                router.push("/")
              }
              isCompleted = true
              clearTimeout(timeoutId)
              resolve()
              return
            } else {
              logger.info("Persisted session is invalid, clearing and re-authenticating", {
                component: 'enhanced-auth-provider',
                userId: user.id
              })
              clearStore()
            }
          }
          
          logger.info(`Auth init attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`, {
            component: 'enhanced-auth-provider',
            pathname,
            retryCount,
            action: 'auth_init_attempt'
          })
          
          if (abortController.signal.aborted) {
            throw new Error("Operation was cancelled")
          }
          
          // Sprawdź sesję w Supabase
          const session = await authApi.getSession()
          
          if (abortController.signal.aborted) {
            throw new Error("Operation was cancelled")
          }
          
          if (session?.user) {
            logger.info("Session found, fetching user profile", { 
              component: 'enhanced-auth-provider',
              pathname,
              userId: session.user.id 
            })
            
            const userProfile = await authApi.getUserProfile(session.user.id)
            
            if (abortController.signal.aborted) {
              throw new Error("Operation was cancelled")
            }
            
            setUser(userProfile)
            setAuthenticated(true)
            
            logger.success("Authentication successful", { 
              component: 'enhanced-auth-provider',
              pathname,
              userProfile: userProfile.email 
            })
            
            if (isPublicRoute) {
              router.push("/")
            }
          } else {
            logger.info("No session found", {
              component: 'enhanced-auth-provider',
              pathname,
              action: 'no_session'
            })
            
            setUser(null)
            setAuthenticated(false)
            
            if (!isPublicRoute) {
              router.push("/login")
            }
          }
          
          isCompleted = true
          clearTimeout(timeoutId)
          resolve()
          
        } catch (authError: any) {
          isCompleted = true
          clearTimeout(timeoutId)
          
          if (authError.message === "Operation was cancelled") {
            reject(new Error("Operacja anulowana z powodu timeoutu"))
          } else if (authError.message?.includes("Failed to fetch") || authError.message?.includes("fetch")) {
            reject(new Error("Błąd połączenia - sprawdź internet"))
          } else if (authError.message?.includes("timeout")) {
            reject(new Error("Timeout połączenia z serwerem"))
          } else {
            reject(authError)
          }
        }
      }

      performAuth()
    })
  }, [retryCount, setUser, setAuthenticated, isPublicRoute, router, user, isAuthenticated, clearStore])

  // Główna funkcja inicjalizacji
  const initAuth = useCallback(async () => {
    // Zapobiegaj równoczesnym inicjalizacjom
    if (isInitializingRef.current) {
      logger.info("Auth initialization already in progress, skipping", {
        component: 'enhanced-auth-provider'
      })
      return
    }
    
    isInitializingRef.current = true
    
    // Wyczyść poprzednie timeouty
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current)
      initTimeoutRef.current = null
    }
    if (hangDetectionRef.current) {
      clearTimeout(hangDetectionRef.current)
      hangDetectionRef.current = null
    }

    setLoading(true)
    setError(null)
    
    // Timeout na wykrycie zawieszenia
    hangDetectionRef.current = setTimeout(handleSessionHang, LOADING_HANG_TIMEOUT_MS)

    try {
      await initAuthWithTimeout()
      setRetryCount(0)
      setIsInitialized(true)
      
    } catch (authError) {
      logger.error("Authentication failed", authError, {
        component: 'enhanced-auth-provider',
        pathname,
        retryCount,
        action: 'auth_failed'
      })
      
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        const delay = Math.pow(2, retryCount) * 1000
        logger.info(`Retrying in ${delay}ms...`, {
          component: 'enhanced-auth-provider',
          pathname,
          retryCount,
          delay,
          action: 'retry_auth'
        })
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, delay)
        return
      } else {
        logger.info("Max retry attempts reached, clearing session", {
          component: 'enhanced-auth-provider',
          pathname,
          retryCount,
          action: 'max_retries_reached'
        })
        await clearSession()
        
        setError("Błąd autoryzacji. Sesja została zresetowana.")
        
        if (!isPublicRoute) {
          router.push("/login?error=auth_failed")
        }
      }
    } finally {
      if (hangDetectionRef.current) {
        clearTimeout(hangDetectionRef.current)
        hangDetectionRef.current = null
      }
      setLoading(false)
      isInitializingRef.current = false
    }
  }, [retryCount, initAuthWithTimeout, handleSessionHang, clearSession, isPublicRoute, router])

  // Funkcja retry dla UI
  const retryAuth = useCallback(() => {
    setRetryCount(0)
    setSessionHanged(false)
    setIsInitialized(false)
    initAuth()
  }, [initAuth])

  // Główny useEffect - uruchamia się TYLKO raz przy mount
  useEffect(() => {
    if (!isInitialized) {
      initAuth()
    }

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
        initTimeoutRef.current = null
      }
      if (hangDetectionRef.current) {
        clearTimeout(hangDetectionRef.current)
        hangDetectionRef.current = null
      }
    }
  }, []) // BRAK dependencies - tylko mount/unmount!

  // Osobny useEffect dla nasłuchiwania zmian autoryzacji
  useEffect(() => {
    // Nasłuchuj tylko jeśli już zainicjalizowane
    if (!isInitialized) return

    const { data: { subscription } } = authApi.onAuthStateChange(
      async (event, session) => {
        logger.info(`Auth state changed: ${event}`, {
          component: 'enhanced-auth-provider',
          event,
          action: 'auth_state_change'
        })
        
        if (event === "SIGNED_IN" && session?.user) {
          try {
            const userProfile = await authApi.getUserProfile(session.user.id)
            setUser(userProfile)
            setAuthenticated(true)
            if (isPublicRoute) {
              router.push("/")
            }
          } catch (error) {
            logger.error("Error handling SIGNED_IN event", error, {
              component: 'enhanced-auth-provider',
              event,
              userId: session?.user?.id
            })
          }
        } else if (event === "SIGNED_OUT") {
          clearStore()
          if (!isPublicRoute) {
            router.push("/login")
          }
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [isInitialized, setUser, setAuthenticated, clearStore, router, isPublicRoute])

  // Renderowanie stanów błędów i ładowania
  if (sessionHanged) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Wykryto zawieszenie sesji
          </h2>
          <p className="text-slate-400 mb-6">
            Sesja została automatycznie zresetowana. Za chwilę nastąpi przekierowanie do strony logowania.
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Sprawdzanie autoryzacji...</p>
          
          {retryCount > 0 && (
            <p className="text-sm text-orange-400">
              Próba {retryCount + 1}/{MAX_RETRY_ATTEMPTS}
            </p>
          )}
          
          {error && (
            <Alert className="mt-4 bg-red-900/20 border-red-500/30">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  if (error && !loading) {
    const isTimeoutError = error.includes("timeout") || error.includes("Timeout") || error.includes("anulowana")
    const isConnectionError = error.includes("połączenia") || error.includes("internet")
    
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {isTimeoutError ? "Timeout autoryzacji" : "Błąd autoryzacji"}
          </h2>
          <p className="text-slate-400 mb-4">{error}</p>
          
          {isTimeoutError && (
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-orange-400 font-medium mb-2">💡 Co możesz zrobić:</h3>
              <ul className="text-orange-300 text-sm space-y-1">
                <li>• Sprawdź połączenie internetowe</li>
                <li>• Spróbuj ponownie (automatycznie)</li>
                <li>• Restart przeglądarki może pomóc</li>
                <li>• Wyczyść cache przeglądarki</li>
              </ul>
            </div>
          )}
          
          <Button 
            onClick={retryAuth}
            className="bg-cyan-600 hover:bg-cyan-700 w-full mb-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Spróbuj ponownie
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/login")}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full"
          >
            Przejdź do logowania
          </Button>
          
          <div className="mt-4 text-xs text-slate-500">
            Timeout: {AUTH_TIMEOUT_MS / 1000}s | Wersja z persistence
          </div>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ loading, error, retryAuth }}>
      {children}
    </AuthContext.Provider>
  )
} 