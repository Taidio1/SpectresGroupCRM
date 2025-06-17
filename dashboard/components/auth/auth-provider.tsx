"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { authApi } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"
import { Loader2 } from "lucide-react"

interface AuthContextType {
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  loading: true
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const { setUser, setAuthenticated, isAuthenticated } = useAuth()

  // Strony publiczne (nie wymagające autoryzacji)
  const publicRoutes = ["/login", "/register"]
  const isPublicRoute = publicRoutes.includes(pathname)

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Sprawdź czy jest aktywna sesja
        const session = await authApi.getSession()
        
        if (session?.user) {
          // Pobierz profil użytkownika
          const userProfile = await authApi.getUserProfile(session.user.id)
          setUser(userProfile)
          setAuthenticated(true)
          
          // Jeśli użytkownik jest na stronie logowania/rejestracji, przekieruj do dashboard
          if (isPublicRoute) {
            router.push("/")
          }
        } else {
          // Brak sesji - wyloguj użytkownika
          setUser(null)
          setAuthenticated(false)
          
          // Jeśli nie jest na publicznej stronie, przekieruj do logowania
          if (!isPublicRoute) {
            router.push("/login")
          }
        }
      } catch (error) {
        console.error("Błąd inicjalizacji autoryzacji:", error)
        setUser(null)
        setAuthenticated(false)
        
        if (!isPublicRoute) {
          router.push("/login")
        }
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Nasłuchuj zmian w autoryzacji
    const { data: { subscription } } = authApi.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          const userProfile = await authApi.getUserProfile(session.user.id)
          setUser(userProfile)
          setAuthenticated(true)
          router.push("/")
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
  }, [pathname, router, setUser, setAuthenticated, isPublicRoute])

  // Pokazuj loader podczas inicjalizacji
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-slate-400">Ładowanie...</p>
        </div>
      </div>
    )
  }

  // Jeśli nie jest autoryzowany i nie jest na publicznej stronie, nie renderuj nic
  if (!isAuthenticated && !isPublicRoute) {
    return null
  }

  // Jeśli jest autoryzowany i jest na publicznej stronie, nie renderuj nic (przekierowanie w toku)
  if (isAuthenticated && isPublicRoute) {
    return null
  }

  return (
    <AuthContext.Provider value={{ loading }}>
      {children}
    </AuthContext.Provider>
  )
} 