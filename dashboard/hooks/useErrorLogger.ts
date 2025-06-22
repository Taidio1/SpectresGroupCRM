import { useCallback } from 'react'

interface ErrorContext {
  component?: string
  pathname?: string
  retryCount?: number
  userId?: string
  sessionId?: string
  [key: string]: any
}

export const useErrorLogger = () => {
  // Funkcja do logowania błędów
  const logError = useCallback((
    message: string, 
    error?: any, 
    context?: ErrorContext
  ) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }

    // Logowanie do konsoli z kolorami
    console.group(`🔐 Auth Error: ${message}`)
    console.error('Error details:', error)
    console.info('Context:', context)
    console.info('Full log entry:', logEntry)
    console.groupEnd()

    // Opcjonalnie zapisz do localStorage dla debugging
    try {
      const existingLogs = JSON.parse(localStorage.getItem('auth_error_logs') || '[]')
      existingLogs.push(logEntry)
      
      // Zachowaj tylko ostatnie 50 logów
      if (existingLogs.length > 50) {
        existingLogs.splice(0, existingLogs.length - 50)
      }
      
      localStorage.setItem('auth_error_logs', JSON.stringify(existingLogs))
    } catch (storageError) {
      console.warn('Failed to save error log to localStorage:', storageError)
    }

    // TODO: Integracja z Sentry
    // if (typeof window !== 'undefined' && window.Sentry) {
    //   window.Sentry.captureException(error || new Error(message), {
    //     tags: { 
    //       component: context?.component || 'auth-provider',
    //       errorType: 'authentication'
    //     },
    //     extra: context,
    //     level: 'error'
    //   })
    // }

    // TODO: Wysyłanie do własnego endpoint'u logowania
    // if (process.env.NODE_ENV === 'production') {
    //   fetch('/api/logs/error', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(logEntry)
    //   }).catch(err => console.warn('Failed to send error log:', err))
    // }
  }, [])

  // Funkcja do pobierania logów z localStorage
  const getStoredLogs = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('auth_error_logs') || '[]')
    } catch {
      return []
    }
  }, [])

  // Funkcja do czyszczenia logów
  const clearStoredLogs = useCallback(() => {
    try {
      localStorage.removeItem('auth_error_logs')
    } catch (error) {
      console.warn('Failed to clear stored logs:', error)
    }
  }, [])

  // Funkcja do logowania informacji (nie błędów)
  const logInfo = useCallback((
    message: string, 
    context?: ErrorContext
  ) => {
    const timestamp = new Date().toISOString()
    const logEntry = {
      timestamp,
      message,
      error: null,
      level: 'info',
      context: {
        ...context,
        userAgent: navigator.userAgent,
        url: window.location.href
      }
    }

    // Logowanie do konsoli jako info (nie error)
    console.group(`ℹ️ Auth Info: ${message}`)
    console.info('Context:', context)
    console.groupEnd()

    // Nie zapisuj info logów do localStorage (tylko błędy)
  }, [])

  return {
    logError,
    logInfo,
    getStoredLogs,
    clearStoredLogs
  }
} 