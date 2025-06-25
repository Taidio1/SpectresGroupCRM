"use client"

import { useState } from "react"
import { Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, Building2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  ScrollArea,
} from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useNotifications, useUnreadNotificationsCount } from "@/hooks/use-notifications"
import { logger } from "@/lib/logger"
import { Notification } from "@/lib/supabase"

interface NotificationBellProps {
  enableRealtime?: boolean
  maxNotifications?: number
}

export function NotificationBell({ 
  enableRealtime = true, 
  maxNotifications = 10 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Hook dla liczby nieprzeczytanych (główny wskaźnik)
  const { data: unreadCount = 0 } = useUnreadNotificationsCount()
  
  // Hook dla szczegółów powiadomień (ładuje się po kliknięciu)
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isMarkingAsRead,
    isMarkingAllAsRead,
    isDeleting,
  } = useNotifications({
    limit: maxNotifications,
    enableRealtime,
  })

  // Formatowanie czasu
  const formatTime = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Przed chwilą'
    if (diffMins < 60) return `${diffMins} min temu`
    if (diffHours < 24) return `${diffHours} godz. temu`
    if (diffDays < 7) return `${diffDays} dni temu`
    
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  // Ikona według typu powiadomienia
  const getNotificationIcon = (notification: Notification) => {
    switch (notification.type) {
      case 'reminder':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'antysale_warning':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />
      case 'system':
        return <Building2 className="w-4 h-4 text-gray-500" />
      default:
        return <Bell className="w-4 h-4 text-blue-500" />
    }
  }

  // Kolor według typu
  const getNotificationColor = (notification: Notification) => {
    if (!notification.read) {
      return notification.urgent 
        ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
        : 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800'
    }
    return 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
  }

  // Obsługa kliknięcia w powiadomienie
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }
    
    // Jeśli ma client_id, możemy przekierować do klienta
    if (notification.client_id) {
      // Tu można dodać nawigację do szczegółów klienta
      logger.info('Kliknięto powiadomienie klienta', { 
        clientId: notification.client_id,
        clientName: notification.client?.first_name + ' ' + notification.client?.last_name
      })
    }
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    logger.info('Oznaczono wszystkie powiadomienia jako przeczytane')
  }

  const handleDeleteNotification = (notificationId: string) => {
    deleteNotification(notificationId)
    logger.info('Usunięto powiadomienie', { notificationId })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative"
          aria-label={`Powiadomienia${unreadCount > 0 ? ` (${unreadCount} nieprzeczytanych)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Powiadomienia</CardTitle>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    disabled={isMarkingAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="w-4 h-4 mr-1" />
                    Oznacz wszystkie
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">
                {unreadCount} {unreadCount === 1 ? 'nieprzeczytane powiadomienie' : 'nieprzeczytanych powiadomień'}
              </p>
            )}
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                  Ładowanie powiadomień...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Brak powiadomień</h3>
                  <p className="text-sm">
                    Wszystkie powiadomienia będą wyświetlane tutaj
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${getNotificationColor(notification)}`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-medium">
                                {notification.title}
                                {notification.urgent && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Pilne
                                  </Badge>
                                )}
                              </h4>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                              
                              {notification.client && (
                                <div className="flex items-center gap-2 mt-2">
                                  <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-xs">
                                      {notification.client.first_name[0]}{notification.client.last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground">
                                    {notification.client.first_name} {notification.client.last_name}
                                    {notification.client.company_name && ` • ${notification.client.company_name}`}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteNotification(notification.id)
                                }}
                                disabled={isDeleting}
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatTime(notification.created_at)}
                            </span>
                            
                            {!notification.read && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsRead(notification.id)
                                }}
                                disabled={isMarkingAsRead}
                                className="text-xs"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Oznacz
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
          
          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-3 text-center">
                <Button variant="ghost" size="sm" className="text-xs">
                  Zobacz wszystkie powiadomienia
                </Button>
              </div>
            </>
          )}
        </Card>
      </PopoverContent>
    </Popover>
  )
} 