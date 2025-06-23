// 📦 LOCAL CACHE SYSTEM dla klientów
// Optymalizacja wydajności - cache'uj część klientów lokalnie

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number // w milisekundach
}

export interface ClientsCache {
  clients: any[]
  total: number
  page: number
  pageSize: number
  filters: {
    search?: string
    status?: string
    owner?: string
    location?: string
  }
  timestamp: number
}

class CacheManager {
  private prefix = 'spectres_crm_'
  private defaultExpiry = 5 * 60 * 1000 // 5 minut

  // Sprawdź czy cache entry jest świeży
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() > entry.timestamp + entry.expiry
  }

  // Zapisz do cache
  set<T>(key: string, data: T, expiry?: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiry: expiry || this.defaultExpiry
      }
      
      localStorage.setItem(
        this.prefix + key, 
        JSON.stringify(entry)
      )
      
      console.log(`💾 Cache saved: ${key} (${JSON.stringify(entry).length} bytes)`)
    } catch (error) {
      console.warn('⚠️ Cache save failed:', error)
      // Gracefully fail - nie blokuj aplikacji
    }
  }

  // Pobierz z cache
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)
      
      if (this.isExpired(entry)) {
        console.log(`⌛ Cache expired: ${key}`)
        this.remove(key)
        return null
      }

      console.log(`💾 Cache hit: ${key}`)
      return entry.data
    } catch (error) {
      console.warn('⚠️ Cache read failed:', error)
      this.remove(key)
      return null
    }
  }

  // Usuń z cache
  remove(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key)
      console.log(`🗑️ Cache removed: ${key}`)
    } catch (error) {
      console.warn('⚠️ Cache remove failed:', error)
    }
  }

  // Wyczyść wszystko
  clear(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      )
      
      keys.forEach(key => localStorage.removeItem(key))
      console.log(`🧹 Cache cleared: ${keys.length} items`)
    } catch (error) {
      console.warn('⚠️ Cache clear failed:', error)
    }
  }

  // Sprawdź rozmiar cache
  getSize(): { items: number, sizeKB: number } {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      )
      
      let totalSize = 0
      keys.forEach(key => {
        const item = localStorage.getItem(key)
        if (item) totalSize += item.length
      })

      return {
        items: keys.length,
        sizeKB: Math.round(totalSize / 1024)
      }
    } catch (error) {
      return { items: 0, sizeKB: 0 }
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager()

// 🚀 KLIENCI CACHE API
export const clientsCache = {
  // Zapisz stronę klientów
  savePage(
    clients: any[], 
    page: number, 
    pageSize: number, 
    total: number,
    filters: any = {}
  ): void {
    const cacheKey = this.getCacheKey(page, pageSize, filters)
    
    const cacheData: ClientsCache = {
      clients,
      total,
      page,
      pageSize,
      filters,
      timestamp: Date.now()
    }

    cacheManager.set(cacheKey, cacheData, 5 * 60 * 1000) // 5 minut
  },

  // Pobierz stronę klientów
  getPage(
    page: number, 
    pageSize: number, 
    filters: any = {}
  ): ClientsCache | null {
    const cacheKey = this.getCacheKey(page, pageSize, filters)
    return cacheManager.get<ClientsCache>(cacheKey)
  },

  // Zapisz wszystkich klientów (dla małych zestawów)
  saveAll(clients: any[]): void {
    cacheManager.set('all_clients', clients, 3 * 60 * 1000) // 3 minuty
  },

  // Pobierz wszystkich klientów
  getAll(): any[] | null {
    return cacheManager.get<any[]>('all_clients')
  },

  // Zapisz ostatnio przeglądanych klientów
  saveRecent(clients: any[]): void {
    const recent = clients.slice(0, 50) // Maksymalnie 50 ostatnich
    cacheManager.set('recent_clients', recent, 10 * 60 * 1000) // 10 minut
  },

  // Pobierz ostatnio przeglądanych
  getRecent(): any[] | null {
    return cacheManager.get<any[]>('recent_clients')
  },

  // Wygeneruj klucz cache na podstawie parametrów
  getCacheKey(page: number, pageSize: number, filters: any): string {
    const filterKey = JSON.stringify(filters || {})
    return `clients_p${page}_s${pageSize}_${btoa(filterKey).slice(0, 10)}`
  },

  // Invalidate cache (po zmianach)
  invalidate(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.includes('spectres_crm_clients')
    )
    
    keys.forEach(key => localStorage.removeItem(key))
    console.log('♻️ Cache invalidated:', keys.length, 'entries')
  },

  // Sprawdź czy są dostępne dane offline
  hasOfflineData(): boolean {
    const recent = this.getRecent()
    const all = this.getAll()
    
    return Boolean(recent?.length || all?.length)
  },

  // Pobierz dane offline (fallback)
  getOfflineData(): any[] {
    return this.getRecent() || this.getAll() || []
  }
} 