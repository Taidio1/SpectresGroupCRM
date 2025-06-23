"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/store/useStore"
import { AdminPanel } from "@/components/admin/admin-panel"
import { ProtectedLayout } from "@/components/auth/protected-layout"

export default function AdminPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Sprawdź czy użytkownik jest zalogowany i ma odpowiednie uprawnienia
    if (isAuthenticated && user) {
      if (!['admin', 'szef'].includes(user.role)) {
        // Przekieruj na główną stronę jeśli nie ma uprawnień
        router.push('/')
      }
    }
  }, [user, isAuthenticated, router])

  // Jeśli user nie ma uprawnień, nie renderuj niczego (nastąpi przekierowanie)
  if (!user || !['admin', 'szef'].includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Sprawdzanie uprawnień...</p>
        </div>
      </div>
    )
  }

  return (
    <ProtectedLayout>
      <AdminPanel />
    </ProtectedLayout>
  )
} 