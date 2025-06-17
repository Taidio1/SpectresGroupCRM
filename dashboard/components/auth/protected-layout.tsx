"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/store/useStore"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

interface ProtectedLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function ProtectedLayout({ children, title, subtitle }: ProtectedLayoutProps) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Sidebar />
      <div className="ml-64 p-6">
        {(title || subtitle) && (
          <Header 
            title={title || `Witaj, ${user.full_name}!`}
            subtitle={subtitle || "Dashboard CRM Call Center"}
          />
        )}
        {children}
      </div>
    </div>
  )
} 