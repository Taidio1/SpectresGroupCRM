// Utility functions for notification management

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'client' | 'reminder' | 'error'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string // Optional URL for navigation when clicked
}

// Generate unique notification ID
export const generateNotificationId = (): string => {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create notification object
export const createNotification = (
  type: Notification['type'], 
  title: string, 
  message: string,
  actionUrl?: string
): Notification => {
  return {
    id: generateNotificationId(),
    type,
    title,
    message,
    timestamp: new Date(),
    read: false,
    actionUrl
  }
}

// Predefined notification templates
export const NotificationTemplates = {
  // Client-related notifications
  clientAssigned: (clientName: string) => createNotification(
    'client',
    'Nowy klient przypisany',
    `Otrzymałeś nowego klienta do obsługi: "${clientName}"`,
    '/clients'
  ),

  clientStatusChanged: (clientName: string, newStatus: string) => createNotification(
    'success',
    'Status klienta zmieniony',
    `Klient "${clientName}" został oznaczony jako "${newStatus}"`,
    '/clients'
  ),

  clientReminder: (clientName: string, time: string) => createNotification(
    'reminder',
    'Przypomnienie o kontakcie',
    `Zaplanowany kontakt z klientem "${clientName}" o ${time}`,
    '/clients'
  ),

  // System notifications
  systemUpdate: (version: string) => createNotification(
    'info',
    'Aktualizacja systemu',
    `System CRM został zaktualizowany do wersji ${version}`
  ),

  backupCompleted: () => createNotification(
    'success',
    'Kopia zapasowa ukończona',
    'Automatyczna kopia zapasowa danych została pomyślnie utworzona'
  ),

  // Error notifications
  systemError: (errorMessage: string) => createNotification(
    'error',
    'Błąd systemu',
    `Wystąpił błąd: ${errorMessage}`
  ),

  connectionError: () => createNotification(
    'warning',
    'Problem z połączeniem',
    'Wystąpił problem z połączeniem z bazą danych. Sprawdź swoje połączenie internetowe.'
  ),

  // User activity notifications
  newUserRegistered: (userName: string) => createNotification(
    'info',
    'Nowy użytkownik',
    `Nowy użytkownik "${userName}" dołączył do systemu`,
    '/settings'
  ),

  fileUploaded: (fileName: string, count: number) => createNotification(
    'success',
    'Plik został wgrany',
    `Pomyślnie zaimportowano ${count} klientów z pliku "${fileName}"`,
    '/clients'
  ),

  // Permission notifications
  permissionDenied: (action: string) => createNotification(
    'warning',
    'Brak uprawnień',
    `Nie masz uprawnień do wykonania akcji: ${action}`
  ),

  // Data notifications
  dataExported: (fileName: string) => createNotification(
    'success',
    'Eksport danych ukończony',
    `Dane zostały wyeksportowane do pliku "${fileName}"`
  ),

  // Performance notifications
  highActivity: (count: number) => createNotification(
    'info',
    'Wysoka aktywność',
    `Zanotowano ${count} edycji klientów w ciągu ostatniej godziny`
  )
}

// Storage keys for localStorage
export const NOTIFICATION_STORAGE_KEY = 'crm_notifications'
export const NOTIFICATION_SETTINGS_KEY = 'crm_notification_settings'

// Notification settings interface
export interface NotificationSettings {
  enableSound: boolean
  enableDesktop: boolean
  enableClientReminders: boolean
  enableSystemUpdates: boolean
  enableStatusChanges: boolean
}

// Default notification settings
export const defaultNotificationSettings: NotificationSettings = {
  enableSound: true,
  enableDesktop: false,
  enableClientReminders: true,
  enableSystemUpdates: true,
  enableStatusChanges: true
}

// Load notifications from localStorage
export const loadNotificationsFromStorage = (): Notification[] => {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert timestamp strings back to Date objects
      return parsed.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp)
      }))
    }
  } catch (error) {
    console.error('Error loading notifications from storage:', error)
  }
  
  return []
}

// Save notifications to localStorage
export const saveNotificationsToStorage = (notifications: Notification[]): void => {
  if (typeof window === 'undefined') return
  
  try {
    // Limit to last 50 notifications to avoid storage bloat
    const limitedNotifications = notifications.slice(-50)
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(limitedNotifications))
  } catch (error) {
    console.error('Error saving notifications to storage:', error)
  }
}

// Load notification settings from localStorage
export const loadNotificationSettings = (): NotificationSettings => {
  if (typeof window === 'undefined') return defaultNotificationSettings
  
  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY)
    if (stored) {
      return { ...defaultNotificationSettings, ...JSON.parse(stored) }
    }
  } catch (error) {
    console.error('Error loading notification settings:', error)
  }
  
  return defaultNotificationSettings
}

// Save notification settings to localStorage
export const saveNotificationSettings = (settings: NotificationSettings): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving notification settings:', error)
  }
}

// Format relative time
export const formatRelativeTime = (timestamp: Date): string => {
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
  
  if (diffInMinutes < 1) return 'Teraz'
  if (diffInMinutes < 60) return `${diffInMinutes}min temu`
  
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h temu`
  
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d temu`
  
  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) return `${diffInWeeks}tyg temu`
  
  return timestamp.toLocaleDateString('pl-PL')
}

// Show browser notification (requires permission)
export const showBrowserNotification = (notification: Notification): void => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications')
    return
  }

  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/placeholder-logo.png',
      tag: notification.id
    })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/placeholder-logo.png',
          tag: notification.id
        })
      }
    })
  }
}

// Play notification sound
export const playNotificationSound = (): void => {
  if (typeof window === 'undefined') return
  
  try {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
  } catch (error) {
    console.warn('Could not play notification sound:', error)
  }
} 