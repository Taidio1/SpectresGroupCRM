"use client"

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authApi } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"
import { useErrorLogger } from "@/hooks/useErrorLogger"
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

// Konfiguracja timeoutów i limits
const AUTH_TIMEOUT_MS = 30000 // 30 sekund na inicjalizację (zwiększone dla wolnych połączeń)
const MAX_RETRY_ATTEMPTS = 3
const LOADING_HANG_TIMEOUT_MS = 45000 // 45 sekund - po tym czasie uważamy że loading się zawiesił

export function EnhancedAuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [sessionHanged, setSessionHanged] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setAuthenticated } = useAuth()
  const { logError, logInfo } = useErrorLogger()
  
  // Refs dla timeoutów
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hangDetectionRef = useRef<NodeJS.Timeout | null>(null)
  
  // Memoized values aby uniknąć re-renderów
  const publicRoutes = ["/login", "/register"]
  const isPublicRoute = publicRoutes.includes(pathname)

  // Funkcja do czyszczenia sesji
  const clearSession = useCallback(async () => {
    try {
      logInfo("Clearing corrupted session", { 
        component: 'enhanced-auth-provider',
        pathname,
        retryCount
      })
      
      // Wyloguj z Supabase
      await authApi.signOut()
      
      // Wyczyść localStorage
      localStorage.clear()
      
      // Wyczyść sessionStorage  
      sessionStorage.clear()
      
      // Wyczyść state aplikacji
      setUser(null)
      setAuthenticated(false)
      
      logInfo("Session cleared successfully", { 
        component: 'enhanced-auth-provider',
        pathname
      })
    } catch (clearError) {
      logError("Error clearing session", clearError, { 
        component: 'enhanced-auth-provider',
        pathname
      })
    }
  }, [setUser, setAuthenticated, logError, logInfo, pathname, retryCount])

  // Funkcja do wykrywania i resetowania zawieszenia
  const handleSessionHang = useCallback(async () => {
    logError("Session hang detected - initiating emergency reset", new Error("Session hang timeout"), {
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
  }, [clearSession, router, logError, logInfo, pathname, retryCount])

  // Funkcja inicjalizacji autoryzacji z timeoutem
  const initAuthWithTimeout = useCallback(async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // AbortController do anulowania operacji
      const abortController = new AbortController()
      let isCompleted = false
      
      // Timeout dla całej operacji
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          abortController.abort()
          reject(new Error("Authentication timeout - sprawdź połączenie internetowe"))
        }
      }, AUTH_TIMEOUT_MS)

      const performAuth = async () => {
        try {
          logInfo(`Auth init attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`, {
            component: 'enhanced-auth-provider',
            pathname,
            retryCount,
            action: 'auth_init_attempt'
          })
          
          // Sprawdź czy operacja została anulowana
          if (abortController.signal.aborted) {
            throw new Error("Operation was cancelled")
          }
          
          // Sprawdź czy jest aktywna sesja
          logInfo("Checking session...", { 
            component: 'enhanced-auth-provider',
            pathname 
          })
          
          const session = await authApi.getSession()
          
          // Sprawdź czy operacja została anulowana po getSession
          if (abortController.signal.aborted) {
            throw new Error("Operation was cancelled")
          }
          
          if (session?.user) {
            logInfo("Session found, fetching user profile", { 
              component: 'enhanced-auth-provider',
              pathname,
              userId: session.user.id 
            })
            
            // Pobierz profil użytkownika
            const userProfile = await authApi.getUserProfile(session.user.id)
            
            // Sprawdź czy operacja została anulowana po getUserProfile
            if (abortController.signal.aborted) {
              throw new Error("Operation was cancelled")
            }
            
            setUser(userProfile)
            setAuthenticated(true)
            
            logInfo("Authentication successful", { 
              component: 'enhanced-auth-provider',
              pathname,
              userProfile: userProfile.email 
            })
            
            // Jeśli użytkownik jest na stronie logowania/rejestracji, przekieruj do dashboard
            if (isPublicRoute) {
              router.push("/")
            }
          } else {
            logInfo("No session found, redirecting to login", {
              component: 'enhanced-auth-provider',
              pathname,
              action: 'redirect_to_login'
            })
            
            // Brak sesji - wyloguj użytkownika
            setUser(null)
            setAuthenticated(false)
            
            // Jeśli nie jest na publicznej stronie, przekieruj do logowania
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
          
          // Lepsze komunikaty błędów
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
  }, [retryCount, setUser, setAuthenticated, isPublicRoute, router, logError, logInfo])

  // Główna funkcja inicjalizacji
  const initAuth = useCallback(async () => {
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
      setRetryCount(0) // Reset retry count on success
      
    } catch (authError) {
      logError("Authentication failed", authError, {
        component: 'enhanced-auth-provider',
        pathname,
        retryCount,
        action: 'auth_failed'
      })
      
      if (retryCount < MAX_RETRY_ATTEMPTS - 1) {
        // Retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000
        logInfo(`Retrying in ${delay}ms...`, {
          component: 'enhanced-auth-provider',
          pathname,
          retryCount,
          delay,
          action: 'retry_auth'
        })
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, delay)
        return // Don't set loading to false, let retry handle it
      } else {
        // Max retries reached
        logInfo("Max retry attempts reached, clearing session", {
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
      // Wyczyść timeout wykrywania zawieszenia
      if (hangDetectionRef.current) {
        clearTimeout(hangDetectionRef.current)
        hangDetectionRef.current = null
      }
      setLoading(false)
    }
  }, [retryCount, initAuthWithTimeout, handleSessionHang, clearSession, isPublicRoute, router, logError, logInfo])

  // Funkcja retry dla UI
  const retryAuth = useCallback(() => {
    setRetryCount(0)
    setSessionHanged(false)
    initAuth()
  }, [initAuth])

  // useEffect z poprawionymi dependencies
  useEffect(() => {
    initAuth()

    // Cleanup function
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
  }, [pathname]) // Tylko pathname jako dependency!

  // Nasłuchuj zmian w autoryzacji (tylko raz)
  useEffect(() => {
    const { data: { subscription } } = authApi.onAuthStateChange(
      async (event, session) => {
        logInfo(`Auth state changed: ${event}`, {
          component: 'enhanced-auth-provider',
          pathname,
          event,
          action: 'auth_state_change'
        })
        
        if (event === "SIGNED_IN" && session?.user) {
          try {
            const userProfile = await authApi.getUserProfile(session.user.id)
            setUser(userProfile)
            setAuthenticated(true)
            router.push("/")
          } catch (error) {
            logError("Error handling SIGNED_IN event", error, {
              component: 'enhanced-auth-provider',
              pathname,
              event,
              userId: session?.user?.id
            })
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null)
          setAuthenticated(false)
          router.push("/login")
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [setUser, setAuthenticated, router, logError, logInfo, pathname])

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
          <p className="text-slate-400 mb-2">Ładowanie...</p>
          
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

  // Show error state with retry option
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
                <li>• Poczekaj chwilę i spróbuj ponownie</li>
                <li>• Restart przeglądarki może pomóc</li>
                <li>• Wyczyść cache przeglądarki</li>
              </ul>
            </div>
          )}
          
          {isConnectionError && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-blue-400 font-medium mb-2">🌐 Problem z połączeniem:</h3>
              <ul className="text-blue-300 text-sm space-y-1">
                <li>• Sprawdź stabilność sieci</li>
                <li>• Spróbuj odświeżyć stronę</li>
                <li>• Sprawdź czy inne strony działają</li>
              </ul>
            </div>
          )}
          
          <Button 
            onClick={retryAuth}
            className="bg-cyan-600 hover:bg-cyan-700 w-full mb-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Spróbuj ponownie ({MAX_RETRY_ATTEMPTS - retryCount} prób pozostało)
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/login")}
            className="border-slate-600 text-slate-300 hover:bg-slate-800 w-full"
          >
            Przejdź do logowania
          </Button>
          
          <div className="mt-4 text-xs text-slate-500">
            Timeout: {AUTH_TIMEOUT_MS / 1000}s | Próba: {retryCount + 1}/{MAX_RETRY_ATTEMPTS}
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