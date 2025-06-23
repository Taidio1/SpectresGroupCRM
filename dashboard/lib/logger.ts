interface LogContext {
  component?: string
  action?: string
  data?: any
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production'
  
  log(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`📝 ${message}`, context ? context : '')
    }
  }
  
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(`ℹ️ ${message}`, context ? context : '')
    }
  }
  
  warn(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, context ? context : '')
    }
  }
  
  error(message: string, error?: any, context?: LogContext) {
    // Błędy logujemy zawsze, nawet w produkcji
    console.error(`❌ ${message}`, error, context ? context : '')
  }
  
  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      console.debug(`🔍 ${message}`, data ? data : '')
    }
  }
  
  success(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`✅ ${message}`, context ? context : '')
    }
  }
  
  loading(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(`🔄 ${message}`, context ? context : '')
    }
  }
}

export const logger = new Logger()

// Dla kompatybilności wstecznej
export const log = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
} 