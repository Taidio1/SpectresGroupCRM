"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Calendar,
  Home,
  LogOut,
  MessageSquare,
  Phone,
  Settings,
  Users,
  User,
  FileText,
  Award,
  Shield,
  PhoneCall,
} from "lucide-react"
import { authApi } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const getNavigationItems = (userRole?: string) => {
  const baseItems = [
    { icon: Home, label: "Dashboard", href: "/" },
    { icon: Users, label: "Klienci", href: "/clients" },
  ]

  // Moje statystyki - tylko dla pracowników
  if (userRole === 'pracownik') {
    baseItems.push({ icon: Award, label: "Moje statystyki", href: "/my-stats" })
  }

  // Raporty - dla wszystkich typów managerów, szef, admin
  if (userRole && ['manager', 'junior_manager', 'project_manager', 'szef', 'admin'].includes(userRole)) {
    baseItems.push(
      { icon: BarChart3, label: "Raporty - Ogólne", href: "/reports/general" },
      { icon: FileText, label: "Raport - Szczegóły", href: "/reports/details" }
    )
  }

  // Admin Panel - tylko dla admin i szef
  if (userRole && ['admin', 'szef'].includes(userRole)) {
    baseItems.push({ icon: Shield, label: "Admin Panel", href: "/admin" })
  }

  // Kalendarz - dla wszystkich
  baseItems.push({ icon: Calendar, label: "Kalendarz", href: "/calendar" })

  return baseItems
}

export function Sidebar() {
  const pathname = usePathname()
  const { user, clearStore } = useAuth()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await authApi.signOut()
      clearStore() // Wyczyść cały store zamiast ręcznego ustawiania
      toast({
        title: "Wylogowano pomyślnie",
        description: "Do zobaczenia!",
      })
    } catch (error: any) {
      console.error("Błąd wylogowania:", error)
      toast({
        title: "Błąd wylogowania",
        description: error.message || "Spróbuj ponownie",
        variant: "destructive"
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'szef': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'manager': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'project_manager': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
      case 'junior_manager': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
      case 'pracownik': return 'bg-green-500/20 text-green-400 border-green-500/30'
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-slate-800 p-4">
      <div className="mb-8 flex items-center gap-2">
        <div className="h-8 w-8 rounded bg-cyan-500 flex items-center justify-center">
          <Phone className="h-4 w-4 text-white" />
        </div>
                    <span className="text-xl font-semibold text-white">Spectres Group</span>
      </div>

      {/* Informacje o użytkowniku */}
      {user && (
        <div className="mb-6 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={user.avatar_url || '/placeholder-user.jpg'} 
                alt={user.full_name}
                className="object-cover"
              />
              <AvatarFallback className="bg-cyan-500 text-white">
                {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${getRoleBadgeColor(user.role)}`}
            >
              {user.role === 'admin' && 'Administrator'}
              {user.role === 'szef' && 'Szef'}
              {user.role === 'manager' && 'Manager'}
              {user.role === 'junior_manager' && 'Junior Manager'}
              {user.role === 'project_manager' && 'Project Manager'}
              {user.role === 'pracownik' && 'Pracownik'}
            </Badge>
          </div>
        </div>
      )}

      <nav className="space-y-2">
        {getNavigationItems(user?.role).map((item: { icon: any, label: string, href: string }, index: number) => {
          const isActive = pathname === item.href
          return (
            <Link key={index} href={item.href}>
              <div
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-cyan-500/20 text-cyan-400" 
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            </Link>
          )
        })}

        <Link href="/calls">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
            pathname === '/calls'
              ? "bg-cyan-500/20 text-cyan-400" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}>
            <PhoneCall className="h-4 w-4" />
            <span>Połączenia</span>
          </div>
        </Link>
      </nav>

      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <Link href="/settings">
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer ${
            pathname === '/settings'
              ? "bg-cyan-500/20 text-cyan-400" 
              : "text-slate-300 hover:bg-slate-700 hover:text-white"
          }`}>
            <Settings className="h-4 w-4" />
            <span>Ustawienia</span>
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-red-500/20 hover:text-red-400 cursor-pointer transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Wyloguj</span>
        </button>
      </div>
    </div>
  )
} 