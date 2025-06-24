"use client"

import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { useState } from 'react'

interface QueryProviderProps {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Create query client instance on client side only
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* Note: React Query Devtools can be added later as a separate package */}
    </QueryClientProvider>
  )
} 