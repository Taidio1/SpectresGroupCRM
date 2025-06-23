// 📦 HOOK: Cache klientów z paginacją
// Optymalizacja wydajności - lokalny cache + paginacja serwerowa

import { useState, useEffect, useCallback } from 'react'
import { clientsApi, type User, type Client, type PaginatedClientsResult } from '@/lib/supabase'
import { clientsCache } from '@/lib/cache'

export interface UseClientsCacheOptions {
  pageSize?: number
  enableCache?: boolean
  preloadNextPage?: boolean
}

export interface UseClientsCacheReturn {
  clients: Client[]
  total: number
  currentPage: number
  totalPages: number
  loading: boolean
  error: string | null
  isOffline: boolean
  hasNextPage: boolean
  hasPrevPage: boolean
  // Actions
  loadPage: (page: number) => Promise<void>
  loadNextPage: () => Promise<void>
  loadPrevPage: () => Promise<void>
  refreshCurrentPage: () => Promise<void>
  searchClients: (query: string) => Promise<void>
  filterClients: (filters: any) => Promise<void>
  invalidateCache: () => void
  // Cache stats
  getCacheInfo: () => { items: number, sizeKB: number }
}

export function useClientsCache(
  user: User | null,
  options: UseClientsCacheOptions = {}
): UseClientsCacheReturn {
  const {
    pageSize = 100,
    enableCache = true,
    preloadNextPage = true
  } = options

  // State
  const [clients, setClients] = useState<Client[]>([])
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(false)
  const [filters, setFilters] = useState<any>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Computed values
  const totalPages = Math.ceil(total / pageSize)
  const hasNextPage = currentPage < totalPages
  const hasPrevPage = currentPage > 1

  // Load clients from API or cache
  const loadClients = useCallback(async (
    page: number,
    searchQuery?: string,
    filters?: any,
    useCache = enableCache
  ): Promise<PaginatedClientsResult | null> => {
    if (!user) return null

    try {
      setLoading(true)
      setError(null)

      const queryFilters = {
        ...filters,
        page,
        pageSize,
        ...(searchQuery && { search: searchQuery })
      }

      // 1. Sprawdź cache najpierw
      if (useCache) {
        const cached = clientsCache.getPage(page, pageSize, queryFilters)
        if (cached) {
          console.log(`💾 Cache hit: strona ${page}`)
          setClients(cached.clients)
          setTotal(cached.total)
          setCurrentPage(cached.page)
          setIsOffline(false)
          return cached
        }
      }

      // 2. Pobierz z API
      console.log(`🌐 API call: strona ${page}`)
      const result = await clientsApi.getClientsPaginated(user, queryFilters)
      
      // 3. Zapisz w cache
      if (enableCache) {
        clientsCache.savePage(result.clients, page, pageSize, result.total, queryFilters)
        
        // Zapisz ostatnio przeglądanych
        clientsCache.saveRecent(result.clients)
      }

      setClients(result.clients)
      setTotal(result.total)
      setCurrentPage(result.page)
      setIsOffline(false)

      return result

    } catch (error) {
      console.error('❌ Błąd ładowania klientów:', error)
      setError(error instanceof Error ? error.message : 'Nieznany błąd')

      // Fallback do cache/offline
      if (enableCache) {
        const offlineData = clientsCache.getOfflineData()
        if (offlineData.length > 0) {
          console.log('📱 Używam danych offline:', offlineData.length)
          setClients(offlineData)
          setTotal(offlineData.length)
          setIsOffline(true)
          setError('Brak połączenia - używam danych offline')
        }
      }

      return null
    } finally {
      setLoading(false)
    }
  }, [user, pageSize, enableCache])

  // Load specific page
  const loadPage = useCallback(async (page: number) => {
    await loadClients(page, searchQuery, filters)
    
    // Preload next page in background
    if (preloadNextPage && page < totalPages) {
      setTimeout(() => {
        loadClients(page + 1, searchQuery, filters).catch(console.warn)
      }, 1000)
    }
  }, [loadClients, searchQuery, filters, preloadNextPage, totalPages])

  // Navigation actions
  const loadNextPage = useCallback(async () => {
    if (hasNextPage) {
      await loadPage(currentPage + 1)
    }
  }, [loadPage, currentPage, hasNextPage])

  const loadPrevPage = useCallback(async () => {
    if (hasPrevPage) {
      await loadPage(currentPage - 1)
    }
  }, [loadPage, currentPage, hasPrevPage])

  const refreshCurrentPage = useCallback(async () => {
    await loadClients(currentPage, searchQuery, filters, false) // Force refresh
  }, [loadClients, currentPage, searchQuery, filters])

  // Search with debouncing
  const searchClients = useCallback(async (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1) // Reset to first page
    await loadClients(1, query, filters)
  }, [loadClients, filters])

  // Filter clients
  const filterClients = useCallback(async (newFilters: any) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page
    await loadClients(1, searchQuery, newFilters)
  }, [loadClients, searchQuery])

  // Cache management
  const invalidateCache = useCallback(() => {
    clientsCache.invalidate()
    console.log('♻️ Cache klientów wyczyszczony')
  }, [])

  const getCacheInfo = useCallback(() => {
    return clientsCache.hasOfflineData() ? 
      { items: 1, sizeKB: 1 } : // Simplified
      { items: 0, sizeKB: 0 }
  }, [])

  // Auto-load on mount and user change
  useEffect(() => {
    if (user) {
      loadPage(1)
    }
  }, [user]) // Only depend on user change

  return {
    // Data
    clients,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    isOffline,
    hasNextPage,
    hasPrevPage,
    
    // Actions
    loadPage,
    loadNextPage,
    loadPrevPage,
    refreshCurrentPage,
    searchClients,
    filterClients,
    invalidateCache,
    getCacheInfo
  }
} 