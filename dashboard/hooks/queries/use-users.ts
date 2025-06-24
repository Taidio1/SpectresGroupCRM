import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import { authApi } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// 🎯 ALL USERS QUERY - Replace multiple calls to getAllUsersForDisplay
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.lists(),
    queryFn: async () => {
      logger.loading('👥 Fetching users list')
      const users = await authApi.getAllUsersForDisplay()
      logger.success('✅ Users loaded from database', { count: users.length })
      return users
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - users list changes rarely
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Users don't change often
    retry: 2,
  })
}

// 🎯 OWNERS QUERY - Filtered list for client ownership
export function useOwners() {
  return useQuery({
    queryKey: queryKeys.users.owners(),
    queryFn: async () => {
      logger.loading('👥 Fetching available owners')
      const users = await authApi.getAllUsersForDisplay()
      // Filter only active users who can own clients (all roles except inactive)
      const owners = users.filter(user => user.is_active !== false)
      logger.success('✅ Owners loaded', { count: owners.length })
      return owners
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  })
}

// 🎯 USER DETAILS QUERY
export function useUser(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId || ''),
    queryFn: async () => {
      if (!userId) return null
      logger.loading(`👤 Fetching user details`, { userId })
      // If we have a getUserById function, use it, otherwise filter from all users
      const users = await authApi.getAllUsersForDisplay()
      const user = users.find(u => u.id === userId)
      logger.success(`✅ User details loaded`, { userId, name: user?.full_name })
      return user || null
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
} 