import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/store/useStore'
import { notificationsApi, Notification } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { useEffect, useRef } from 'react'

// 📡 HOOK DO POWIADOMIEŃ
export function useNotifications(options?: {
  unreadOnly?: boolean
  limit?: number
  type?: Notification['type']
  enableRealtime?: boolean
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const realtimeSubscriptionRef = useRef<any>(null)

  // Pobierz powiadomienia
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', user?.id, options],
    queryFn: async () => {
      if (!user) return []
      return await notificationsApi.getNotifications(user, options)
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 sekund
    gcTime: 5 * 60 * 1000, // 5 minut
    refetchInterval: 60 * 1000, // Odświeżaj co minutę
  })

  // Pobierz liczbę nieprzeczytanych
  const {
    data: unreadCount = 0,
    refetch: refetchUnreadCount
  } = useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      return await notificationsApi.getUnreadCount(user)
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Odświeżaj co 30 sekund
  })

  // Mutacja oznaczania jako przeczytane
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsApi.markAsRead(notificationId),
    onSuccess: () => {
      // Invaliduj cache powiadomień
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    onError: (error) => {
      logger.error('Błąd oznaczania powiadomienia jako przeczytane', { error })
      toast({
        title: "Błąd",
        description: "Nie udało się oznaczyć powiadomienia jako przeczytane",
        variant: "destructive",
      })
    }
  })

  // Mutacja oznaczania wszystkich jako przeczytane
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(user!),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      
      if (count > 0) {
        toast({
          title: "✅ Sukces",
          description: `Oznaczono ${count} powiadomień jako przeczytane`,
        })
      }
    },
    onError: (error) => {
      logger.error('Błąd oznaczania wszystkich powiadomień jako przeczytane', { error })
      toast({
        title: "Błąd",
        description: "Nie udało się oznaczyć powiadomień jako przeczytane",
        variant: "destructive",
      })
    }
  })

  // Mutacja usuwania powiadomienia
  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsApi.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    onError: (error) => {
      logger.error('Błąd usuwania powiadomienia', { error })
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć powiadomienia",
        variant: "destructive",
      })
    }
  })

  // Mutacja testowego sprawdzania przypomnień
  const triggerReminderCheckMutation = useMutation({
    mutationFn: () => notificationsApi.triggerReminderCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast({
        title: "✅ Sukces",
        description: "Sprawdzanie przypomnień zostało uruchomione",
      })
    },
    onError: (error) => {
      logger.error('Błąd uruchamiania sprawdzania przypomnień', { error })
      toast({
        title: "Błąd",
        description: "Nie udało się uruchomić sprawdzania przypomnień",
        variant: "destructive",
      })
    }
  })

  // Mutacja testowego sprawdzania antysale
  const triggerAntisaleCheckMutation = useMutation({
    mutationFn: () => notificationsApi.triggerAntisaleCheck(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      toast({
        title: "✅ Sukces",
        description: "Sprawdzanie ostrzeżeń antysale zostało uruchomione",
      })
    },
    onError: (error) => {
      logger.error('Błąd uruchamiania sprawdzania antysale', { error })
      toast({
        title: "Błąd",
        description: "Nie udało się uruchomić sprawdzania antysale",
        variant: "destructive",
      })
    }
  })

  // Real-time subskrypcja
  useEffect(() => {
    if (!user || !options?.enableRealtime) return

    // Cleanup poprzednia subskrypcja
    if (realtimeSubscriptionRef.current) {
      try {
        realtimeSubscriptionRef.current.unsubscribe()
      } catch (error) {
        logger.error('Błąd odsubskrybowania powiadomień', { error })
      }
      realtimeSubscriptionRef.current = null
    }

    try {
      const subscription = notificationsApi.subscribeToNotifications(
        user.id,
        (newNotification) => {
          logger.info('📡 Nowe powiadomienie real-time', { notification: newNotification })
          
          // Invaliduj cache aby odświeżyć listę
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
          
          // Pokaż toast dla pilnych powiadomień
          if (newNotification.urgent) {
            const notificationText = newNotification.client 
              ? `${newNotification.title} - ${newNotification.client.first_name} ${newNotification.client.last_name}`
              : newNotification.title

            toast({
              title: "🔔 Nowe powiadomienie",
              description: notificationText,
              duration: 5000,
            })
          }
        }
      )

      realtimeSubscriptionRef.current = subscription
      logger.info('📡 Subskrypcja real-time powiadomień aktywna')

    } catch (error) {
      logger.error('Błąd konfiguracji real-time powiadomień', { error })
    }

    // Cleanup przy unmount
    return () => {
      if (realtimeSubscriptionRef.current) {
        try {
          realtimeSubscriptionRef.current.unsubscribe()
        } catch (error) {
          logger.error('Błąd odsubskrybowania powiadomień przy cleanup', { error })
        }
        realtimeSubscriptionRef.current = null
      }
    }
  }, [user, options?.enableRealtime, queryClient, toast])

  return {
    // Dane
    notifications,
    unreadCount,
    isLoading,
    error,
    
    // Akcje
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    refetch,
    refetchUnreadCount,
    
    // Testowe funkcje
    triggerReminderCheck: triggerReminderCheckMutation.mutate,
    triggerAntisaleCheck: triggerAntisaleCheckMutation.mutate,
    
    // Stany mutacji
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
    isTriggeringReminderCheck: triggerReminderCheckMutation.isPending,
    isTriggeringAntisaleCheck: triggerAntisaleCheckMutation.isPending,
  }
}

// 📅 HOOK DO DZISIEJSZYCH PRZYPOMNIEŃ (dla dashboard)
export function useTodayReminders() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['today-reminders', user?.id],
    queryFn: async () => {
      if (!user) return []
      return await notificationsApi.getTodayReminders(user)
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minut
    gcTime: 10 * 60 * 1000, // 10 minut
    refetchInterval: 2 * 60 * 1000, // Odświeżaj co 2 minuty
  })
}

// 🔔 HOOK DO LICZBY NIEPRZECZYTANYCH (dla navbar)
export function useUnreadNotificationsCount() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0
      return await notificationsApi.getUnreadCount(user)
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 sekund
    gcTime: 5 * 60 * 1000, // 5 minut
    refetchInterval: 30 * 1000, // Odświeżaj co 30 sekund
  })
} 