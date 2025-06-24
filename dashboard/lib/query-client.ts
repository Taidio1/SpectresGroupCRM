import { QueryClient } from '@tanstack/react-query'

// 🚀 PERFORMANCE: Optimized Query Client Configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed queries 2 times
      retry: 2,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for important data
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect for cached data
      refetchOnReconnect: 'always',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Retry mutations on network error
      retryDelay: 1000,
    },
  },
})

// 🎯 Query Keys - Centralized query key management
export const queryKeys = {
  // Clients queries
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const,
    history: (id: string) => [...queryKeys.clients.detail(id), 'history'] as const,
    paginated: (page: number, limit: number, filters?: Record<string, any>) => 
      [...queryKeys.clients.lists(), 'paginated', page, limit, filters] as const,
  },
  
  // Users queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    owners: () => [...queryKeys.users.all, 'owners'] as const,
  },
  
  // Dashboard queries
  dashboard: {
    all: ['dashboard'] as const,
    metrics: () => [...queryKeys.dashboard.all, 'metrics'] as const,
    stats: (userId?: string) => [...queryKeys.dashboard.metrics(), userId] as const,
    topEmployees: () => [...queryKeys.dashboard.all, 'top-employees'] as const,
    salesTrends: () => [...queryKeys.dashboard.all, 'sales-trends'] as const,
  },
  
  // Locations queries
  locations: {
    all: ['locations'] as const,
    lists: () => [...queryKeys.locations.all, 'list'] as const,
  },
  
  // Admin queries
  admin: {
    all: ['admin'] as const,
    systemStats: () => [...queryKeys.admin.all, 'system-stats'] as const,
    performance: () => [...queryKeys.admin.all, 'performance'] as const,
  }
} as const

// 🔄 Cache Utilities
export const cacheUtils = {
  // Invalidate all clients data
  invalidateClients: () => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.clients.all 
    })
  },
  
  // Invalidate specific client
  invalidateClient: (clientId: string) => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.clients.detail(clientId) 
    })
  },
  
  // Invalidate users data
  invalidateUsers: () => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.users.all 
    })
  },
  
  // Invalidate dashboard data
  invalidateDashboard: () => {
    return queryClient.invalidateQueries({ 
      queryKey: queryKeys.dashboard.all 
    })
  },
  
  // Optimistic client update
  updateClientCache: (clientId: string, updater: (oldData: any) => any) => {
    queryClient.setQueryData(
      queryKeys.clients.detail(clientId),
      updater
    )
    
    // Also update in lists
    queryClient.setQueriesData(
      { queryKey: queryKeys.clients.lists() },
      (oldData: any) => {
        if (!oldData) return oldData
        if (Array.isArray(oldData)) {
          return oldData.map(client => 
            client.id === clientId ? updater(client) : client
          )
        }
        return oldData
      }
    )
  },
  
  // Pre-populate client detail cache from list data
  setClientDetailFromList: (client: any) => {
    queryClient.setQueryData(
      queryKeys.clients.detail(client.id),
      client
    )
  }
} 