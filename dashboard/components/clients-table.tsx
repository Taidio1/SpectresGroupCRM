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
import { useAuth } from "@/store/useStore"
import { permissionsApi, activityLogsApi, clientsApi, ClientHistory } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { authApi } from "@/lib/supabase"
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
  const [currentUser] = useState('current_user')
  const [clientHistory, setClientHistory] = useState<ClientHistory[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  
  // Filtry
  const [searchQuery, setSearchQuery] = useState('')
  const [ownerFilter, setOwnerFilter] = useState<string>('all')
  const [availableOwners, setAvailableOwners] = useState<any[]>([])
  
  // Stan dla popup detali klienta
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<any>(null)
  const [isDetailsPopupOpen, setIsDetailsPopupOpen] = useState(false)
  
  // Ref dla ScrollArea historii
  const historyScrollRef = useRef<HTMLDivElement>(null)

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

  // Funkcja do ładowania klientów z bazy danych
  const loadClientsFromDatabase = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      console.log('🔄 Ładowanie klientów z bazy danych...')
      
      // Najpierw wykonaj test połączenia
      console.log('🔍 Test podstawowego połączenia...')
      const testResult = await clientsApi.testBasicQuery()
      console.log('Test result:', testResult)
      
      const dbClients = await clientsApi.getClients(user)
      console.log('📋 Pobrano klientów z bazy:', dbClients.length)
      console.log('📋 Pierwszy klient (przykład):', dbClients[0])
      
      // Sprawdź czy klienci mają właścicieli
      const clientsWithOwners = dbClients.filter(client => client.owner)
      const clientsWithoutOwners = dbClients.filter(client => !client.owner)
      console.log('👥 Klienci z właścicielami:', clientsWithOwners.length)
      console.log('❌ Klienci bez właścicieli:', clientsWithoutOwners.length)
      
      if (clientsWithOwners.length > 0) {
        console.log('👤 Przykład klienta z właścicielem:', clientsWithOwners[0].owner)
      }
      
      // Dodaj właściwości UI do danych z bazy
      const clientsWithUI = dbClients.map(client => ({
        ...client,
        isBeingEdited: false,
        editedByUser: null,
        reminder: {
          enabled: false,
          date: '',
          time: '',
          note: ''
        }
      }))
      
      setClients(clientsWithUI)
      
      // Pobierz listę dostępnych właścicieli na podstawie uprawnień
      await loadAvailableOwners(clientsWithUI)
      
      console.log('✅ Załadowano klientów:', clientsWithUI.length)
      
    } catch (error) {
      console.error('❌ Błąd ładowania klientów:', error)
      console.error('❌ Szczegóły błędu:', JSON.stringify(error, null, 2))
      
      // Pokaż toast z błędem
      toast({
        title: "Błąd",
        description: "Nie udało się załadować klientów z bazy danych",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Funkcja do ładowania dostępnych właścicieli na podstawie uprawnień
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
          avatar_url: user.avatar_url
        }]
        console.log('👤 Pracownik - opcje filtrowania ograniczone do siebie')
      } else {
        // Manager, szef, admin mogą filtrować po wszystkich użytkownikach
        const allUsers = await authApi.getAllUsers()
        filterOptions = allUsers
        console.log('👔 Manager+ - opcje filtrowania: wszyscy użytkownicy z bazy', allUsers.length)
      }

      console.log('👥 Dostępne opcje filtrowania:', filterOptions.length)
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

    setFilteredClients(filtered)
  }

  // Efekt filtrowania
  useEffect(() => {
    filterClients()
  }, [clients, searchQuery, ownerFilter])

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
          label: owner.full_name
        })
      })
      options.push({ value: 'no_owner', label: t('clients.noOwner') })
    }

    return options
  }

  // Funkcja testowa połączenia z bazą danych
  const testDatabaseConnection = async () => {
    console.log('🔍 Testowanie połączenia z bazą danych...')
    try {
      const result = await clientsApi.testBasicQuery()
      console.log('Test database result:', result)
      alert(`Test bazy danych:\nSukces: ${!result.error}\nDane: ${result.data?.length || 0} rekordów\nBłąd: ${result.error ? JSON.stringify(result.error) : 'Brak'}`)
    } catch (error) {
      console.error('Test error:', error)
      alert(`Błąd testu: ${error}`)
    }
  }

  // Załaduj klientów przy pierwszym renderze
  useEffect(() => {
    if (user) {
      loadClientsFromDatabase()
    }
  }, [user])

  // Funkcja do pobierania historii zmian
  const fetchClientHistory = async (clientId: string) => {
    setLoadingHistory(true)
    try {
      console.log('Rozpoczynam pobieranie historii dla klienta:', clientId)
      
      // Dodaj małe opóźnienie aby triggery bazy danych zdążyły się wykonać
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Najpierw uruchom test dostępu
      console.log('🔍 Testowanie dostępu do activity_logs...')
      const testResult = await activityLogsApi.testActivityLogsAccess()
      console.log('📋 Wynik testu:', testResult)
      
      if (!testResult.success) {
        console.error('❌ Test dostępu nieudany:', testResult.error)
        setClientHistory([])
        return
      }
      
      console.log('✅ Test dostępu udany, pobieranie historii...')
      const history = await activityLogsApi.getClientHistory(clientId)
      console.log('Pobrano historię:', history.length, 'wpisów')
      setClientHistory(history)
      
      // Automatycznie przewiń do dołu historii po odświeżeniu
      setTimeout(() => {
        scrollToBottom()
      }, 100)
      
    } catch (error) {
      console.error('Błąd pobierania historii:', error)
      console.error('Szczegóły błędu:', JSON.stringify(error, null, 2))
      
      // Sprawdź czy to problem z uprawnieniami
      if (error && typeof error === 'object' && 'code' in error) {
        console.error('Kod błędu Supabase:', (error as any).code)
        console.error('Wiadomość błędu:', (error as any).message)
      }
      
      // Ustaw pustą tablicę zamiast błędu
      setClientHistory([])
    } finally {
      setLoadingHistory(false)
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

  const handleEdit = (client: any) => {
    // Sprawdź uprawnienia przed edycją
    if (!user || !permissionsApi.canEdit(client, user)) {
      alert('Nie masz uprawnień do edycji tego klienta')
      return
    }
    
    setEditingClient({ ...client })
    setIsEditDialogOpen(true)
    
    // Pobierz historię zmian po otwarciu dialogu
    fetchClientHistory(client.id)
  }

  // Funkcja do zapisywania zmian klienta
  const handleSave = async () => {
    if (!editingClient || !user) return
    
    setLoading(true)
    try {
      console.log('🔄 Zapisywanie klienta:', editingClient.id)
      console.log('🔄 Aktualny użytkownik:', user.id, user.email)
      
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
      }
      
      console.log('🔄 Dane do zapisu (oczyszczone):', clientData)
      
      const updatedClient = await clientsApi.updateClient(editingClient.id, clientData, user)
      console.log('✅ Zapisano klienta:', updatedClient)
      
      // Odśwież listę klientów
      console.log('🔄 Odświeżanie listy klientów...')
      await loadClientsFromDatabase()
      
      // Odśwież historię klienta po zapisaniu
      console.log('🔄 Odświeżanie historii klienta...')
      await fetchClientHistory(editingClient.id)
      
      toast({
        title: "Sukces",
        description: "Klient został zaktualizowany"
      })
      
      // NIE zamykaj dialogu automatycznie - pozwól użytkownikowi zobaczyć zaktualizowaną historię
      // Użytkownik może zamknąć dialog ręcznie
      
    } catch (error) {
      console.error('❌ Błąd zapisywania klienta:', error)
      console.error('❌ Typ błędu:', typeof error)
      console.error('❌ Błąd toString:', String(error))
      
      // Lepsze wyświetlanie błędu
      let errorMessage = 'Nie udało się zapisać zmian klienta'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: "Błąd",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditDialogOpen(false)
    setEditingClient(null)
    setClientHistory([])
  }

  const handleAddClient = () => {
    setNewClient({ ...emptyClient })
    setIsAddDialogOpen(true)
  }

  const handleSaveNewClient = async () => {
    if (newClient.first_name && newClient.last_name && newClient.company_name && user) {
      setSavingNewClient(true)
      try {
        console.log('➕ Dodaję nowego klienta do bazy danych...')
        
        // Przygotuj dane do zapisu (tylko pola z bazy danych, bez ID - UUID zostanie wygenerowane automatycznie)
        const clientData = {
          first_name: newClient.first_name,
          last_name: newClient.last_name,
          company_name: newClient.company_name,
          nip: newClient.nip || '',
          phone: newClient.phone,
          email: newClient.email || '',
          notes: newClient.notes || '',
          website: newClient.website || '',
          status: newClient.status,
          edited_by: user.id,
          edited_at: new Date().toISOString(),
          owner_id: user.id
        }
        
        // Zapisz nowego klienta do bazy danych
        const savedClient = await clientsApi.createClient(clientData, user)
        console.log('✅ Nowy klient zapisany:', savedClient)
        
        setIsAddDialogOpen(false)
        setNewClient(emptyClient)
        
        // Pokaż komunikat sukcesu
        alert('Nowy klient został dodany pomyślnie!')
        
        // Przeładuj listę klientów z serwera
        await loadClientsFromDatabase()
        
      } catch (error) {
        console.error('❌ Błąd podczas dodawania klienta:', error)
        alert('Błąd podczas dodawania klienta: ' + (error as Error).message)
      } finally {
        setSavingNewClient(false)
      }
    } else {
      alert('Proszę wypełnić wszystkie wymagane pola: Imię, Nazwisko i Nazwa firmy')
    }
  }

  const handleCancelAdd = () => {
    setIsAddDialogOpen(false)
    setNewClient(emptyClient)
  }

  const handleDelete = async (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client || !user || !permissionsApi.canDelete(client, user)) {
      alert('Nie masz uprawnień do usunięcia tego klienta')
      return
    }

    if (confirm('Czy na pewno chcesz usunąć tego klienta?')) {
      try {
        console.log('🗑️ Usuwam klienta z bazy danych...', clientId)
        
        // Usuń klienta z bazy danych
        await clientsApi.deleteClient(clientId, user)
        console.log('✅ Klient usunięty z bazy danych')
        
        // Pokaż komunikat sukcesu
        alert('Klient został usunięty pomyślnie!')
        
        // Przeładuj listę klientów z serwera
        await loadClientsFromDatabase()
        
      } catch (error) {
        console.error('❌ Błąd podczas usuwania klienta:', error)
        alert('Błąd podczas usuwania klienta: ' + (error as Error).message)
      }
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
        ...prev.reminder,
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
  }

  const handleCancelUpload = () => {
    setIsUploadDialogOpen(false)
  }

  const handleFileUpload = () => {
    // TODO: Implementacja logiki wgrywania plików
    alert('Funkcjonalność wgrywania plików będzie dodana później')
    setIsUploadDialogOpen(false)
  }

  // Funkcja do formatowania daty przypomnienia
  const formatReminderDate = (reminder: any) => {
    if (!reminder.enabled || !reminder.date) return null
    const date = new Date(reminder.date + 'T' + reminder.time)
    return date.toLocaleDateString('pl-PL') + ' ' + reminder.time
  }

  // Funkcja do resetowania filtrów
  const resetFilters = () => {
    setSearchQuery('')
    setOwnerFilter('all')
  }

  // Funkcja do obsługi kliknięcia w telefon
  const handlePhoneClick = (client: any) => {
    setSelectedClientForDetails(client)
    setIsDetailsPopupOpen(true)
  }

  // Funkcja do zamknięcia popup
  const handleCloseDetailsPopup = () => {
    setIsDetailsPopupOpen(false)
    setSelectedClientForDetails(null)
  }

  // Sprawdź czy jakiekolwiek filtry są aktywne
  const hasActiveFilters = searchQuery.trim() !== '' || ownerFilter !== 'all'

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
          
          {/* Reset filtrów */}
          {(searchQuery || ownerFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={resetFilters}
              className="whitespace-nowrap"
            >
              <X className="h-4 w-4 mr-2" />
              {t('clients.resetFilters')}
            </Button>
          )}
          
          <Button 
            onClick={handleUploadFiles}
            variant="outline" 
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Upload className="h-4 w-4 mr-2" />
            Wgraj plik
          </Button>
          <Button 
            onClick={handleAddClient}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Dodaj klienta
          </Button>
        </div>
      </div>

      {/* Informacja dla pracowników */}
      {user?.role === 'pracownik' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-700">
            ℹ️ <strong>Informacja:</strong> {t('clients.employeeInfo')}
          </p>
        </div>
      )}

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
                  {searchQuery || ownerFilter !== 'all' ? (
                    <span className="text-cyan-400"> • filtrowane z {clients.length} ogółem</span>
                  ) : null}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={testDatabaseConnection}
                  variant="outline"
                  className="border-blue-600 text-blue-400 hover:bg-blue-500/20"
                >
                  Test DB
                </Button>
                <Button
                  onClick={handleAddClient}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj klienta
                </Button>
                <Button
                  onClick={handleUploadFiles}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-400">Live tryb aktywny</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">{t('clients.firstName')} / {t('clients.lastName')}</TableHead>
                    <TableHead className="text-slate-400">{t('clients.company')} / NIP</TableHead>
                    <TableHead className="text-slate-400">Kontakt</TableHead>
                    <TableHead className="text-slate-400">{t('clients.status')}</TableHead>
                    <TableHead className="text-slate-400">{t('clients.owner')}</TableHead>
                    <TableHead className="text-slate-400">Notatka</TableHead>
                    <TableHead className="text-slate-400">Przypomnienie</TableHead>
                    <TableHead className="text-slate-400">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-400"></div>
                          <span className="ml-2 text-slate-400">Ładowanie klientów...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                        Brak klientów do wyświetlenia
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClients.map((client) => (
                    <TableRow 
                      key={client.id} 
                      className={`border-slate-700 ${
                        client.isBeingEdited 
                          ? 'bg-yellow-500/10 border-l-4 border-l-yellow-400' 
                          : 'hover:bg-slate-700/50'
                      }`}
                    >
                      <TableCell>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {client.first_name} {client.last_name}
                          </div>
                          {/* Live editing info */}
                          {client.isBeingEdited && client.editedByUser !== currentUser && (
                            <div className="text-xs text-yellow-400 flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Edytowane przez: {client.editedByUser}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-white">{client.company_name}</div>
                        <div className="text-sm text-slate-400">NIP: {client.nip}</div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handlePhoneClick(client)}
                          className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
                        >
                          {client.phone}
                        </button>
                        <div className="text-sm text-slate-400">{client.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[client.status as keyof typeof statusColors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'}>
                          {t(`clients.statuses.${client.status}`) || client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          {client.owner ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-cyan-400/50 transition-all">
                                  <AvatarImage 
                                    src={client.owner.avatar_url || '/placeholder-user.jpg'} 
                                    alt={client.owner.full_name}
                                    className="object-cover"
                                  />
                                  <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                    {client.owner.full_name
                                      .split(' ')
                                      .map((name: string) => name[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2)
                                    }
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 border-slate-600">
                                <div className="text-sm">
                                  <div className="font-medium text-white">{client.owner.full_name}</div>
                                  <div className="text-slate-400">{client.owner.email}</div>
                                  <div className="text-xs text-slate-500 mt-1">Właściciel klienta</div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Avatar className="h-8 w-8 cursor-pointer opacity-60">
                                  <AvatarFallback className="bg-slate-700 text-slate-500 text-xs">
                                    ?
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent className="bg-slate-800 border-slate-600">
                                <div className="text-sm text-slate-400">
                                  Klient nie ma przypisanego właściciela
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-300 max-w-xs truncate">
                          {client.notes}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.reminder.enabled ? (
                          <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-orange-400" />
                            <div className="text-xs">
                              <div className="text-orange-400 font-medium">
                                {formatReminderDate(client.reminder)}
                              </div>
                              <div className="text-slate-400 truncate max-w-24">
                                {client.reminder.note}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">Brak</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Przycisk edycji tylko dla osób z uprawnieniami */}
                          {user && permissionsApi.canEdit(client, user) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(client)}
                              disabled={client.isBeingEdited && client.editedByUser !== currentUser}
                              className="h-8 w-8 p-0 border-slate-600 hover:bg-slate-700 disabled:opacity-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Przycisk usuń tylko dla manager/szef/admin */}
                          {user && permissionsApi.canDelete(client, user) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(client.id)}
                              className="h-8 w-8 p-0 border-red-600 text-red-400 hover:bg-red-500/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Informacja gdy brak uprawnień */}
                          {user && !permissionsApi.canEdit(client, user) && !permissionsApi.canDelete(client, user) && (
                            <span className="text-xs text-slate-500">Brak uprawnień</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Dialog do edycji klienta */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edytuj klienta: {editingClient?.first_name} {editingClient?.last_name}
              </DialogTitle>
            </DialogHeader>
            
            {editingClient && (
              <div className="grid grid-cols-3 gap-6 py-4">
                {/* Kolumna 1 & 2: Formularz edycji */}
                <div className="col-span-2 space-y-4">
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
                    
                    <div className="space-y-2">
                      <Label htmlFor="company_name" className="text-slate-300">Firma</Label>
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
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-slate-300">Status</Label>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-slate-300">Notatka</Label>
                    <Textarea
                      id="notes"
                      value={editingClient.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                      placeholder="Dodaj notatki o kliencie..."
                    />
                  </div>

                  {/* Sekcja przypomnienia */}
                  <div className="space-y-4 border-t border-slate-600 pt-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="reminderEnabled"
                        checked={editingClient.reminder.enabled}
                        onCheckedChange={(checked) => handleReminderChange('enabled', checked)}
                        className="border-slate-600"
                      />
                      <Label htmlFor="reminderEnabled" className="text-slate-300 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Ustaw przypomnienie
                      </Label>
                    </div>

                    {editingClient.reminder.enabled && (
                      <div className="grid grid-cols-2 gap-4 ml-6">
                        <div className="space-y-2">
                          <Label htmlFor="reminderDate" className="text-slate-300">Data</Label>
                          <Input
                            id="reminderDate"
                            type="date"
                            value={editingClient.reminder.date}
                            onChange={(e) => handleReminderChange('date', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reminderTime" className="text-slate-300">Godzina</Label>
                          <Input
                            id="reminderTime"
                            type="time"
                            value={editingClient.reminder.time}
                            onChange={(e) => handleReminderChange('time', e.target.value)}
                            className="bg-slate-700 border-slate-600 text-white"
                          />
                        </div>
                        
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="reminderNote" className="text-slate-300">Notatka przypomnienia</Label>
                          <Input
                            id="reminderNote"
                            value={editingClient.reminder.note}
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
                      >
                        {loadingHistory ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
                        ) : (
                          <RefreshCw className="h-3 w-3" />
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
                            <span className="ml-2 text-slate-400">Ładowanie...</span>
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
                                          src={entry.editor_avatar || '/placeholder-user.jpg'} 
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
            )}
            
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-600">
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
                Wgraj plik z klientami
              </DialogTitle>
            </DialogHeader>
            
            <div className="py-6">
              <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center">
                <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Przeciągnij plik tutaj</h3>
                <p className="text-slate-400 mb-4">lub kliknij aby wybrać plik</p>
                <Button 
                  variant="outline" 
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Wybierz plik
                </Button>
              </div>
              
              <div className="mt-4 text-sm text-slate-400">
                <p className="mb-2">Obsługiwane formaty:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Excel (.xlsx, .xls)</li>
                  <li>CSV (.csv)</li>
                  <li>JSON (.json)</li>
                </ul>
              </div>
              
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  💡 Upewnij się, że plik zawiera kolumny: Imię, Nazwisko, Firma, NIP, Telefon, Email
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCancelUpload}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Anuluj
              </Button>
              <Button
                onClick={handleFileUpload}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Wgraj plik
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <ClientDetailsPopup
          isOpen={isDetailsPopupOpen}
          onClose={handleCloseDetailsPopup}
          client={selectedClientForDetails}
        />
    </div>
  )
} 