"use client"

import { Bell, Search, X, Clock, UserPlus, FileEdit, CheckCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/store/useStore"
import { useState, useEffect } from "react"
import { 
  Notification, 
  loadNotificationsFromStorage, 
  saveNotificationsToStorage, 
  formatRelativeTime,
  NotificationTemplates
} from "@/lib/notifications"

interface HeaderProps {
  title: string
  subtitle: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  // Ładowanie powiadomień z localStorage przy starcie
  useEffect(() => {
    const savedNotifications = loadNotificationsFromStorage()
    
    if (savedNotifications.length > 0) {
      setNotifications(savedNotifications)
    } else {
      // Jeśli brak zapisanych powiadomień, użyj przykładowych
      const mockNotifications: Notification[] = [
        NotificationTemplates.clientAssigned("Tech Solutions Sp. z o.o."),
        NotificationTemplates.clientReminder("ABC Company", "15:00"),
        NotificationTemplates.clientStatusChanged("XYZ Corp", "sale"),
        NotificationTemplates.systemUpdate("2.1.0")
      ]
      
      // Dostosuj timestampy dla przykładowych powiadomień
      mockNotifications[0].timestamp = new Date(Date.now() - 5 * 60 * 1000) // 5 min temu
      mockNotifications[1].timestamp = new Date(Date.now() - 30 * 60 * 1000) // 30 min temu
      mockNotifications[2].timestamp = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2h temu
      mockNotifications[2].read = true
      mockNotifications[3].timestamp = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1d temu
      mockNotifications[3].read = true
      
      setNotifications(mockNotifications)
    }
  }, [])

  // Zapisywanie powiadomień do localStorage przy każdej zmianie
  useEffect(() => {
    if (notifications.length > 0) {
      saveNotificationsToStorage(notifications)
    }
  }, [notifications])

  // Mapowanie ról na czytelne nazwy
  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator'
      case 'szef': return 'Szef'
      case 'manager': return 'Manager'
      case 'pracownik': return 'Pracownik'
      default: return 'Użytkownik'
    }
  }

  // Generowanie inicjałów użytkownika
  const getUserInitials = () => {
    if (!user?.full_name) return 'U'
    return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
  }

  // Pobierz liczbę nieprzeczytanych powiadomień
  const unreadCount = notifications.filter(n => !n.read).length

  // Ikona dla typu powiadomienia
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'client': return <UserPlus className="h-4 w-4 text-blue-400" />
      case 'reminder': return <Clock className="h-4 w-4 text-yellow-400" />
      case 'success': return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'warning': return <Bell className="h-4 w-4 text-orange-400" />
      case 'error': return <X className="h-4 w-4 text-red-400" />
      default: return <Bell className="h-4 w-4 text-slate-400" />
    }
  }

  // Kolor tła dla typu powiadomienia
  const getNotificationBgColor = (type: string, read: boolean) => {
    const opacity = read ? '20' : '30'
    switch (type) {
      case 'client': return `bg-blue-500/${opacity}`
      case 'reminder': return `bg-yellow-500/${opacity}`
      case 'success': return `bg-green-500/${opacity}`
      case 'warning': return `bg-orange-500/${opacity}`
      case 'error': return `bg-red-500/${opacity}`
      default: return `bg-slate-500/${opacity}`
    }
  }

  // Oznacz powiadomienie jako przeczytane
  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  // Oznacz wszystkie jako przeczytane
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  // Usuń powiadomienie
  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  // Funkcja globalna do dodawania nowych powiadomień (można używać z innych komponentów)
  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
  }

  // Eksportuj funkcję dodawania powiadomień (można użyć w innych miejscach)
  if (typeof window !== 'undefined') {
    (window as any).addNotification = addNotification
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
        
        {/* Przycisk powiadomień */}
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 bg-slate-800 border-slate-700 text-white p-0" 
            align="end" 
            side="bottom"
            alignOffset={0}
          >
            <div className="p-4 border-b border-slate-600">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Powiadomienia</h3>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Oznacz wszystkie jako przeczytane
                  </Button>
                )}
              </div>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-400 mt-1">
                  {unreadCount} nieprzeczytanych powiadomień
                </p>
              )}
            </div>
            
            <ScrollArea className="h-96">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak powiadomień</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div
                        className={`relative p-3 rounded-lg cursor-pointer transition-colors hover:bg-slate-700/50 ${
                          !notification.read ? getNotificationBgColor(notification.type, false) : ''
                        }`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-slate-300'}`}>
                                {notification.title}
                              </h4>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-slate-400 hover:text-white flex-shrink-0 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeNotification(notification.id)
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className={`text-sm mt-1 ${!notification.read ? 'text-slate-200' : 'text-slate-400'}`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              {formatRelativeTime(notification.timestamp)}
                            </p>
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="absolute top-3 right-3 w-2 h-2 bg-cyan-400 rounded-full"></div>
                        )}
                      </div>
                      {index < notifications.length - 1 && (
                        <Separator className="my-2 bg-slate-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {notifications.length > 0 && (
              <div className="p-3 border-t border-slate-600">
                <Button 
                  variant="ghost" 
                  className="w-full text-sm text-slate-400 hover:text-white"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  Zamknij powiadomienia
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
        
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