import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys, cacheUtils } from '@/lib/query-client'
import { clientsApi, activityLogsApi, User } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { useAuth } from '@/store/useStore'

// 🎯 MAIN CLIENTS QUERY - Replace multiple API calls with single cached query
export function useClients(filters?: {
  search?: string
  status?: string
  owner?: string
  location?: string
}) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      logger.loading('📊 Fetching clients list', { filters })
      const clients = await clientsApi.getClients(user, filters)
      logger.success('✅ Clients loaded from database', { count: clients.length })
      return clients
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000, // 3 minutes - clients data changes often
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true,
    retry: 2,
  })
}

// 🎯 PAGINATED CLIENTS QUERY - For better performance with large datasets
export function useClientsPaginated(
  page: number = 1,
  limit: number = 25,
  filters?: Record<string, any>
) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.clients.paginated(page, limit, filters),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated')
      logger.loading(`📊 Fetching clients page ${page}`, { page, limit, filters })
      const result = await clientsApi.getClientsPaginated(user, { 
        ...filters, 
        page, 
        pageSize: limit 
      })
      logger.success(`✅ Clients page ${page} loaded`, { 
        count: result.clients.length, 
        total: result.total 
      })
      return result
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData, // TanStack Query v5 replacement for keepPreviousData
    retry: 2,
  })
}

// 🎯 CLIENT DETAILS QUERY - For popup and edit forms
export function useClient(clientId: string | null) {
  const { user } = useAuth()
  
  return useQuery({
    queryKey: queryKeys.clients.detail(clientId || ''),
    queryFn: async () => {
      if (!clientId || !user) return null
      logger.loading(`📋 Fetching client details`, { clientId })
      // Get all clients and find the specific one (no getClientById in API)
      const clients = await clientsApi.getClients(user)
      const client = clients.find(c => c.id === clientId)
      if (!client) throw new Error('Client not found')
      logger.success(`✅ Client details loaded`, { clientId, name: `${client.first_name} ${client.last_name}` })
      return client
    },
    enabled: !!clientId && !!user, // Only run when we have clientId and user
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

// 🎯 CLIENT HISTORY QUERY
export function useClientHistory(clientId: string | null) {
  return useQuery({
    queryKey: queryKeys.clients.history(clientId || ''),
    queryFn: async () => {
      if (!clientId) return []
      logger.loading(`📋 Fetching client history`, { clientId })
      const history = await activityLogsApi.getClientHistory(clientId)
      logger.success(`✅ Client history loaded`, { clientId, count: history.length })
      return history
    },
    enabled: !!clientId,
    staleTime: 1 * 60 * 1000, // History changes less frequently
    gcTime: 3 * 60 * 1000,
  })
}

// 🎯 CREATE CLIENT MUTATION
export function useCreateClient() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (newClient: any) => {
      if (!user) throw new Error('User not authenticated')
      logger.loading('💾 Creating new client', { name: `${newClient.first_name} ${newClient.last_name}` })
      const client = await clientsApi.createClient(newClient, user)
      logger.success('✅ Client created successfully', { clientId: client.id })
      return client
    },
    onSuccess: (newClient) => {
      // Invalidate and refetch clients list
      cacheUtils.invalidateClients()
      
      // Optimistically add to cache
      queryClient.setQueryData(
        queryKeys.clients.detail(newClient.id),
        newClient
      )

      toast({
        title: "✅ Sukces",
        description: `Klient ${newClient.first_name} ${newClient.last_name} został dodany`,
      })
    },
    onError: (error) => {
      logger.error('❌ Failed to create client', { error })
      toast({
        title: "❌ Błąd",
        description: "Nie udało się dodać klienta",
        variant: "destructive",
      })
    },
  })
}

// 🎯 UPDATE CLIENT MUTATION
export function useUpdateClient() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ clientId, updates }: { clientId: string, updates: any }) => {
      if (!user) throw new Error('User not authenticated')
      logger.loading('💾 Updating client', { clientId, updates })
      const client = await clientsApi.updateClient(clientId, updates, user)
      logger.success('✅ Client updated successfully', { clientId })
      return client
    },
    onSuccess: (updatedClient, { clientId }) => {
      // Update specific client in cache
      cacheUtils.updateClientCache(clientId, () => updatedClient)
      
      // Invalidate client detail to ensure consistency
      cacheUtils.invalidateClient(clientId)

      toast({
        title: "✅ Sukces",
        description: `Klient został zaktualizowany`,
      })
    },
    onError: (error) => {
      logger.error('❌ Failed to update client', { error })
      toast({
        title: "❌ Błąd",
        description: "Nie udało się zaktualizować klienta",
        variant: "destructive",
      })
    },
  })
}

// 🎯 DELETE CLIENT MUTATION
export function useDeleteClient() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!user) throw new Error('User not authenticated')
      logger.loading('🗑️ Deleting client', { clientId })
      await clientsApi.deleteClient(clientId, user)
      logger.success('✅ Client deleted successfully', { clientId })
      return clientId
    },
    onSuccess: (clientId) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: queryKeys.clients.detail(clientId) })
      cacheUtils.invalidateClients()

      toast({
        title: "✅ Sukces",
        description: "Klient został usunięty",
      })
    },
    onError: (error) => {
      logger.error('❌ Failed to delete client', { error })
      toast({
        title: "❌ Błąd",
        description: "Nie udało się usunąć klienta",
        variant: "destructive",
      })
    },
  })
}

// 🎯 OPTIMISTIC UPDATE HELPER - For real-time updates
export function useOptimisticClientUpdate() {
  const queryClient = useQueryClient()

  return (clientId: string, updates: Partial<any>) => {
    cacheUtils.updateClientCache(clientId, (oldClient) => ({
      ...oldClient,
      ...updates,
      updated_at: new Date().toISOString()
    }))
  }
}

// 🎯 PREFETCH CLIENT - For hover effects and navigation optimization
export function usePrefetchClient() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return (clientId: string) => {
    if (!user) return
    
    queryClient.prefetchQuery({
      queryKey: queryKeys.clients.detail(clientId),
      queryFn: async () => {
        const clients = await clientsApi.getClients(user)
        const client = clients.find(c => c.id === clientId)
        if (!client) throw new Error('Client not found')
        return client
      },
      staleTime: 2 * 60 * 1000,
    })
  }
} 