"use client"

import { Search } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/store/useStore"
import { NotificationBell } from "@/components/notification-bell"

interface HeaderProps {
  title: string
  subtitle: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth()

  // Mapowanie ról na czytelne nazwy
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'szef': return 'Szef'
      case 'manager': return 'Manager'
      case 'project_manager': return 'Project Manager'
      case 'junior_manager': return 'Junior Manager'
      case 'pracownik': return 'Pracownik'
      default: return 'Użytkownik'
    }
  }

  // Generowanie inicjałów użytkownika
  const getUserInitials = () => {
    if (!user?.full_name) return 'U'
    return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  }

  return (
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        <p className="text-slate-400">{subtitle}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input 
            placeholder="Szukaj klientów..." 
            className="w-64 bg-slate-800 border-slate-700 pl-10 text-white placeholder:text-slate-400" 
          />
        </div>
        
        {/* Nowy system powiadomień */}
        <NotificationBell enableRealtime={true} maxNotifications={10} />
        
        <Avatar>
          <AvatarImage src="/placeholder-user.jpg" />
          <AvatarFallback className="bg-slate-700 text-white">{getUserInitials()}</AvatarFallback>
        </Avatar>
        <span className="text-sm text-white">
          {user ? getRoleDisplayName(user.role) : 'Użytkownik'}
        </span>
      </div>
    </div>
  )
} 