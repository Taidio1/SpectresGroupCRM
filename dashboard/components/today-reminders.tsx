"use client"

import { Clock, User, Building2, AlertCircle, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useTodayReminders } from "@/hooks/use-notifications"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import { pl } from "date-fns/locale"

export function TodayReminders() {
  const { 
    data: reminders = [], 
    isLoading, 
    error 
  } = useTodayReminders()

  const { markAsRead } = useNotifications()

  // Formatowanie czasu przypomnienia
  const formatReminderTime = (createdAt: string, metadata: any) => {
    if (metadata?.reminder_time) {
      return `Dziś o ${metadata.reminder_time}`
    }
    
    try {
      const date = new Date(createdAt)
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: pl 
      })
    } catch (error) {
      return 'Przed chwilą'
    }
  }

  // Obsługa kliknięcia w przypomnienie
  const handleReminderClick = (reminderId: string, isRead: boolean) => {
    if (!isRead) {
      markAsRead(reminderId)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Dzisiejsze przypomnienia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Dzisiejsze przypomnienia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Błąd ładowania przypomnień</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Dzisiejsze przypomnienia
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Brak przypomnień na dziś</p>
            <p className="text-xs mt-1">Wszystkie przypomnienia będą wyświetlane tutaj</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Dzisiejsze przypomnienia
          </div>
          <Badge variant="secondary">
            {reminders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((reminder) => (
          <div
            key={reminder.id}
            className={`group p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
              reminder.read 
                ? 'bg-muted/30 border-muted' 
                : reminder.urgent
                ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800/50'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50'
            }`}
            onClick={() => handleReminderClick(reminder.id, reminder.read)}
          >
            <div className="flex items-start gap-3">
              {/* Avatar klienta */}
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {reminder.client 
                    ? `${reminder.client.first_name[0]}${reminder.client.last_name[0]}`
                    : 'K'
                  }
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Tytuł i status */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium">
                    {reminder.title}
                    {reminder.urgent && (
                      <Badge variant="destructive" className="ml-2 text-xs">
                        Pilne
                      </Badge>
                    )}
                  </h4>
                  
                  <div className="flex items-center gap-1">
                    {!reminder.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                    {reminder.read && (
                      <Check className="w-3 h-3 text-green-500" />
                    )}
                  </div>
                </div>

                {/* Informacje o kliencie */}
                {reminder.client && (
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {reminder.client.first_name} {reminder.client.last_name}
                    </span>
                    {reminder.client.company_name && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {reminder.client.company_name}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Wiadomość przypomnienia */}
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {reminder.message}
                </p>

                {/* Czas i notatka */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {formatReminderTime(reminder.created_at, reminder.metadata)}
                  </span>
                  
                  {reminder.metadata?.reminder_note && reminder.metadata.reminder_note !== 'Brak notatki' && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">
                      📝 {reminder.metadata.reminder_note}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Akcje (pokazywane przy hover) */}
            <div className="flex items-center justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!reminder.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleReminderClick(reminder.id, false)
                  }}
                  className="text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Oznacz jako przeczytane
                </Button>
              )}
              
              {reminder.client_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Tu można dodać nawigację do klienta
                    window.location.href = `/clients?client=${reminder.client_id}`
                  }}
                  className="text-xs"
                >
                  <User className="w-3 h-3 mr-1" />
                  Zobacz klienta
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 