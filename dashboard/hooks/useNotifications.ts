import { useState, useEffect, useCallback } from 'react'
import { 
  Notification, 
  loadNotificationsFromStorage, 
  saveNotificationsToStorage, 
  NotificationTemplates,
  loadNotificationSettings,
  saveNotificationSettings,
  NotificationSettings,
  showBrowserNotification,
  playNotificationSound
} from '@/lib/notifications'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [settings, setSettings] = useState<NotificationSettings>(() => loadNotificationSettings())

  // Ładowanie powiadomień z localStorage przy inicjalizacji
  useEffect(() => {
    const savedNotifications = loadNotificationsFromStorage()
    setNotifications(savedNotifications)
  }, [])

  // Automatyczne zapisywanie przy zmianach
  useEffect(() => {
    if (notifications.length > 0) {
      saveNotificationsToStorage(notifications)
    }
  }, [notifications])

  // Automatyczne zapisywanie ustawień przy zmianach
  useEffect(() => {
    saveNotificationSettings(settings)
  }, [settings])

  // Dodaj nowe powiadomienie
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev])
    
    // Odtwórz dźwięk jeśli włączone
    if (settings.enableSound) {
      playNotificationSound()
    }
    
    // Pokaż powiadomienie systemowe jeśli włączone
    if (settings.enableDesktop) {
      showBrowserNotification(notification)
    }
  }, [settings])

  // Oznacz powiadomienie jako przeczytane
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  // Oznacz wszystkie jako przeczytane
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  // Usuń powiadomienie
  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  // Wyczyść wszystkie powiadomienia
  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  // Aktualizuj ustawienia
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  // Szybkie metody dla popularnych typów powiadomień
  const notifyClientAssigned = useCallback((clientName: string) => {
    if (!settings.enableStatusChanges) return
    addNotification(NotificationTemplates.clientAssigned(clientName))
  }, [addNotification, settings.enableStatusChanges])

  const notifyClientStatusChanged = useCallback((clientName: string, newStatus: string) => {
    if (!settings.enableStatusChanges) return
    addNotification(NotificationTemplates.clientStatusChanged(clientName, newStatus))
  }, [addNotification, settings.enableStatusChanges])

  const notifyClientReminder = useCallback((clientName: string, time: string) => {
    if (!settings.enableClientReminders) return
    addNotification(NotificationTemplates.clientReminder(clientName, time))
  }, [addNotification, settings.enableClientReminders])

  const notifySystemUpdate = useCallback((version: string) => {
    if (!settings.enableSystemUpdates) return
    addNotification(NotificationTemplates.systemUpdate(version))
  }, [addNotification, settings.enableSystemUpdates])

  const notifyFileUploaded = useCallback((fileName: string, count: number) => {
    addNotification(NotificationTemplates.fileUploaded(fileName, count))
  }, [addNotification])

  const notifyPermissionDenied = useCallback((action: string) => {
    addNotification(NotificationTemplates.permissionDenied(action))
  }, [addNotification])

  const notifySystemError = useCallback((errorMessage: string) => {
    addNotification(NotificationTemplates.systemError(errorMessage))
  }, [addNotification])

  const notifyConnectionError = useCallback(() => {
    addNotification(NotificationTemplates.connectionError())
  }, [addNotification])

  // Statystyki
  const unreadCount = notifications.filter(n => !n.read).length
  const totalCount = notifications.length

  return {
    // Stan
    notifications,
    settings,
    unreadCount,
    totalCount,
    
    // Podstawowe operacje
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    updateSettings,
    
    // Szybkie metody dla typowych powiadomień
    notifyClientAssigned,
    notifyClientStatusChanged,
    notifyClientReminder,
    notifySystemUpdate,
    notifyFileUploaded,
    notifyPermissionDenied,
    notifySystemError,
    notifyConnectionError
  }
}

// Hook dla globalnego dostępu do powiadomień
export const useGlobalNotifications = () => {
  // Sprawdź czy jest dostępna globalna funkcja
  const addGlobalNotification = useCallback((notification: Notification) => {
    if (typeof window !== 'undefined' && (window as any).addNotification) {
      (window as any).addNotification(notification)
    }
  }, [])

  // Szybkie metody używające globalnej funkcji
  const notifyGlobalClientAssigned = useCallback((clientName: string) => {
    addGlobalNotification(NotificationTemplates.clientAssigned(clientName))
  }, [addGlobalNotification])

  const notifyGlobalClientStatusChanged = useCallback((clientName: string, newStatus: string) => {
    addGlobalNotification(NotificationTemplates.clientStatusChanged(clientName, newStatus))
  }, [addGlobalNotification])

  const notifyGlobalFileUploaded = useCallback((fileName: string, count: number) => {
    addGlobalNotification(NotificationTemplates.fileUploaded(fileName, count))
  }, [addGlobalNotification])

  const notifyGlobalError = useCallback((errorMessage: string) => {
    addGlobalNotification(NotificationTemplates.systemError(errorMessage))
  }, [addGlobalNotification])

  return {
    addGlobalNotification,
    notifyGlobalClientAssigned,
    notifyGlobalClientStatusChanged,
    notifyGlobalFileUploaded,
    notifyGlobalError
  }
} 