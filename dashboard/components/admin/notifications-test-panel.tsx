"use client"

import { useState } from "react"
import { Bell, Play, RefreshCw, AlertTriangle, Trash2, Clock, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useNotifications } from "@/hooks/use-notifications"
import { useToast } from "@/hooks/use-toast"
import { logger } from "@/lib/logger"

export function NotificationsTestPanel() {
  const { toast } = useToast()
  const [isRunningTest, setIsRunningTest] = useState(false)
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    triggerReminderCheck,
    triggerAntisaleCheck,
    refetch,
    isMarkingAllAsRead,
    isTriggeringReminderCheck,
    isTriggeringAntisaleCheck,
  } = useNotifications({
    limit: 50,
    enableRealtime: true
  })

  // Manualne uruchomienie cron job'a
  const handleManualCronRun = async () => {
    setIsRunningTest(true)
    try {
      const response = await fetch('/api/cron/notifications-check', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_TOKEN || 'default-secret'}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Cron job wykonany pomyślnie",
          description: `Sprawdzono przypomnienia i ostrzeżenia antysale`,
        })
      } else {
        toast({
          title: "⚠️ Cron job zakończony z błędami",
          description: result.message,
          variant: "destructive",
        })
      }

      logger.info('Manualne uruchomienie cron job', { result })
      
      // Odśwież powiadomienia po cron job'ie
      setTimeout(() => {
        refetch()
      }, 2000)

    } catch (error) {
      logger.error('Błąd wykonania cron job', { error })
      toast({
        title: "❌ Błąd",
        description: "Nie udało się uruchomić cron job",
        variant: "destructive",
      })
    } finally {
      setIsRunningTest(false)
    }
  }

  // Funkcje testowe
  const handleTriggerReminders = () => {
    triggerReminderCheck()
    toast({
      title: "🔄 Sprawdzanie przypomnień",
      description: "Uruchomiono sprawdzanie przypomnień klientów",
    })
  }

  const handleTriggerAntisale = () => {
    triggerAntisaleCheck()
    toast({
      title: "🔄 Sprawdzanie antysale",
      description: "Uruchomiono sprawdzanie długotrwałych statusów antysale",
    })
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const handleRefreshNotifications = () => {
    refetch()
    toast({
      title: "🔄 Odświeżanie",
      description: "Odświeżam listę powiadomień",
    })
  }

  // Statystyki powiadomień
  const stats = {
    total: notifications.length,
    unread: unreadCount,
    reminder: notifications.filter(n => n.type === 'reminder').length,
    antysale: notifications.filter(n => n.type === 'antysale_warning').length,
    system: notifications.filter(n => n.type === 'system').length,
    urgent: notifications.filter(n => n.urgent).length,
  }

  return (
    <div className="space-y-6">
      {/* Panel kontrolny */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Panel testowy powiadomień
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Przyciski akcji */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleManualCronRun}
              disabled={isRunningTest}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isRunningTest ? 'Uruchamianie...' : 'Cron Job'}
            </Button>

            <Button
              variant="outline"
              onClick={handleTriggerReminders}
              disabled={isTriggeringReminderCheck}
              className="flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {isTriggeringReminderCheck ? 'Sprawdzam...' : 'Przypomnienia'}
            </Button>

            <Button
              variant="outline"
              onClick={handleTriggerAntisale}
              disabled={isTriggeringAntisaleCheck}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              {isTriggeringAntisaleCheck ? 'Sprawdzam...' : 'Antysale'}
            </Button>

            <Button
              variant="outline"
              onClick={handleRefreshNotifications}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Odśwież
            </Button>
          </div>

          <Separator />

          {/* Akcje grupowe */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Akcje grupowe:
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                >
                  Oznacz wszystkie jako przeczytane
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki */}
      <Card>
        <CardHeader>
          <CardTitle>Statystyki powiadomień</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Wszystkie</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unread}</div>
              <div className="text-xs text-muted-foreground">Nieprzeczytane</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.reminder}</div>
              <div className="text-xs text-muted-foreground">Przypomnienia</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.antysale}</div>
              <div className="text-xs text-muted-foreground">Antysale</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.system}</div>
              <div className="text-xs text-muted-foreground">System</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.urgent}</div>
              <div className="text-xs text-muted-foreground">Pilne</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista powiadomień */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Lista powiadomień
            <Badge variant="secondary">{notifications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Ładowanie powiadomień...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Brak powiadomień</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border ${
                    !notification.read 
                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/30' 
                      : 'bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={
                            notification.type === 'reminder' ? 'default' :
                            notification.type === 'antysale_warning' ? 'destructive' :
                            'secondary'
                          }
                          className="text-xs"
                        >
                          {notification.type}
                        </Badge>
                        {notification.urgent && (
                          <Badge variant="destructive" className="text-xs">
                            Pilne
                          </Badge>
                        )}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">
                        {notification.title}
                      </h4>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.client && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {notification.client.first_name} {notification.client.last_name}
                          {notification.client.company_name && (
                            <span>• {notification.client.company_name}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(notification.created_at).toLocaleString('pl-PL')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informacje techniczne */}
      <Card>
        <CardHeader>
          <CardTitle>Informacje techniczne</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm">
            <strong>Vercel Cron:</strong> Uruchamiany co minutę (*/1 * * * *)
          </div>
          <div className="text-sm">
            <strong>Real-time:</strong> Subskrypcja Supabase aktywna
          </div>
          <div className="text-sm">
            <strong>RLS:</strong> Włączone (zgodnie z uprawnieniami użytkownika)
          </div>
          <div className="text-sm">
            <strong>Endpoint:</strong> <code>/api/cron/notifications-check</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 