import { create } from 'zustand'
import { Client, User, ActivityLog } from '@/lib/supabase'

interface AppState {
  // Stan użytkownika
  user: User | null
  isAuthenticated: boolean
  
  // Stan klientów
  clients: Client[]
  selectedClient: Client | null
  editingClient: string | null
  
  // Stan live edycji
  liveEditingSessions: Record<string, string> // clientId -> userId
  
  // Stan aktywności
  activityLogs: ActivityLog[]
  
  // Stan UI
  sidebarOpen: boolean
  currentPage: string
  
  // Akcje użytkownika
  setUser: (user: User | null) => void
  setAuthenticated: (authenticated: boolean) => void
  
  // Akcje klientów
  setClients: (clients: Client[]) => void
  addClient: (client: Client) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  removeClient: (id: string) => void
  setSelectedClient: (client: Client | null) => void
  
  // Akcje live edycji
  startEditing: (clientId: string, userId: string) => void
  stopEditing: (clientId: string) => void
  setEditingClient: (clientId: string | null) => void
  
  // Akcje aktywności
  setActivityLogs: (logs: ActivityLog[]) => void
  addActivityLog: (log: ActivityLog) => void
  
  // Akcje UI
  setSidebarOpen: (open: boolean) => void
  setCurrentPage: (page: string) => void
}

export const useStore = create<AppState>((set, get) => ({
  // Stan początkowy
  user: null,
  isAuthenticated: false,
  clients: [],
  selectedClient: null,
  editingClient: null,
  liveEditingSessions: {},
  activityLogs: [],
  sidebarOpen: false,
  currentPage: 'dashboard',
  
  // Implementacja akcji użytkownika
  setUser: (user) => set({ user }),
  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  
  // Implementacja akcji klientów
  setClients: (clients) => set({ clients }),
  
  addClient: (client) => set((state) => ({
    clients: [client, ...state.clients]
  })),
  
  updateClient: (id, updates) => set((state) => ({
    clients: state.clients.map(client => 
      client.id === id ? { ...client, ...updates } : client
    )
  })),
  
  removeClient: (id) => set((state) => ({
    clients: state.clients.filter(client => client.id !== id),
    selectedClient: state.selectedClient?.id === id ? null : state.selectedClient
  })),
  
  setSelectedClient: (client) => set({ selectedClient: client }),
  
  // Implementacja akcji live edycji
  startEditing: (clientId, userId) => set((state) => ({
    liveEditingSessions: {
      ...state.liveEditingSessions,
      [clientId]: userId
    }
  })),
  
  stopEditing: (clientId) => set((state) => {
    const { [clientId]: removed, ...rest } = state.liveEditingSessions
    return { liveEditingSessions: rest }
  }),
  
  setEditingClient: (clientId) => set({ editingClient: clientId }),
  
  // Implementacja akcji aktywności
  setActivityLogs: (logs) => set({ activityLogs: logs }),
  
  addActivityLog: (log) => set((state) => ({
    activityLogs: [log, ...state.activityLogs]
  })),
  
  // Implementacja akcji UI
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setCurrentPage: (page) => set({ currentPage: page }),
}))

// Selektory pomocnicze
export const useAuth = () => {
  const { user, isAuthenticated, setUser, setAuthenticated } = useStore()
  return { user, isAuthenticated, setUser, setAuthenticated }
}

export const useClients = () => {
  const { 
    clients, 
    selectedClient, 
    editingClient,
    setClients, 
    addClient, 
    updateClient, 
    removeClient, 
    setSelectedClient,
    setEditingClient
  } = useStore()
  
  return { 
    clients, 
    selectedClient, 
    editingClient,
    setClients, 
    addClient, 
    updateClient, 
    removeClient, 
    setSelectedClient,
    setEditingClient
  }
}

export const useLiveEditing = () => {
  const { 
    liveEditingSessions, 
    startEditing, 
    stopEditing 
  } = useStore()
  
  // Sprawdź czy klient jest edytowany
  const isClientBeingEdited = (clientId: string) => {
    return clientId in liveEditingSessions
  }
  
  // Pobierz użytkownika edytującego klienta
  const getEditingUser = (clientId: string) => {
    return liveEditingSessions[clientId] || null
  }
  
  return { 
    liveEditingSessions, 
    startEditing, 
    stopEditing,
    isClientBeingEdited,
    getEditingUser
  }
}

export const useActivity = () => {
  const { activityLogs, setActivityLogs, addActivityLog } = useStore()
  return { activityLogs, setActivityLogs, addActivityLog }
}

export const useUI = () => {
  const { 
    sidebarOpen, 
    currentPage, 
    setSidebarOpen, 
    setCurrentPage 
  } = useStore()
  
  return { 
    sidebarOpen, 
    currentPage, 
    setSidebarOpen, 
    setCurrentPage 
  }
} 