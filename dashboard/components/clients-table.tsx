"use client"

import { useState, useEffect, useRef } from "react"
import {
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Home,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  Users,
  Phone,
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  Plus,
  Upload,
  FileSpreadsheet,
  Clock,
  AlertCircle,
  History,
  User,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/store/useStore"
import { permissionsApi, activityLogsApi, clientsApi, ClientHistory, getAvatarUrl, csvImportApi, reportsApi } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { authApi, supabase } from "@/lib/supabase"
import { useLanguage } from "@/lib/language-context"
import { ClientDetailsPopup } from "@/components/client-details-popup"


// Mockowane dane klientów zgodnie z ETAPEM 5
const initialClients = [
  {
    id: '1',
    first_name: 'Jan',
    last_name: 'Kowalski',
    company_name: 'ABC Sp. z o.o.',
    nip: '1234567890',
    phone: '+48 123 456 789',
    email: 'jan.kowalski@abc.pl',
    notes: 'Zainteresowany produktem A, wymaga dodatkowych informacji o cenach',
    website: 'www.abc.pl',
    status: 'canvas' as const,
    edited_by: 'admin',
    edited_at: new Date().toISOString(),
    owner_id: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isBeingEdited: false,
    editedByUser: null as string | null,
    reminder: {
      enabled: true,
      date: '2024-06-15',
      time: '14:30',
      note: 'Zadzwonić w sprawie oferty'
    }
  },
  {
    id: '2',
    first_name: 'Anna',
    last_name: 'Nowak',
    company_name: 'XYZ Ltd.',
    nip: '0987654321',
    phone: '+48 987 654 321',
    email: 'anna.nowak@xyz.com',
    notes: 'Potrzebuje więcej informacji o implementacji',
    website: 'www.xyz.com',
    status: 'brak_kontaktu' as const,
    edited_by: 'manager1',
    edited_at: new Date().toISOString(),
    owner_id: 'user2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isBeingEdited: false,
    editedByUser: null as string | null,
    reminder: {
      enabled: false,
      date: '',
      time: '',
      note: ''
    }
  },
  {
    id: '3',
    first_name: 'Piotr',
    last_name: 'Zieliński',
    company_name: 'DEF Group',
    nip: '1122334455',
    phone: '+48 111 222 333',
    email: 'piotr.zielinski@def.pl',
    notes: 'Gotowy do zakupu, czeka na ofertę',
    website: 'www.def.pl',
    status: 'sale' as const,
    edited_by: 'pracownik1',
    edited_at: new Date().toISOString(),
    owner_id: 'user3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isBeingEdited: true,
    editedByUser: 'pracownik2',
    reminder: {
      enabled: true,
      date: '2024-06-16',
      time: '10:00',
      note: 'Wysłać finalizację umowy'
    }
  },
  {
    id: '4',
    first_name: 'Maria',
    last_name: 'Wiśniewska',
    company_name: 'GHI Corp.',
    nip: '2233445566',
    phone: '+48 444 555 666',
    email: 'maria.wisniewska@ghi.pl',
    notes: 'Nie odbiera telefonu, próbować po 15:00',
    website: 'www.ghi.pl',
    status: 'nie_zainteresowany' as const,
    edited_by: 'pracownik2',
    edited_at: new Date().toISOString(),
    owner_id: 'user4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isBeingEdited: false,
    editedByUser: null as string | null,
    reminder: {
      enabled: true,
      date: '2024-06-14',
      time: '15:30',
      note: 'Ponowny kontakt po 15:00'
    }
  },
  {
    id: '5',
    first_name: 'Tomasz',
    last_name: 'Kaczmarek',
    company_name: 'JKL Inc.',
    nip: '3344556677',
    phone: '+48 777 888 999',
    email: 'tomasz.kaczmarek@jkl.pl',
    notes: 'Wymaga dodatkowych negocjacji cenowych',
    website: 'www.jkl.pl',
    status: 'antysale' as const,
    edited_by: 'manager1',
    edited_at: new Date().toISOString(),
    owner_id: 'user5',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    isBeingEdited: false,
    editedByUser: null as string | null,
    reminder: {
      enabled: false,
      date: '',
      time: '',
      note: ''
    }
  },
]

// Statusy zgodnie z README
const statusOptions = [
  'canvas',
  'brak_kontaktu',
  'nie_zainteresowany',
  'zdenerwowany',
  'antysale',
  'sale',
  '$$',
] as const

const statusColors = {
  'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'nie_zainteresowany': 'bg-red-500/20 text-red-400 border-red-500/30',
  'zdenerwowany': 'bg-red-600/20 text-red-300 border-red-600/30',
  'antysale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
  '$$': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
}

// Pusty template dla nowego klienta
const emptyClient = {
  id: '',
  first_name: '',
  last_name: '',
  company_name: '',
  nip: '',
  phone: '',
  email: '',
  notes: '',
  website: '',
  status: 'canvas' as const,
  edited_by: '',
  edited_at: '',
  owner_id: '',
  created_at: '',
  updated_at: '',
  isBeingEdited: false,
  editedByUser: null as string | null,
  reminder: {
    enabled: false,
    date: '',
    time: '',
    note: ''
  }
}



export function ClientsTable() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [clients, setClients] = useState<any[]>([])
  const [filteredClients, setFilteredClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [savingNewClient, setSavingNewClient] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [newClient, setNewClient] = useState(emptyClient)
  
  // Stany dla upload plików
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 100, status: '' })
  const [importResults, setImportResults] = useState<{ success: number, errors: any[] } | null>(null)
  const [columnAnalysis, setColumnAnalysis] = useState<{ found: string[], missing: string[], optional: string[] } | null>(null)
  const [currentUser] = useState('current_user')
  const [clientHistory, setClientHistory] = useState<ClientHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false) // Dodaj stan śledzenia czy historia została załadowana
  
  // Filtry
  const [searchQuery, setSearchQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [availableOwners, setAvailableOwners] = useState<any[]>([])
  
  // Stan dla WSZYSTKICH użytkowników w systemie (do wyświetlania właścicieli)
  const [allUsers, setAllUsers] = useState<any[]>([])
  
  // Sortowanie
  const [sortField, setSortField] = useState<string>('updated_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // Paginacja
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [totalPages, setTotalPages] = useState(0)
  const [paginatedClients, setPaginatedClients] = useState<any[]>([])
  
  // Stan dla popup detali klienta
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<any>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)
  
  // Ref dla ScrollArea historii
  const historyScrollRef = useRef<HTMLDivElement>(null)
  
  // Stan dla real-time aktualizacji właścicieli
  const [ownerUpdates, setOwnerUpdates] = useState<Record<string, any>>({})
  
  // Ref dla subskrypcji
  const ownerSubscriptionRef = useRef<any>(null)
  
  // Ref dla interwału odświeżania
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)



  // Funkcja przewijania historii do końca
  const scrollToBottom = () => {
    if (historyScrollRef.current) {
      const scrollContainer = historyScrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  // Setup subskrypcji real-time dla zmian właścicieli
  const setupOwnerSubscription = () => {
    // Cleanup poprzednia subskrypcja
    if (ownerSubscriptionRef.current) {
      try {
        ownerSubscriptionRef.current.unsubscribe()
      } catch (error) {
        console.error('🧹 Błąd podczas odsubskrybowania:', error)
      }
      ownerSubscriptionRef.current = null
    }

    // Sprawdź czy user jest dostępny
    if (!user) {
      console.warn('⚠️ Brak użytkownika - pomijam konfigurację subskrypcji')
      return
    }

    console.log('🔄 Ustawiam subskrypcję na zmiany właścicieli klientów')
    
    try {
      const callback = (payload: any) => {
        console.log('📡 Real-time update otrzymany:', payload)
        
        if (payload.eventType === 'UPDATE' && payload.new) {
          const { id, owner_id, first_name, last_name } = payload.new
          
          console.log(`📡 Zmiana właściciela: ${first_name} ${last_name} (${id}) → owner_id: ${owner_id}`)
          
          // Aktualizuj stan lokalny dla konkretnego klienta
          setOwnerUpdates(prev => ({
            ...prev,
            [id]: {
              owner_id,
              timestamp: Date.now()
            }
          }))
          
          // Również zaktualizuj główną listę klientów jeśli to możliwe
          setClients(prevClients => {
            // Zabezpieczenie: sprawdź czy prevClients jest tablicą
            if (!Array.isArray(prevClients)) {
              console.warn('⚠️ prevClients nie jest tablicą w real-time callback')
              return []
            }
            
            return prevClients.map(client => 
              client.id === id 
                ? { ...client, owner_id }
                : client
            )
          })
          
          // Pokaż toast o zmianie (tylko jeśli to nie aktualny użytkownik)
          if (owner_id !== user?.id) {
            toast({
              title: "🔴 Real-time",
              description: `Klient "${first_name} ${last_name}" został przypisany do innego użytkownika`,
              duration: 4000
            })
          } else {
            toast({
              title: "🟢 Real-time", 
              description: `Przypisałeś klienta "${first_name} ${last_name}" do siebie`,
              duration: 2000
            })
          }
        }
      }
      
      // Upewnij się że callback jest funkcją
      if (typeof callback !== 'function') {
        console.error('❌ Callback nie jest funkcją')
        return
      }
      
      console.log('📡 Tworzę subskrypcję real-time...')
      
      // Sprawdź czy clientsApi ma funkcję subscribeToOwnerChanges
      if (!clientsApi.subscribeToOwnerChanges || typeof clientsApi.subscribeToOwnerChanges !== 'function') {
        console.warn('⚠️ Funkcja subscribeToOwnerChanges nie jest dostępna - pomijam subskrypcję')
        
        toast({
          title: "Informacja",
          description: "Real-time aktualizacje nie są dostępne. Dane będą odświeżane periodycznie.",
          duration: 3000
        })
        return
      }
      
      const subscription = clientsApi.subscribeToOwnerChanges(callback)
      ownerSubscriptionRef.current = subscription
      
      console.log('✅ Subskrypcja owner changes została skonfigurowana')
      
      // Sprawdź po chwili czy subskrypcja jest aktywna
      setTimeout(() => {
        try {
          if (subscription && 'state' in subscription) {
            const state = (subscription as any).state
            if (state === 'closed' || state === 'closing') {
              console.warn('⚠️ Subskrypcja real-time zamknięta - używamy tylko okresowego odświeżania')
              toast({
                title: "Informacja",
                description: "Real-time aktualizacje są niedostępne (RLS). Dane będą odświeżane co 10 sekund.",
                duration: 5000
              })
            } else if (state === 'connected' || state === 'joined') {
              console.log('✅ Subskrypcja real-time aktywna')
            }
          }
        } catch (stateError) {
          console.warn('⚠️ Nie można sprawdzić stanu subskrypcji:', stateError)
        }
      }, 3000)
      
    } catch (error) {
      console.error('❌ Błąd konfiguracji subskrypcji owner changes:', error)
      
                    // Sprawdź czy to błąd uprawnień
       const isPermissionError = error && typeof error === 'object' && 
         (('code' in error && ((error as any).code === 'PGRST116' || (error as any).code === '42501')) ||
         ('message' in error && typeof (error as any).message === 'string' && 
          ((error as any).message.includes('permission') || (error as any).message.includes('RLS'))))
      
      if (isPermissionError) {
        console.warn('⚠️ Subskrypcja real-time zablokowana przez RLS')
        toast({
          title: "Informacja",
          description: "Real-time aktualizacje zablokowane przez uprawnienia. Używaj przycisku 'Odśwież'.",
          duration: 5000
        })
      } else {
        toast({
          title: "Ostrzeżenie",
          description: "Real-time aktualizacje są niedostępne. Użyj przycisku 'Odśwież' aby zobaczyć najnowsze zmiany.",
          variant: "destructive",
          duration: 6000
        })
      }
    }
  }

  // Cleanup subskrypcji
  const cleanupSubscription = () => {
    if (ownerSubscriptionRef.current) {
      try {
        console.log('🧹 Czyszczę subskrypcję właścicieli')
        
        // Sprawdź czy obiekt ma metodę unsubscribe
        if (typeof ownerSubscriptionRef.current.unsubscribe === 'function') {
          ownerSubscriptionRef.current.unsubscribe()
          console.log('✅ Subskrypcja została odsubskrybowana')
        } else {
          console.warn('⚠️ Obiekt subskrypcji nie ma metody unsubscribe')
        }
      } catch (error) {
        console.error('❌ Błąd podczas odsubskrybowania:', error)
      } finally {
        ownerSubscriptionRef.current = null
      }
    }
  }

  // Setup okresowego odświeżania właścicieli (backup dla real-time)
  const setupPeriodicRefresh = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    console.log('⏰ Ustawiam okresowe odświeżanie właścicieli co 10 sekund')
    
    refreshIntervalRef.current = setInterval(async () => {
      if (!user || !isEditDialogOpen) return
      
      try {
        console.log('🔄 Okresowe odświeżanie właścicieli...')
        
        // Odśwież tylko właścicieli bez pełnego przeładowania
        const freshClients = await clientsApi.getClients(user)
        
        setClients(prevClients => {
          // Zabezpieczenie: sprawdź czy prevClients i freshClients są tablicami
          if (!Array.isArray(prevClients) || !Array.isArray(freshClients)) {
            console.warn('⚠️ prevClients lub freshClients nie są tablicami')
            return prevClients || []
          }
          
          // Zaktualizuj tylko dane właścicieli
          return prevClients.map(prevClient => {
            const freshClient = freshClients.find(fc => fc.id === prevClient.id)
            if (freshClient && (freshClient.owner_id !== prevClient.owner_id || !prevClient.owner)) {
              console.log(`📡 Aktualizuję właściciela dla klienta ${prevClient.first_name} ${prevClient.last_name}`)
              return {
                ...prevClient,
                owner_id: freshClient.owner_id,
                owner: freshClient.owner
              }
            }
            return prevClient
          })
        })
      } catch (error) {
        console.error('❌ Błąd okresowego odświeżania:', error)
      }
    }, 10000) // Co 10 sekund
  }

  // Cleanup interwału
  const cleanupRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      console.log('🧹 Czyszczę interwał odświeżania')
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
  }

    // Funkcja do ładowania klientów z bazy danych
  const loadClientsFromDatabase = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      console.log('🔄 Ładowanie klientów z bazy danych...')
      
      const dbClients = await clientsApi.getClients(user)
      console.log(`✅ Załadowano ${dbClients.length} klientów z bazy danych`)
      
      // Dodaj właściwości UI do danych z bazy
      const clientsWithUI = dbClients.map(client => ({
        ...client,
        isBeingEdited: false,
        editedByUser: null,
        reminder: client.reminder || {
          enabled: false,
          date: '',
          time: '',
          note: ''
        }
      }))

      // Debug: pokaż statystyki właścicieli
      const clientsWithOwners = clientsWithUI.filter(client => client.owner)
      const clientsWithoutOwners = clientsWithUI.filter(client => !client.owner && client.owner_id)
      const clientsWithoutAnyOwner = clientsWithUI.filter(client => !client.owner && !client.owner_id)
      
      console.log(`📊 Statystyki właścicieli:
        ✅ Z właścicielem: ${clientsWithOwners.length}
        ❌ Bez właściciela (błędny owner_id): ${clientsWithoutOwners.length}
        ⚪ Bez przypisania: ${clientsWithoutAnyOwner.length}
      `)

      if (clientsWithoutOwners.length > 0) {
        console.log('⚠️ Klienci z błędnymi owner_id:', clientsWithoutOwners.map(c => ({
          name: `${c.first_name} ${c.last_name}`,
          owner_id: c.owner_id
        })))
      }
      
      setClients(clientsWithUI)
      
      // Pobierz listę wszystkich użytkowników (do wyświetlania właścicieli)
      await loadAllUsers()
      
      // Pobierz listę dostępnych właścicieli na podstawie uprawnień (do filtrowania)
      await loadAvailableOwners(clientsWithUI)
      
    } catch (error) {
      console.error('❌ Błąd ładowania klientów:', error)
      
      toast({
        title: "Błąd",
        description: "Nie udało się załadować klientów z bazy danych. Sprawdź czy zostały uruchomione poprawki RLS.",
        variant: "destructive",
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

    // Funkcja do ładowania wszystkich użytkowników (do wyświetlania właścicieli)
  const loadAllUsers = async () => {
    if (!user) return

    try {
      console.log('👥 Ładuję wszystkich użytkowników...')
      const users = await authApi.getAllUsersForDisplay()
      setAllUsers(users)
      console.log('✅ Załadowano użytkowników:', users.length)
      
      if (users.length === 0) {
        console.log('⚠️ UWAGA: Brak użytkowników - sprawdź czy RLS został poprawiony')
        toast({
          title: "Informacja",
          description: "Brak dostępu do listy użytkowników. Uruchom poprawkę RLS z pliku fix_users_rls_visibility.sql",
          duration: 5000
        })
      } else if (users.length === 1 && users[0].id === user.id) {
        console.log('⚠️ RLS: Widzisz tylko siebie - uruchom poprawkę SQL')
        toast({
          title: "Ograniczenia RLS",
          description: "Widzisz tylko siebie. Uruchom fix_users_rls_visibility.sql aby pracownicy widzieli się nawzajem.",
          duration: 5000
        })
      } else {
        console.log('✅ Poprawka RLS działa - pracownicy widzą się nawzajem')
      }
    } catch (error) {
      console.error('❌ Błąd ładowania wszystkich użytkowników:', error)
      setAllUsers([])
      
      toast({
        title: "Błąd",
        description: "Nie udało się załadować użytkowników. Sprawdź RLS policies.",
        variant: "destructive"
      })
    }
  }

  // Funkcja do ładowania dostępnych właścicieli na podstawie uprawnień (tylko do filtrowania)
  const loadAvailableOwners = async (clientsList: any[]) => {
    if (!user) return

    try {
      // Dla opcji filtrowania - ograniczenia rolowe
      let filterOptions: any[] = []

      if (user.role === 'pracownik') {
        // Pracownik może filtrować tylko po sobie
        filterOptions = [{
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role
        }]
      } else {
        // Manager, szef, admin mogą filtrować po wszystkich PRACOWNIKACH
        const allUsersData = await authApi.getAllUsers()
        
        // Filtruj tylko użytkowników o roli 'pracownik'
        const employees = allUsersData.filter(user => user.role === 'pracownik')
        filterOptions = employees
      }

      setAvailableOwners(filterOptions)

    } catch (error) {
      console.error('❌ Błąd ładowania właścicieli:', error)
    }
  }

  // Funkcja filtrowania klientów
  const filterClients = () => {
    if (!clients.length) return

    let filtered = clients

    // Filtr wyszukiwania
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(client =>
        client.first_name.toLowerCase().includes(query) ||
        client.last_name.toLowerCase().includes(query) ||
        client.company_name.toLowerCase().includes(query) ||
        client.phone.includes(query) ||
        client.email.toLowerCase().includes(query)
      )
    }

    // Filtr właściciela na podstawie uprawnień
    if (ownerFilter !== 'all') {
      if (ownerFilter === 'no_owner') {
        // Klienci bez właściciela
        filtered = filtered.filter(client => !client.owner)
      } else if (ownerFilter === 'my_clients' && user) {
        // Klienci aktualnego użytkownika (dla pracowników)
        filtered = filtered.filter(client => client.owner?.id === user.id)
      } else {
        // Konkretny właściciel (dla manager+)
        filtered = filtered.filter(client => client.owner?.id === ownerFilter)
      }
    }

    // Filtr statusu
    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter)
    }

    // Zastosuj sortowanie
    const sorted = sortClients(filtered)
    setFilteredClients(sorted)

    // Zastosuj paginację
    const paginated = paginateClients(sorted)
    setPaginatedClients(paginated)
  }

  // Efekt filtrowania
  useEffect(() => {
    filterClients()
  }, [clients, searchQuery, ownerFilter, statusFilter, sortField, sortDirection, currentPage, pageSize])

  // Efekt resetowania strony przy zmianie filtrów
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, ownerFilter, statusFilter])

  // Funkcja do uzyskania opcji filtra właściciela na podstawie uprawnień
  const getOwnerFilterOptions = () => {
    const options = [{ value: 'all', label: t('clients.allOwners') }]

    if (user?.role === 'pracownik') {
      // Pracownik może filtrować tylko swoje klienty i bez właściciela
      options.push({ value: 'my_clients', label: 'Moi klienci' })
      options.push({ value: 'no_owner', label: t('clients.noOwner') })
    } else {
      // Manager, szef, admin mogą filtrować po wszystkich pracownikach
      availableOwners.forEach(owner => {
        options.push({
          value: owner.id,
          label: `${owner.full_name} (pracownik)`
        })
      })
      options.push({ value: 'no_owner', label: t('clients.noOwner') })
    }

    return options
  }

  // Funkcja testowa połączenia z bazą danych
  const testDatabaseConnection = async () => {
    try {
      const result = await clientsApi.testBasicQuery()
      alert(`Test bazy danych:\nSukces: ${!result.error}\nDane: ${result.data?.length || 0} rekordów\nBłąd: ${result.error ? JSON.stringify(result.error) : 'Brak'}`)
    } catch (error) {
      console.error('Test error:', error)
      alert(`Błąd testu: ${error}`)
    }
  }

  // Funkcja ręcznego odświeżania właścicieli
  const refreshOwners = async () => {
    if (!user) return
    
    try {
      console.log('🔄 Ręczne odświeżanie właścicieli...')
      setLoading(true)
      
      const freshClients = await clientsApi.getClients(user)
      
      // Porównaj i pokaż różnice
      let changesFound = 0
      setClients(prevClients => {
        // Zabezpieczenie: sprawdź czy obie tablice są dostępne
        if (!Array.isArray(prevClients) || !Array.isArray(freshClients)) {
          console.warn('⚠️ prevClients lub freshClients nie są tablicami w refreshOwners')
          return prevClients || []
        }
        
        return prevClients.map(prevClient => {
          const freshClient = freshClients.find(fc => fc.id === prevClient.id)
          if (freshClient && freshClient.owner_id !== prevClient.owner_id) {
            changesFound++
            console.log(`🔄 Zmiana właściciela: ${prevClient.first_name} ${prevClient.last_name} - było: ${prevClient.owner_id} → teraz: ${freshClient.owner_id}`)
            return {
              ...prevClient,
              owner_id: freshClient.owner_id,
              owner: freshClient.owner
            }
          }
          return prevClient
        })
      })
      
      toast({
        title: "Odświeżenie zakończone",
        description: `Znaleziono ${changesFound} zmian właścicieli`,
      })
      
    } catch (error) {
      console.error('❌ Błąd odświeżania właścicieli:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się odświeżyć właścicieli",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Funkcja czyszcząca nieprawidłowe owner_id
  const cleanupInvalidOwners = async () => {
    try {
      setLoading(true)
      const result = await clientsApi.cleanupInvalidOwnerIds()
      
      toast({
        title: "Czyszczenie zakończone",
        description: `Wyczyszczono ${result.cleaned} klientów z nieprawidłowymi właścicielami${result.errors.length > 0 ? `. Błędy: ${result.errors.length}` : ''}`,
        variant: result.errors.length > 0 ? "destructive" : "default"
      })

      // Przeładuj dane po czyszczeniu
      await loadClientsFromDatabase()
    } catch (error) {
      console.error('Błąd czyszczenia:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się wyczyścić danych właścicieli",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Funkcja do pobierania historii zmian
  const fetchClientHistory = async (clientId: string) => {
    setLoadingHistory(true)
    setClientHistory([])
    
    try {
      console.log('📋 Pobieranie historii klienta:', clientId)
      
      // Test dostępu do activity_logs
      const testResult = await activityLogsApi.testActivityLogsAccess()
      console.log('Test dostępu activity_logs:', testResult)
      
      if (!testResult.success) {
        console.warn('⚠️ Brak dostępu do activity_logs:', testResult.error)
        setClientHistory([])
        setHistoryLoaded(true) // Oznacz jako załadowane mimo błędu
        toast({
          title: "Informacja",
          description: "Historia zmian jest niedostępna ze względu na uprawnienia",
          duration: 3000
        })
        return
      }
      
      const history = await activityLogsApi.getClientHistory(clientId)
      setClientHistory(history)
      setHistoryLoaded(true) // Oznacz historię jako załadowaną
      
      console.log('✅ Historia załadowana:', history.length, 'wpisów')
      
      if (history.length === 0) {
        toast({
          title: "Informacja",
          description: "Brak historii zmian dla tego klienta",
          duration: 2000
        })
      }
      
    } catch (error) {
      console.error('❌ Błąd ładowania historii:', error)
      setClientHistory([])
      setHistoryLoaded(true) // Oznacz jako załadowane mimo błędu
      
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historii zmian",
        variant: "destructive",
        duration: 3000
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  // Funkcja sortowania
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Zmień kierunek sortowania jeśli to ta sama kolumna
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Nowa kolumna - domyślnie sortuj rosnąco
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset do pierwszej strony po sortowaniu
  }

  // Funkcja sortowania danych
  const sortClients = (clients: any[]) => {
    return [...clients].sort((a, b) => {
      let aValue = a[sortField]
      let bValue = b[sortField]

      // Obsługa sortowania po właścicielu
      if (sortField === 'owner') {
        aValue = a.owner?.full_name || ''
        bValue = b.owner?.full_name || ''
      }

      // Obsługa sortowania po imię + nazwisko
      if (sortField === 'name') {
        aValue = `${a.first_name} ${a.last_name}`
        bValue = `${b.first_name} ${b.last_name}`
      }

      // Konwersja na string dla porównania
      aValue = String(aValue || '').toLowerCase()
      bValue = String(bValue || '').toLowerCase()

      if (sortDirection === 'asc') {
        return aValue.localeCompare(bValue, 'pl', { numeric: true })
      } else {
        return bValue.localeCompare(aValue, 'pl', { numeric: true })
      }
    })
  }

  // Funkcja paginacji
  const paginateClients = (clients: any[]) => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginated = clients.slice(startIndex, endIndex)
    
    const total = Math.ceil(clients.length / pageSize)
    setTotalPages(total)
    
    return paginated
  }

  // Funkcja zmiany strony
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  // Funkcja zmiany rozmiaru strony
  const handlePageSizeChange = (newSize: string) => {
    setPageSize(parseInt(newSize))
    setCurrentPage(1) // Reset do pierwszej strony
  }

  // Ikona sortowania
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  // Załaduj klientów przy pierwszym renderze
  useEffect(() => {
    if (user) {
      loadClientsFromDatabase()
    }
  }, [user])

  // Setup subskrypcji real-time i okresowego odświeżania
  useEffect(() => {
    if (user) {
      setupOwnerSubscription()
      setupPeriodicRefresh()
    }
    
    // Cleanup przy unmount
    return () => {
      cleanupSubscription()
      cleanupRefreshInterval()
    }
  }, [user])

  // Cleanup subskrypcji przy zmianie komponentu
  useEffect(() => {
    return () => {
      cleanupSubscription()
      cleanupRefreshInterval()
    }
  }, [])

  // Funkcja do zapisywania zmian klienta
  const handleSave = async () => {
    if (!editingClient || !user) return
    
    // Przygotuj reminder zgodnie z constraint bazy danych
    let reminderData: { enabled: boolean; date: string; time: string; note: string } | undefined = undefined
    if (editingClient.reminder?.enabled) {
      // Walidacja - data jest wymagana
      if (!editingClient.reminder?.date) {
        toast({
          title: "Błąd walidacji",
          description: "Jeśli chcesz ustawić przypomnienie, musisz wybrać datę",
          variant: "destructive"
        })
        return
      }
      
      // Przygotuj pełny obiekt reminder z wszystkimi wymaganymi polami
      reminderData = {
        enabled: true,
        date: editingClient.reminder.date,
        time: editingClient.reminder.time || '09:00',
        note: editingClient.reminder.note || ''
      }
    }
    // Jeśli reminder nie jest enabled, pozostaje undefined
    
    setLoading(true)
    try {
      // Przygotuj tylko pola z bazy danych (bez UI properties)
      const clientData = {
        first_name: editingClient.first_name,
        last_name: editingClient.last_name,
        company_name: editingClient.company_name,
        nip: editingClient.nip,
        phone: editingClient.phone,
        email: editingClient.email,
        notes: editingClient.notes,
        website: editingClient.website,
        status: editingClient.status,
        reminder: reminderData, // Użyj przygotowanych danych reminder
      }
      
      console.log('💾 Zapisywanie zmian klienta...')
      const updatedClient = await clientsApi.updateClient(editingClient.id, clientData, user)
      
      // Pokaż sukces natychmiast
      toast({
        title: "✅ Sukces",
        description: `Klient został zaktualizowany i przypisany do Ciebie jako właściciel`,
        duration: 4000
      })
      
      // Zamknij popup natychmiast po zapisaniu
      setIsEditDialogOpen(false)
      setEditingClient(null)
      setClientHistory([])
      setHistoryLoaded(false)
      
      // Odśwież listę klientów w tle
      await loadClientsFromDatabase()
      
      console.log('✅ Zmiany zapisane pomyślnie')
      
    } catch (error) {
      console.error('❌ Błąd zapisywania klienta:', error)
      
      // Lepsze wyświetlanie błędu
      let errorMessage = 'Nie udało się zapisać zmian klienta'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "❌ Błąd",
        description: errorMessage,
        variant: "destructive",
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditDialogOpen(false)
    setEditingClient(null)
    setClientHistory([])
    setHistoryLoaded(false) // Resetuj stan historii
  }

  const handleAddClient = () => {
    setNewClient({ ...emptyClient })
    setIsAddDialogOpen(true)
  }

  const handleSaveNewClient = async () => {
    if (!user) return
    
    // Przygotuj reminder zgodnie z constraint bazy danych
    let reminderData: { enabled: boolean; date: string; time: string; note: string } | undefined = undefined
    if (newClient.reminder?.enabled) {
      // Walidacja - data jest wymagana
      if (!newClient.reminder?.date) {
        toast({
          title: "Błąd walidacji",
          description: "Jeśli chcesz ustawić przypomnienie, musisz wybrać datę",
          variant: "destructive"
        })
        return
      }
      
      // Przygotuj pełny obiekt reminder z wszystkimi wymaganymi polami
      reminderData = {
        enabled: true,
        date: newClient.reminder.date,
        time: newClient.reminder.time || '09:00',
        note: newClient.reminder.note || ''
      }
    }
    // Jeśli reminder nie jest enabled, pozostaje undefined
    
    setSavingNewClient(true)
    try {
      // Przygotuj dane klienta (bez pól UI)
      const clientData = {
        first_name: newClient.first_name,
        last_name: newClient.last_name,
        company_name: newClient.company_name,
        nip: newClient.nip,
        phone: newClient.phone,
        email: newClient.email,
        notes: newClient.notes,
        website: newClient.website,
        status: newClient.status,
        reminder: reminderData, // Użyj przygotowanych danych reminder
        edited_by: user.id,
        edited_at: new Date().toISOString(),
        owner_id: user.id
      }
      
      const savedClient = await clientsApi.createClient(clientData, user)
      
      toast({
        title: "Sukces",
        description: "Nowy klient został dodany"
      })
      
      // Wyczyść formularz i zamknij dialog
      setNewClient(emptyClient)
      setIsAddDialogOpen(false)
      
      // Odśwież listę klientów
      await loadClientsFromDatabase()
      
    } catch (error) {
      console.error('❌ Błąd podczas dodawania klienta:', error)
      
      let errorMessage = 'Nie udało się dodać klienta'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSavingNewClient(false)
    }
  }

  const handleCancelAdd = () => {
    setNewClient(emptyClient)
    setIsAddDialogOpen(false)
  }

  const handleDelete = async (clientId: string) => {
    if (!user) return
    
    if (!confirm('Czy na pewno chcesz usunąć tego klienta? Ta operacja jest nieodwracalna.')) {
      return
    }
    
    try {
      await clientsApi.deleteClient(clientId, user)
      
      toast({
        title: "Sukces",
        description: "Klient został usunięty"
      })
      
      // Odśwież listę klientów
      await loadClientsFromDatabase()
      
    } catch (error) {
      console.error('❌ Błąd podczas usuwania klienta:', error)
      
      toast({
        title: "Błąd",
        description: "Nie udało się usunąć klienta",
        variant: "destructive"
      })
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setEditingClient((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleReminderChange = (field: string, value: string | boolean) => {
    setEditingClient((prev: any) => ({
      ...prev,
      reminder: {
        ...prev?.reminder,
        [field]: value
      }
    }))
  }

  const handleNewClientInputChange = (field: string, value: string) => {
    setNewClient((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNewClientReminderChange = (field: string, value: string | boolean) => {
    setNewClient((prev: any) => ({
      ...prev,
      reminder: {
        ...prev.reminder,
        [field]: value
      }
    }))
  }

  const handleUploadFiles = () => {
    setIsUploadDialogOpen(true)
    setSelectedFile(null)
    setDragActive(false)
    setIsUploading(false)
  }

  const handleCancelUpload = () => {
    setIsUploadDialogOpen(false)
    setSelectedFile(null)
    setDragActive(false)
    setIsUploading(false)
    setUploadProgress({ current: 0, total: 100, status: '' })
    setImportResults(null)
    setColumnAnalysis(null)
  }

  // Obsługa wyboru pliku
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setColumnAnalysis(null) // Reset analiza
        
        try {
          // Szybka analiza nagłówków
          const text = await file.text()
          const { headers } = csvImportApi.parseCSV(text)
          const mapping = csvImportApi.mapHeaders(headers)
          const analysis = csvImportApi.analyzeColumns(mapping, headers)
          
          setColumnAnalysis(analysis)
          
          toast({
            title: "Plik wybrany",
            description: `${file.name} - ${analysis.found.length} kolumn znalezionych`,
          })
        } catch (error) {
          console.error('Błąd analizy pliku:', error)
          toast({
            title: "Plik wybrany",
            description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          })
        }
      } else {
        toast({
          title: "Nieprawidłowy format pliku",
          description: "Proszę wybrać plik CSV (.csv)",
          variant: "destructive"
        })
      }
    }
  }

  // Obsługa drag & drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file)
        setColumnAnalysis(null) // Reset analiza
        
        try {
          // Szybka analiza nagłówków
          const text = await file.text()
          const { headers } = csvImportApi.parseCSV(text)
          const mapping = csvImportApi.mapHeaders(headers)
          const analysis = csvImportApi.analyzeColumns(mapping, headers)
          
          setColumnAnalysis(analysis)
          
          toast({
            title: "Plik upuszczony",
            description: `${file.name} - ${analysis.found.length} kolumn znalezionych`,
          })
        } catch (error) {
          console.error('Błąd analizy pliku:', error)
          toast({
            title: "Plik upuszczony",
            description: `${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
          })
        }
      } else {
        toast({
          title: "Nieprawidłowy format pliku",
          description: "Proszę wybrać plik CSV (.csv)",
          variant: "destructive"
        })
      }
    }
  }

  const handleFileUpload = async () => {
    if (!selectedFile || !user) {
      toast({
        title: "Błąd",
        description: "Nie wybrano pliku lub brak zalogowanego użytkownika",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setImportResults(null)
    
    try {
      // Import CSV z progress callback
      const results = await csvImportApi.importCSV(
        selectedFile, 
        user, 
        (progress) => {
          setUploadProgress(progress)
        }
      )
      
      // Pokaż rezultaty
      setImportResults(results)
      
      // Toast z rezultatami
      const successMessage = `Zaimportowano ${results.success} klientów`
      const errorMessage = results.errors.length > 0 ? `, ${results.errors.length} błędów` : ''
      
      toast({
        title: results.errors.length === 0 ? "Sukces!" : "Import zakończony z błędami",
        description: successMessage + errorMessage,
        variant: results.errors.length === 0 ? "default" : "destructive"
      })
      
      // Odśwież listę klientów jeśli były sukcesy
      if (results.success > 0) {
        await loadClientsFromDatabase()
      }
      
    } catch (error) {
      console.error('❌ Błąd import CSV:', error)
      toast({
        title: "Błąd importu",
        description: error instanceof Error ? error.message : "Nieznany błąd importu",
        variant: "destructive"
      })
      setUploadProgress({ current: 0, total: 100, status: 'Błąd importu' })
    } finally {
      setIsUploading(false)
    }
  }

  // Funkcja do formatowania daty przypomnienia
  const formatReminderDate = (reminder: any) => {
    if (!reminder || !reminder.enabled || !reminder.date) return null
    const date = new Date(reminder.date + 'T' + reminder.time)
    return date.toLocaleDateString('pl-PL') + ' ' + reminder.time
  }

  // Funkcja do resetowania filtrów
  const resetFilters = () => {
    setSearchQuery('')
    setOwnerFilter('all')
    setStatusFilter('all')
  }

  // Funkcja do obsługi kliknięcia w telefon
  const handlePhoneClick = async (client: any) => {
    if (!user) return
    
    try {
      // Zaktualizuj czas ostatniego kliknięcia telefonu
      await clientsApi.updateLastPhoneClick(client.id, user)
      
      console.log(`📞 Zarejestrowano kliknięcie telefonu dla klienta: ${client.first_name} ${client.last_name}`)
      
      // Pokaż popup z detalami klienta
      setSelectedClientForDetails(client)
      setIsDetailsPopupOpen(true)
      
    } catch (error) {
      console.error('❌ Błąd rejestrowania kliknięcia telefonu:', error)
      
      // Nawet jeśli rejestracja się nie powiodła, pokaż popup
      setSelectedClientForDetails(client)
      setIsDetailsPopupOpen(true)
      
      toast({
        title: "Ostrzeżenie",
        description: "Nie udało się zarejestrować kliknięcia telefonu",
        variant: "destructive",
        duration: 3000
      })
    }
  }

  // Funkcja do zamknięcia popup
  const handleCloseDetailsPopup = () => {
    setIsDetailsPopupOpen(false)
    setSelectedClientForDetails(null)
  }

  // Funkcja do obsługi aktualizacji klienta z popup
  const handleClientUpdateFromPopup = (updatedClient: any) => {
    // Aktualizuj klienta w lokalnym stanie
    setClients(prevClients => 
      prevClients.map(client => 
        client.id === updatedClient.id ? updatedClient : client
      )
    )
    
    // Aktualizuj wybranego klienta jeśli to ten sam
    if (selectedClientForDetails?.id === updatedClient.id) {
      setSelectedClientForDetails(updatedClient)
    }
  }

  // Sprawdź czy jakiekolwiek filtry są aktywne
  const hasActiveFilters = searchQuery.trim() !== '' || ownerFilter !== 'all' || statusFilter !== 'all'

  // Funkcja do pobierania aktualnego właściciela klienta
  const getCurrentOwner = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          owner_id,
          owner:users!owner_id (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .eq('id', clientId)
        .single()
      
      if (error) throw error
      
      // Supabase JOIN może zwrócić tablicę lub null - obsłuż oba przypadki
      if (data?.owner) {
        // Jeśli owner jest tablicą, weź pierwszy element
        const owner = Array.isArray(data.owner) ? data.owner[0] : data.owner
        return owner || null
      }
      
      return null
    } catch (error) {
      console.error('Błąd pobierania właściciela:', error)
      return null
    }
  }

  // Funkcja do formatowania daty dla historii
  const formatHistoryDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString('pl-PL'),
      time: date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    }
  }

  // Funkcja do mapowania ról na kolory badge
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400'
      case 'szef': return 'bg-purple-500/20 text-purple-400'
      case 'manager': return 'bg-blue-500/20 text-blue-400'
      case 'pracownik': return 'bg-green-500/20 text-green-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  // Funkcja do uzyskania właściwości badge'a statusu
  const getStatusBadgeProps = (client: any) => {
    return {
      className: `text-xs ${statusColors[client.status as keyof typeof statusColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`,
      title: client.status,
      text: client.status
    }
  }

  const handleEdit = async (client: any) => {
    // Sprawdź uprawnienia przed edycją
    if (!user || !permissionsApi.canEdit(client, user)) {
      alert('Nie masz uprawnień do edycji tego klienta')
      return
    }
    
    try {
      console.log(`📝 Otwieranie edycji klienta ${client.id} przez użytkownika ${user.id}`)
      
      // Ustaw klienta w edytorze z domyślnym obiektem reminder (bez przypisywania owner_id)
      setEditingClient({
        ...client,
        reminder: client.reminder || {
          enabled: false,
          date: '',
          time: '',
          note: ''
        }
      })
      setIsEditDialogOpen(true)
      
      // Resetuj stan historii - historia ładuje się na żądanie
      setClientHistory([])
      setHistoryLoaded(false)
      
    } catch (error) {
      console.error('❌ Błąd otwierania edycji klienta:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się otworzyć edycji klienta",
        variant: "destructive"
      })
    }
  }

  // Funkcja do obliczania koloru tła wiersza na podstawie statusu i dat
  const getRowBackgroundColor = (client: any) => {
    const now = new Date()
    
    // Sprawdź czy klient ma status "canvas" ze zmienionym statusem na "antysale"
    if (client.status === 'antysale' && client.status_changed_at) {
      const statusChangedAt = new Date(client.status_changed_at)
      const daysSinceStatusChange = (now.getTime() - statusChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      
      // Jeśli status był zmieniony automatycznie z canvas na antysale (po 2 dniach)
      if (daysSinceStatusChange >= 2) {
        return "bg-yellow-100 dark:bg-yellow-900/20" // Lekko żółty
      }
    }
    
    // Sprawdź ostrzeżenia o braku kontaktu (tylko dla klientów canvas)
    if (client.status === 'canvas' && client.status_changed_at) {
      const statusChangedAt = new Date(client.status_changed_at)
      const daysSinceStatusChange = (now.getTime() - statusChangedAt.getTime()) / (1000 * 60 * 60 * 24)
      const lastPhoneClick = client.last_phone_click ? new Date(client.last_phone_click) : null
      
      // Sprawdź czy był kontakt przez telefon od zmiany statusu
      const hasContactSinceStatusChange = lastPhoneClick && lastPhoneClick > statusChangedAt
      
      if (!hasContactSinceStatusChange) {
        // Brak kontaktu od zmiany statusu na canvas
        if (daysSinceStatusChange >= 5) {
          return "bg-red-200 dark:bg-red-900/30" // Czerwony - dzień 5+
        } else if (daysSinceStatusChange >= 4) {
          return "bg-orange-200 dark:bg-orange-900/30" // Pomarańczowy - dzień 4
        } else if (daysSinceStatusChange >= 2) {
          return "bg-yellow-200 dark:bg-yellow-900/30" // Żółty - dni 2-3
        }
      }
    }
    
    return "hover:bg-slate-700/50" // Domyślny kolor hover
  }

  // Funkcja do sprawdzania czy klient nie ma właściciela
  const hasNoOwner = (client: any) => {
    return !client.owner_id || client.owner_id === null
  }

  // 🔄 ADMIN: Resetuj właścicieli wszystkich klientów
  const handleResetAllOwners = async () => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Błąd uprawnień",
        description: "Tylko administrator może resetować właścicieli klientów.",
        variant: "destructive"
      })
      return
    }

    // Pokaż dialog potwierdzenia
    const confirmed = window.confirm(
      '🚨 UWAGA: Czy na pewno chcesz zresetować właścicieli WSZYSTKICH klientów?\n\n' +
      'Ta operacja:\n' +
      '• Usunie przypisanie właściciela ze wszystkich klientów\n' +
      '• Jest nieodwracalna\n' +
      '• Może wpłynąć na pracę zespołu\n\n' +
      'Kliknij OK aby kontynuować lub Anuluj aby przerwać.'
    )

    if (!confirmed) {
      return
    }

    try {
      setLoading(true)
      console.log('🔄 Admin resetuje właścicieli wszystkich klientów...')
      
      const result = await reportsApi.resetAllClientOwners(user)
      
      // Pokaż sukces
      toast({
        title: "✅ Sukces!",
        description: result.message,
        duration: 8000
      })

      // Odśwież listę klientów
      await loadClientsFromDatabase()
      
      console.log(`✅ Admin zresetował właścicieli dla ${result.success} klientów`)

    } catch (error: any) {
      console.error('❌ Błąd resetowania właścicieli:', error)
      toast({
        title: "❌ Błąd",
        description: error.message || "Nie udało się zresetować właścicieli klientów",
        variant: "destructive",
        duration: 8000
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full">
      {/* Header - pełna szerokość */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder={t('clients.searchClients')} 
              className="w-64 bg-slate-800 border-slate-700 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Filtr właściciela */}
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder={t('clients.filterByOwner')} />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {getOwnerFilterOptions().map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value}
                  className="text-white hover:bg-slate-600"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtr statusu */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtruj po statusie" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem 
                value="all"
                className="text-white hover:bg-slate-600"
              >
                Wszystkie statusy
              </SelectItem>
              {statusOptions.map((status) => (
                <SelectItem 
                  key={status} 
                  value={status}
                  className="text-white hover:bg-slate-600"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusColors[status].includes('blue') ? 'bg-blue-400' : 
                      statusColors[status].includes('gray') ? 'bg-gray-400' :
                      statusColors[status].includes('red') && statusColors[status].includes('red-600') ? 'bg-red-300' :
                      statusColors[status].includes('red') ? 'bg-red-400' :
                      statusColors[status].includes('orange') ? 'bg-orange-400' :
                      statusColors[status].includes('green') ? 'bg-green-400' :
                      statusColors[status].includes('yellow') ? 'bg-yellow-400' : 'bg-slate-400'}`}></div>
                    <span>{status}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Reset filtrów */}
          {(searchQuery || ownerFilter !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-2" />
              {t('clients.resetFilters')}
            </Button>
          )}
          
          {/* Przycisk "Wgraj plik" tylko dla manager, szef i admin */}
          {user?.role && ['manager', 'szef', 'admin'].includes(user.role) && (
            <Button 
              onClick={handleUploadFiles}
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Wgraj plik
            </Button>
          )}

          {/* Przycisk "Resetuj właścicieli" TYLKO dla admin */}
          {user?.role === 'admin' && (
            <Button 
              onClick={handleResetAllOwners}
              variant="outline" 
              className="border-red-600 text-red-400 hover:bg-red-500/20"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resetuj właścicieli
            </Button>
          )}

          <Button 
            onClick={handleAddClient}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj klienta
          </Button>
        </div>
      </div>

      {/* Tabela klientów - pełna szerokość */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Tabela klientów</CardTitle>
              <p className="text-slate-400 text-sm">
                {filteredClients.length} klientów • 
                {filteredClients.filter(c => c.status === 'sale').length} w sprzedaży • 
                {filteredClients.filter(c => c.status === 'canvas').length} w canvass
                {totalPages > 1 && (
                  <span className="text-cyan-400"> • strona {currentPage} z {totalPages}</span>
                )}
                {searchQuery || ownerFilter !== 'all' || statusFilter !== 'all' ? (
                  <span className="text-cyan-400"> • filtrowane z {clients.length} ogółem</span>
                ) : null}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={refreshOwners}
                variant="outline"
                className="border-cyan-600 text-cyan-400 hover:bg-cyan-500/20"
                disabled={loading}
                title="Odśwież właścicieli klientów"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Odśwież
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <span className="ml-2 text-slate-400">Ładowanie klientów...</span>
            </div>
          ) : (
            <div className="relative">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        {t('clients.firstName')} / {t('clients.lastName')}
                        {getSortIcon('name')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button
                        onClick={() => handleSort('company_name')}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        {t('clients.company')}
                        {getSortIcon('company_name')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">Kontakt</TableHead>
                    <TableHead className="text-slate-400">
                      <button
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        Status
                        {getSortIcon('status')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">
                      <button
                        onClick={() => handleSort('owner')}
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        Właściciel
                        {getSortIcon('owner')}
                      </button>
                    </TableHead>
                    <TableHead className="text-slate-400">Notatka</TableHead>
                    <TableHead className="text-slate-400">Przypomnienie</TableHead>
                    <TableHead className="text-slate-400">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                        Brak klientów do wyświetlenia
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClients.map((client) => (
                                              <TableRow key={client.id} className={`border-slate-700 ${getRowBackgroundColor(client)}`}>
                        <TableCell>
                          <div className="text-sm text-white flex items-center gap-2">
                            {client.first_name} {client.last_name}
                            {hasNoOwner(client) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-orange-400" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Klient nie ma przypisanego właściciela</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-white">{client.company_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <button
                              onClick={() => handlePhoneClick(client)}
                              className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors cursor-pointer hover:underline"
                            >
                              {client.phone}
                            </button>
                            <div className="text-sm text-slate-400">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const badgeProps = getStatusBadgeProps(client)
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge className={badgeProps.className}>
                                      {badgeProps.text}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>{badgeProps.title}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })()}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            {(() => {
                              // Używaj real-time aktualizacji jeśli dostępne
                              const ownerUpdate = ownerUpdates[client.id]
                              const effectiveOwnerId = ownerUpdate?.owner_id ?? client.owner_id
                              
                              // Inteligentne dopasowanie właściciela - PREFERUJ DANE Z JOIN-A
                              let effectiveOwner = null
                              
                              // PRIORYTET 1: Dane z JOIN-a (najbardziej aktualne i niezależne od RLS)
                              if (client.owner) {
                                console.log(`✅ Używam właściciela z JOIN: ${client.owner.full_name} dla klienta ${client.first_name} ${client.last_name}`)
                                effectiveOwner = client.owner
                              }
                              // PRIORYTET 2: Real-time update ze zmianą owner_id
                              else if (effectiveOwnerId && effectiveOwnerId !== client.owner_id) {
                                console.log(`🔍 Real-time zmiana właściciela ${effectiveOwnerId} dla klienta ${client.first_name} ${client.last_name}`)
                                
                                // Szukaj w allUsers
                                if (Array.isArray(allUsers) && allUsers.length > 0) {
                                  effectiveOwner = allUsers.find(owner => owner.id === effectiveOwnerId)
                                  if (effectiveOwner) {
                                    console.log(`✅ Znaleziono w allUsers: ${effectiveOwner.full_name}`)
                                  }
                                }
                                
                                // Fallback - aktualny użytkownik
                                if (!effectiveOwner && effectiveOwnerId === user?.id && user) {
                                  console.log(`🔄 Fallback: używam danych aktualnego użytkownika`)
                                  effectiveOwner = {
                                    id: user.id,
                                    full_name: user.full_name,
                                    email: user.email,
                                    avatar_url: user.avatar_url,
                                    role: user.role
                                  }
                                }
                              }
                              // PRIORYTET 3: Szukanie w allUsers na podstawie owner_id (gdy brak JOIN-a)
                              else if (effectiveOwnerId && !client.owner) {
                                console.log(`🔍 Brak JOIN - szukam ${effectiveOwnerId} w allUsers`)
                                
                                if (Array.isArray(allUsers) && allUsers.length > 0) {
                                  effectiveOwner = allUsers.find(owner => owner.id === effectiveOwnerId)
                                  if (effectiveOwner) {
                                    console.log(`✅ Znaleziono w allUsers (bez JOIN): ${effectiveOwner.full_name}`)
                                  } else {
                                    console.log(`❌ Nie znaleziono ${effectiveOwnerId} w allUsers - może RLS blokuje`)
                                  }
                                } else {
                                  console.log(`⚠️ allUsers puste/niedostępne - prawdopodobnie RLS`)
                                }
                                
                                // Fallback - aktualny użytkownik
                                if (!effectiveOwner && effectiveOwnerId === user?.id && user) {
                                  console.log(`🔄 Fallback: używam danych aktualnego użytkownika`)
                                  effectiveOwner = {
                                    id: user.id,
                                    full_name: user.full_name,
                                    email: user.email,
                                    avatar_url: user.avatar_url,
                                    role: user.role
                                  }
                                }
                              }
                              
                              return effectiveOwner ? (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="relative">
                                      <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-cyan-400/50 transition-all">
                                        <AvatarImage 
                                          src={getAvatarUrl(effectiveOwner.avatar_url) || '/placeholder-user.jpg'} 
                                          alt={effectiveOwner.full_name}
                                          className="object-cover"
                                        />
                                        <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                          {effectiveOwner.full_name
                                            ?.split(' ')
                                            .map((name: string) => name[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2) || '?'}
                                        </AvatarFallback>
                                      </Avatar>
                                      {/* Wskaźnik real-time update */}
                                      {ownerUpdate && Date.now() - ownerUpdate.timestamp < 5000 && (
                                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-pulse border-2 border-slate-800"></div>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <div className="font-medium">{effectiveOwner.full_name}</div>
                                      <div className="text-slate-400">{effectiveOwner.email}</div>
                                      <div className="text-xs text-slate-500 mt-1">Rola: {effectiveOwner.role}</div>
                                      {effectiveOwner.id === user?.id && (
                                        <div className="text-xs text-cyan-400 mt-1">🎯 Edytujesz tego klienta</div>
                                      )}
                                      {ownerUpdate && (
                                        <div className="text-xs text-cyan-400 mt-1">📡 Zaktualizowano na żywo</div>
                                      )}
                                      {/* Informacja o ostatnim edytorze */}
                                      {client.last_edited_by_name && (
                                        <div className="border-t border-slate-600 pt-2 mt-2">
                                          <div className="text-xs text-slate-500">Ostatnio edytowany przez:</div>
                                          <div className="text-xs text-slate-300 font-medium">{client.last_edited_by_name}</div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-8 w-8 cursor-pointer">
                                        <AvatarFallback className={effectiveOwnerId ? "bg-red-600 text-red-200 text-xs" : "bg-slate-600 text-slate-400 text-xs"}>
                                          {effectiveOwnerId ? "!" : "?"}
                                        </AvatarFallback>
                                      </Avatar>
                                      {effectiveOwnerId && (
                                        <span className="text-xs text-orange-400">Niewidoczny</span>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      {effectiveOwnerId ? (
                                        <>
                                          <div className="text-orange-400 font-medium">⚠️ Właściciel niewidoczny</div>
                                          <div className="text-slate-400">Właściciel istnieje ale nie masz dostępu</div>
                                          <div className="text-xs text-slate-500 mt-1">ID: {effectiveOwnerId}</div>
                                          <div className="text-xs text-slate-500 mt-1">Dostępnych użytkowników: {allUsers.length}</div>
                                          {allUsers.length <= 1 ? (
                                            <div className="text-xs text-blue-400 mt-1">🔒 Ograniczenie RLS - widzisz tylko siebie</div>
                                          ) : (
                                            <div className="text-xs text-blue-400 mt-1">💡 Kliknij "Odśwież" aby zaktualizować</div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="text-slate-400">Klient nie ma przypisanego właściciela</div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })()}
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-300 max-w-[200px] truncate">
                            {client.notes || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-300">
                            {formatReminderDate(client.reminder) || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(client)}
                              className="h-8 w-8 p-0 border-slate-600 hover:bg-slate-700"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(client.id)}
                              className="h-8 w-8 p-0 border-red-600 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginacja */}
      {filteredClients.length > 0 && (
        <div className="bg-slate-800 border-slate-700 rounded-lg border mt-4 p-4">
          <div className="flex items-center justify-between">
            {/* Informacje o stronach */}
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>
                Wyświetlanych {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredClients.length)} z {filteredClients.length} klientów
              </span>
              
              {/* Wybór ilości na stronę */}
              <div className="flex items-center gap-2">
                <span>Pokaż:</span>
                <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Nawigacja stronami */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Numery stron */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog do edycji klienta */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b border-slate-600 pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white flex items-center gap-3">
                <Edit className="h-5 w-5 text-cyan-400" />
                <div>
                  <span className="text-xl font-semibold">
                    {editingClient?.first_name} {editingClient?.last_name}
                  </span>
                  <div className="text-sm text-slate-400 font-normal">
                    {editingClient?.company_name}
                  </div>
                </div>
              </DialogTitle>
              
              {/* Status badge w nagłówku */}
              {editingClient?.status && (
                <Badge className={`${statusColors[editingClient.status as keyof typeof statusColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'} text-sm`}>
                  {editingClient.status}
                </Badge>
              )}
            </div>
            
            {/* Tylko ostrzeżenie o konflikcie edycji */}
            {editingClient?.owner && editingClient.owner.id !== user?.id && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-400">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Obecnie edytowany przez: {editingClient.owner.full_name}
                  </span>
                  <Badge className="text-xs bg-yellow-500/20 text-yellow-400">
                    {editingClient.owner.role}
                  </Badge>
                </div>
                <p className="text-xs text-yellow-300 mt-1">
                  ⚠️ Ten klient jest obecnie przypisany do innego użytkownika. Twoje zmiany mogą konfliktować z jego edycją.
                </p>
              </div>
            )}
          </DialogHeader>
          
          {editingClient && (
            <div className="flex-1 overflow-y-auto py-4 px-1 custom-scrollbar">
              <div className="pr-3">
                <div className="grid grid-cols-3 gap-6">
                  {/* Kolumna 1: Dane klienta */}
                  <div className="space-y-6">
                    {/* Dane osobowe */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Dane osobowe
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name" className="text-slate-300">Imię</Label>
                          <Input
                            id="first_name"
                            value={editingClient.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="last_name" className="text-slate-300">Nazwisko</Label>
                          <Input
                            id="last_name"
                            value={editingClient.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dane firmowe */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Dane firmowe
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="company_name" className="text-slate-300">Nazwa firmy</Label>
                          <Input
                            id="company_name"
                            value={editingClient.company_name}
                            onChange={(e) => handleInputChange('company_name', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="nip" className="text-slate-300">NIP</Label>
                          <Input
                            id="nip"
                            value={editingClient.nip}
                            onChange={(e) => handleInputChange('nip', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    

                    {/* Status */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Status klienta
                      </h3>
                      
                      <div className="space-y-2">
                        <Label htmlFor="status" className="text-slate-300">Aktualny status</Label>
                        <Select 
                          value={editingClient.status} 
                          onValueChange={(value) => handleInputChange('status', value)}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status} className="text-white hover:bg-slate-600">
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Kolumna 2: Notatki i przypomnienia */}
                  <div className="space-y-4">
{/* Kontakt */}
<div className="space-y-4">
                      <h3 className="font-semibold text-slate-300 border-b border-slate-600 pb-2 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Kontakt
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-slate-300">Telefon</Label>
                          <Input
                            id="phone"
                            value={editingClient.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-slate-300">Email</Label>
                          <Input
                            id="email"
                            value={editingClient.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="website" className="text-slate-300">Strona WWW</Label>
                          <Input
                            id="website"
                            value={editingClient.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                            placeholder="www.firma.pl"
                          />
                        </div>
                      </div>
                    </div>


                    <h3 className="font-semibold text-slate-300 border-b border-slate-600 pb-2">Notatki i przypomnienia</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-slate-300">Notatka</Label>
                      <Textarea
                        id="notes"
                        value={editingClient.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white min-h-[150px]"
                        placeholder="Dodaj notatki o kliencie..."
                      />
                    </div>

                    {/* Sekcja przypomnienia */}
                    <div className="space-y-4 border-t border-slate-600 pt-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="reminderEnabled"
                          checked={editingClient?.reminder?.enabled || false}
                          onCheckedChange={(checked) => handleReminderChange('enabled', checked)}
                          className="border-slate-600"
                        />
                        <Label htmlFor="reminderEnabled" className="text-slate-300 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Ustaw przypomnienie
                        </Label>
                      </div>

                      {editingClient?.reminder?.enabled && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          <div className="space-y-2">
                            <Label htmlFor="reminderDate" className="text-slate-300">Data</Label>
                            <Input
                              id="reminderDate"
                              type="date"
                              value={editingClient?.reminder?.date || ''}
                              onChange={(e) => handleReminderChange('date', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="reminderTime" className="text-slate-300">Godzina</Label>
                            <Input
                              id="reminderTime"
                              type="time"
                              value={editingClient?.reminder?.time || ''}
                              onChange={(e) => handleReminderChange('time', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                            />
                          </div>
                          
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="reminderNote" className="text-slate-300">Notatka przypomnienia</Label>
                            <Input
                              id="reminderNote"
                              value={editingClient?.reminder?.note || ''}
                              onChange={(e) => handleReminderChange('note', e.target.value)}
                              className="bg-slate-700 border-slate-600 text-white"
                              placeholder="O czym przypomnieć?"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kolumna 3: Historia zmian */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-600 pb-2">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-300">Historia zmian</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {clientHistory.length > 3 && (
                          <div className="text-xs text-slate-400 flex items-center gap-1">
                            <span>{clientHistory.length} wpisów</span>
                            <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                            <span>przewijaj</span>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => editingClient && fetchClientHistory(editingClient.id)}
                          disabled={loadingHistory}
                          className="h-6 text-xs border-slate-600 hover:bg-slate-700"
                          title={historyLoaded ? "Odśwież historię" : "Załaduj historię zmian"}
                        >
                          {loadingHistory ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-1" />
                              {historyLoaded ? "Odśwież" : "Załaduj"}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="relative scroll-fade-bottom" data-scrollable={clientHistory.length > 3}>
                      <ScrollArea ref={historyScrollRef} className="h-[400px] w-full rounded-md border border-slate-700 bg-slate-800/50 custom-scrollbar scroll-smooth">
                        <div className="p-4">
                          {loadingHistory ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                              <span className="ml-2 text-slate-400">Ładowanie historii...</span>
                            </div>
                          ) : !historyLoaded ? (
                            <div className="text-center py-8 text-slate-400">
                              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="mb-2">Historia nie została jeszcze załadowana</p>
                              <p className="text-xs text-slate-500">Kliknij przycisk odświeżania aby ją pobrać</p>
                            </div>
                          ) : clientHistory.length > 0 ? (
                            <div className="space-y-3">
                              {clientHistory.map((entry, index) => {
                                const { date, time } = formatHistoryDate(entry.timestamp)
                                return (
                                  <div key={entry.id} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 relative">
                                    {index === 0 && (
                                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                                    )}
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarImage 
                                            src={getAvatarUrl(entry.editor_avatar) || '/placeholder-user.jpg'} 
                                            alt={entry.editor_name}
                                            className="object-cover"
                                          />
                                          <AvatarFallback className="bg-slate-600 text-slate-300 text-xs">
                                            {entry.editor_name
                                              ?.split(' ')
                                              .map((name: string) => name[0])
                                              .join('')
                                              .toUpperCase()
                                              .slice(0, 2) || '?'}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-white">
                                          {entry.editor_name}
                                        </span>
                                        <Badge className={`text-xs ${getRoleColor(entry.editor_role || 'unknown')}`}>
                                          {entry.editor_role}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="text-xs text-slate-400 mb-2">
                                      {date} • {time}
                                    </div>
                                    
                                    {entry.field_changed === 'status' && entry.new_value && (
                                      <div className="text-sm">
                                        <span className="text-slate-400">Status:</span>
                                        <Badge className={`ml-2 text-xs ${statusColors[entry.new_value as keyof typeof statusColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                                          {entry.new_value}
                                        </Badge>
                                      </div>
                                    )}
                                    
                                    {entry.field_changed !== 'status' && (
                                      <div className="text-sm text-slate-300">
                                        <span className="text-slate-400">{entry.field_changed}:</span>
                                        <span className="ml-1">{entry.new_value || 'Brak wartości'}</span>
                                      </div>
                                    )}
                                    
                                    <div className="text-xs text-slate-500 mt-1">
                                      {entry.change_type === 'create' && 'Utworzono'}
                                      {entry.change_type === 'update' && 'Zaktualizowano'}
                                      {entry.change_type === 'delete' && 'Usunięto'}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-400">
                              <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>Brak historii zmian</p>
                              <p className="text-xs text-slate-500 mt-1">Ten klient nie ma zapisanych zmian</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                      
                      {/* Wskaźnik przewijania na dole - klikalny */}
                      {clientHistory.length > 3 && (
                        <button
                          onClick={scrollToBottom}
                          className="absolute bottom-2 right-2 bg-slate-900/90 hover:bg-slate-800/90 rounded-full px-2 py-1 text-xs text-slate-400 hover:text-slate-300 transition-colors cursor-pointer border border-slate-600 hover:border-slate-500"
                          title="Przewiń do końca"
                        >
                          ↓ {clientHistory.length - 3}+ więcej
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-600 flex-shrink-0">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleSave}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              Zapisz zmiany
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do dodawania nowego klienta */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 border-b border-slate-600 pb-4">
            <DialogTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Dodaj nowego klienta
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 px-1 custom-scrollbar">
            <div className="pr-3">
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newFirst_name" className="text-slate-300">Imię *</Label>
                  <Input
                    id="newFirst_name"
                    value={newClient.first_name}
                    onChange={(e) => handleNewClientInputChange('first_name', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Wprowadź imię"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newLast_name" className="text-slate-300">Nazwisko *</Label>
                  <Input
                    id="newLast_name"
                    value={newClient.last_name}
                    onChange={(e) => handleNewClientInputChange('last_name', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Wprowadź nazwisko"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newCompany_name" className="text-slate-300">Firma *</Label>
                  <Input
                    id="newCompany_name"
                    value={newClient.company_name}
                    onChange={(e) => handleNewClientInputChange('company_name', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="Nazwa firmy"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newNip" className="text-slate-300">NIP</Label>
                  <Input
                    id="newNip"
                    value={newClient.nip}
                    onChange={(e) => handleNewClientInputChange('nip', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="0000000000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newPhone" className="text-slate-300">Telefon</Label>
                  <Input
                    id="newPhone"
                    value={newClient.phone}
                    onChange={(e) => handleNewClientInputChange('phone', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="+48 000 000 000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newEmail" className="text-slate-300">Email</Label>
                  <Input
                    id="newEmail"
                    value={newClient.email}
                    onChange={(e) => handleNewClientInputChange('email', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="email@firma.pl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newWebsite" className="text-slate-300">Strona WWW</Label>
                  <Input
                    id="newWebsite"
                    value={newClient.website}
                    onChange={(e) => handleNewClientInputChange('website', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                    placeholder="www.firma.pl"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="newStatus" className="text-slate-300">Status</Label>
                  <Select 
                    value={newClient.status} 
                    onValueChange={(value) => handleNewClientInputChange('status', value)}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {statusOptions.map((status) => (
                        <SelectItem key={status} value={status} className="text-white hover:bg-slate-600">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="newNotes" className="text-slate-300">Notatka</Label>
                  <Textarea
                    id="newNotes"
                    value={newClient.notes}
                    onChange={(e) => handleNewClientInputChange('notes', e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                    placeholder="Dodaj notatki o kliencie..."
                  />
                </div>

                {/* Sekcja przypomnienia dla nowego klienta */}
                <div className="col-span-2 space-y-4 border-t border-slate-600 pt-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="newReminderEnabled"
                      checked={newClient.reminder.enabled}
                      onCheckedChange={(checked) => handleNewClientReminderChange('enabled', checked)}
                      className="border-slate-600"
                    />
                    <Label htmlFor="newReminderEnabled" className="text-slate-300 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Ustaw przypomnienie
                    </Label>
                  </div>

                  {newClient.reminder.enabled && (
                    <div className="grid grid-cols-2 gap-4 ml-6">
                      <div className="space-y-2">
                        <Label htmlFor="newReminderDate" className="text-slate-300">Data</Label>
                        <Input
                          id="newReminderDate"
                          type="date"
                          value={newClient.reminder.date}
                          onChange={(e) => handleNewClientReminderChange('date', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="newReminderTime" className="text-slate-300">Godzina</Label>
                        <Input
                          id="newReminderTime"
                          type="time"
                          value={newClient.reminder.time}
                          onChange={(e) => handleNewClientReminderChange('time', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="newReminderNote" className="text-slate-300">Notatka przypomnienia</Label>
                        <Input
                          id="newReminderNote"
                          value={newClient.reminder.note}
                          onChange={(e) => handleNewClientReminderChange('note', e.target.value)}
                          className="bg-slate-700 border-slate-600 text-white"
                          placeholder="O czym przypomnieć?"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 border-t border-slate-600 pt-4">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleCancelAdd}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleSaveNewClient}
                disabled={!newClient.first_name || !newClient.last_name || !newClient.company_name || savingNewClient}
                className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
              >
                {savingNewClient ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Dodaję...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj klienta
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do wgrywania plików */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Wgraj plik CSV z klientami
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            {/* Obszar drag & drop */}
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-cyan-400 bg-cyan-500/10' 
                  : selectedFile 
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                // Pokazuj wybrany plik
                <div>
                  <FileSpreadsheet className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Plik wybrany</h3>
                  <p className="text-green-400 mb-2 font-medium">{selectedFile.name}</p>
                  <p className="text-slate-400 text-sm mb-4">
                    Rozmiar: {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => setSelectedFile(null)}
                  >
                    Zmień plik
                  </Button>
                </div>
              ) : (
                // Obszar wyboru pliku
                <div>
                  <FileSpreadsheet className={`h-12 w-12 mx-auto mb-4 ${dragActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <h3 className={`text-lg font-medium mb-2 ${dragActive ? 'text-cyan-400' : 'text-white'}`}>
                    {dragActive ? 'Upuść plik tutaj' : 'Przeciągnij plik CSV tutaj'}
                  </h3>
                  <p className="text-slate-400 mb-4">lub kliknij aby wybrać plik</p>
                  
                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  
                  <Button 
                    variant="outline" 
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    Wybierz plik CSV
                  </Button>
                </div>
              )}
            </div>
            
            {/* Analiza kolumn po wybraniu pliku */}
            {columnAnalysis && (
              <div className="mt-4 space-y-3">
                <h4 className="text-sm font-medium text-white">Analiza kolumn w pliku:</h4>
                
                {/* Znalezione kolumny */}
                {columnAnalysis.found.length > 0 && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm font-medium mb-2">✅ Znalezione kolumny:</p>
                    <div className="flex flex-wrap gap-1">
                      {columnAnalysis.found.map((col, index) => (
                        <span key={index} className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Brakujące opcjonalne kolumny */}
                {columnAnalysis.optional.length > 0 && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm font-medium mb-2">⚪ Będzie "brak informacji":</p>
                    <div className="flex flex-wrap gap-1">
                      {columnAnalysis.optional.map((col, index) => (
                        <span key={index} className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Brakujące wymagane kolumny */}
                {columnAnalysis.missing.length > 0 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm font-medium mb-2">❌ Brakujące wymagane:</p>
                    <div className="flex flex-wrap gap-1">
                      {columnAnalysis.missing.map((col, index) => (
                        <span key={index} className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Informacje o formacie (gdy nie ma analizy) */}
            {!columnAnalysis && (
              <div className="mt-4 text-sm text-slate-400">
                <p className="mb-2">Wymagane kolumny w pliku CSV:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Firma (company_name, firma, nazwa)</li>
                </ul>
                <p className="mt-2 text-xs">Opcjonalne: Imię, Nazwisko, Telefon, Email, NIP, Strona WWW, Notatki, Status</p>
                <p className="mt-1 text-xs text-slate-500">Pola bez wartości będą wypełnione jako "brak informacji"</p>
              </div>
            )}
            
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm">
                💡 Pierwszy wiersz pliku powinien zawierać nazwy kolumn. Obsługiwane separatory: przecinek (,)
              </p>
            </div>
            
            {/* Progress bar podczas uploadu */}
            {isUploading && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">Progress:</span>
                  <span className="text-cyan-400">{uploadProgress.current}%</span>
                </div>
                <Progress 
                  value={uploadProgress.current} 
                  className="w-full"
                />
                <p className="text-sm text-slate-400">{uploadProgress.status}</p>
              </div>
            )}
            
            {/* Rezultaty importu */}
            {importResults && (
              <div className="mt-4 space-y-3">
                <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
                  <h4 className="font-medium text-white mb-2">Rezultaty importu:</h4>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">✅ Pomyślnie zaimportowano:</span>
                      <span className="text-green-400 font-medium">{importResults.success}</span>
                    </div>
                    
                    {importResults.errors.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-red-400">❌ Błędy:</span>
                        <span className="text-red-400 font-medium">{importResults.errors.length}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Lista błędów */}
                  {importResults.errors.length > 0 && (
                    <div className="mt-3 max-h-32 overflow-y-auto">
                      <p className="text-sm text-slate-400 mb-2">Szczegóły błędów:</p>
                      <div className="space-y-1">
                        {importResults.errors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-xs text-red-400 bg-red-500/10 p-2 rounded">
                            Wiersz {error.row}: {error.error}
                          </div>
                        ))}
                        {importResults.errors.length > 5 && (
                          <div className="text-xs text-slate-400">
                            ... i {importResults.errors.length - 5} więcej błędów
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelUpload}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={isUploading}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleFileUpload}
              className="bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedFile || isUploading || Boolean(columnAnalysis && columnAnalysis.missing.length > 0)}
              title={
                (columnAnalysis && columnAnalysis.missing.length > 0) 
                  ? `Brakuje wymaganych kolumn: ${columnAnalysis.missing.join(', ')}`
                  : undefined
              }
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Wczytuję...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {(columnAnalysis && columnAnalysis.missing.length > 0) ? 'Brak wymaganych kolumn' : 'Wczytaj CSV'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClientDetailsPopup
        isOpen={isDetailsPopupOpen}
        onClose={handleCloseDetailsPopup}
        client={selectedClientForDetails}
        onUpdate={handleClientUpdateFromPopup}
      />
    </div>
  )
} 