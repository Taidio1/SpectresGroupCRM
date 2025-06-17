import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkhuggdkcglicghgxiyp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraHVnZ2RrY2dsaWNnaGd4aXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTEwNzEsImV4cCI6MjA2NTQ4NzA3MX0.LbWtb-modRDlvnkGF5IswRHe1lJpd4zCMgkQ3_E0QQk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Typy dla bazy danych zgodnie z ETAPEM 5 i 6 z README + StrukturaDB.txt
export interface Client {
  id: string
  first_name: string
  last_name: string
  company_name: string
  nip: string
  phone: string
  email: string
  notes: string
  website: string
  status: 'canvas' | 'brak_kontaktu' | 'nie_zainteresowany' | 'zdenerwowany' | 'antysale' | 'sale' | '$$'
  edited_by: string
  edited_at: string
  owner_id?: string // Dodane dla systemu uprawnień
  created_at: string
  updated_at: string
  owner?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  } // Informacje o właścicielu klienta
}

export interface ActivityLog {
  id: string
  client_id: string
  changed_by: string
  change_type: 'create' | 'update' | 'delete'
  field_changed: string
  old_value?: string
  new_value?: string
  timestamp: string
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'pracownik' | 'szef'
  phone?: string // Dodane pole telefonu
  bio?: string // Dodane pole biografii
  avatar_url?: string // Dodane pole URL avatara
  language?: 'pl' | 'en' | 'sk' // Dodane pole języka: Polski, Angielski, Słowacki
  created_at: string
  updated_at: string
}

// Interfejs dla historii zmian z dodatkowymi informacjami
export interface ClientHistory {
  id: string
  client_id: string
  changed_by: string
  change_type: 'create' | 'update' | 'delete'
  field_changed: string
  old_value?: string
  new_value?: string
  timestamp: string
  editor_name?: string // Dodane dla UI
  editor_role?: string // Dodane dla UI
  editor_avatar?: string // Dodane dla UI - avatar edytora
}

// Funkcje sprawdzania uprawnień
export const permissionsApi = {
  // Sprawdź czy użytkownik może edytować klienta
  canEdit: (client: Client, user: User): boolean => {
    // Wszyscy zalogowani użytkownicy mogą edytować klientów
    return true
  },

  // Sprawdź czy użytkownik może usunąć klienta
  canDelete: (client: Client, user: User): boolean => {
    // Wszyscy zalogowani użytkownicy mogą usuwać klientów
    return true
  },

  // Sprawdź czy użytkownik może widzieć klienta
  canView: (client: Client, user: User): boolean => {
    switch (user.role) {
      case 'pracownik':
        return client.owner_id === user.id || 
               client.owner_id === null || 
               client.edited_by === user.id
      case 'manager':
      case 'szef':
      case 'admin':
        return true
      default:
        return false
    }
  },

  // Sprawdź czy użytkownik może przypisywać klientów
  canAssignClients: (user: User): boolean => {
    return ['manager', 'szef', 'admin'].includes(user.role)
  },

  // Sprawdź czy użytkownik może zmieniać role innych użytkowników
  canChangeRoles: (user: User): boolean => {
    return ['szef', 'admin'].includes(user.role)
  },

  // Sprawdź czy użytkownik może dostęp do zaawansowanych raportów
  canAccessAdvancedReports: (user: User): boolean => {
    return ['manager', 'szef', 'admin'].includes(user.role)
  }
}

// Funkcje API dla klientów z systemem uprawnień
export const clientsApi = {
  // Funkcja testowa - podstawowe zapytanie do klientów
  async testBasicQuery() {
    try {
      console.log('🔍 Testowe zapytanie do tabeli clients...')
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .limit(5)
      
      console.log('Wynik testu - data:', data)
      console.log('Wynik testu - error:', error)
      
      return { data, error }
    } catch (error) {
      console.error('Błąd testowego zapytania:', error)
      return { data: null, error }
    }
  },

  // Pobierz klientów z filtrami uprawnień
  async getClients(user: User, filters?: { 
    date?: string
    status?: string
    employee?: string 
  }) {
    try {
      console.log('🔄 Rozpoczynam pobieranie klientów dla użytkownika:', user.id, user.role)
      
      // Najpierw spróbuj podstawowe zapytanie - WSZYSCY WIDZĄ WSZYSTKICH KLIENTÓW
      let query = supabase
        .from('clients')
        .select('*')
        .order('updated_at', { ascending: false })

      // USUNIĘTO FILTROWANIE ROLOWE - wszyscy widzą wszystkich klientów
      // Filtry uprawnień będą działać tylko w interfejsie użytkownika przy filtrach

      // Dodatkowe filtry
      if (filters?.date) {
        query = query.gte('updated_at', filters.date)
      }
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.employee) {
        query = query.eq('edited_by', filters.employee)
      }

      console.log('🔄 Wykonuję zapytanie podstawowe...')
      const { data: clients, error } = await query
      
      if (error) {
        console.error('❌ Błąd zapytania clients:', error)
        throw error
      }
      
      console.log('✅ Pobrano klientów:', clients?.length || 0)
      
      if (!clients || clients.length === 0) {
        console.log('ℹ️ Brak klientów w bazie danych')
        return []
      }
      
      // Teraz pobierz informacje o właścicielach osobno
      const ownerIds = [...new Set(clients.map(client => client.owner_id).filter(Boolean))]
      console.log('🔄 Pobieranie właścicieli:', ownerIds.length, 'unikalnych ID')
      
      let ownersMap: Record<string, any> = {}
      
      if (ownerIds.length > 0) {
        const { data: owners, error: ownersError } = await supabase
          .from('users')
          .select('id, full_name, email, avatar_url')
          .in('id', ownerIds)
        
        if (ownersError) {
          console.error('⚠️ Błąd pobierania właścicieli:', ownersError)
          // Kontynuuj bez danych właścicieli
        } else {
          console.log('✅ Pobrano właścicieli:', owners?.length || 0)
          ownersMap = (owners || []).reduce((acc, owner) => {
            acc[owner.id] = owner
            return acc
          }, {} as Record<string, any>)
        }
      }
      
      // Połącz dane klientów z danymi właścicieli
      const result = clients.map(client => ({
        ...client,
        owner: client.owner_id ? ownersMap[client.owner_id] || null : null
      }))
      
      console.log('✅ Zwracam', result.length, 'klientów z informacjami o właścicielach')
      return result as Client[]
      
    } catch (error) {
      console.error('❌ Błąd w getClients:', error)
      throw error
    }
  },

  // Dodaj nowego klienta z automatycznym przypisaniem właściciela
  async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>, user: User) {
    const clientToCreate = {
      ...client,
      owner_id: user.id, // Automatycznie przypisz właściciela
      edited_by: user.id
    }

    const { data, error } = await supabase
      .from('clients')
      .insert([clientToCreate])
      .select()
      .single()
    
    if (error) throw error
    return data as Client
  },

  // Zaktualizuj klienta z sprawdzeniem uprawnień
  async updateClient(id: string, updates: Partial<Client>, user: User) {
    try {
      console.log('🔄 updateClient START:', { id, updates, user: user.email })
      
      // Pobierz aktualny stan klienta aby sprawdzić czy status się zmienia
      const { data: currentClient, error: fetchError } = await supabase
        .from('clients')
        .select('status, owner_id')
        .eq('id', id)
        .single()
      
      if (fetchError) {
        console.error('❌ Błąd pobierania aktualnego klienta:', fetchError)
        throw new Error(`Nie można pobrać aktualnego stanu klienta: ${fetchError.message}`)
      }
      
      console.log('✅ Aktualny stan klienta:', currentClient)
      
      // NOWA LOGIKA: Każda osoba która edytuje klienta zostaje jego właścicielem
      let updatedData = { ...updates }
      
      // Zawsze przypisz edytującego jako właściciela
      updatedData.owner_id = user.id
      console.log(`🎯 Przypisuję klienta ${id} do użytkownika ${user.id} (${user.email}) jako właściciela`)
      
      // Jeśli to pracownik i zmienia status - dodatkowy log
      if (user.role === 'pracownik' && 
          updates.status && 
          updates.status !== currentClient.status) {
        console.log(`👷 Pracownik ${user.email} zmienia status z "${currentClient.status}" na "${updates.status}"`)
      }
      
      console.log('🔄 Dane do aktualizacji:', updatedData)
      
      // Przygotuj finalne dane do UPDATE
      const finalData = {
        ...updatedData,
        edited_by: user.id,
        updated_at: new Date().toISOString()
      }
      
      console.log('🔄 Finalne dane do UPDATE:', finalData)
      
      // Bezpośrednia aktualizacja
      const { data, error } = await supabase
        .from('clients')
        .update(finalData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ Błąd UPDATE clients:', error)
        console.error('❌ Kod błędu:', error.code)
        console.error('❌ Szczegóły:', error.details)
        console.error('❌ Hint:', error.hint)
        throw new Error(`Błąd aktualizacji: ${error.message} (kod: ${error.code})`)
      }
      
      console.log('✅ updateClient SUCCESS:', data)
      return data as Client
      
    } catch (error) {
      console.error('❌ updateClient FAILED:', error)
      throw error
    }
  },

  // Usuń klienta z sprawdzeniem uprawnień
  async deleteClient(id: string, user: User) {
    // Bezpośrednie usunięcie bez sprawdzania uprawnień
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Przypisz klienta do innego użytkownika (tylko manager+)
  async assignClient(clientId: string, newOwnerId: string, user: User) {
    if (!permissionsApi.canAssignClients(user)) {
      throw new Error('Brak uprawnień do przypisywania klientów')
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        owner_id: newOwnerId,
        edited_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select()
      .single()
    
    if (error) throw error
    return data as Client
  },

  // Subskrypcja na zmiany w czasie rzeczywistym
  subscribeToChanges(callback: (payload: any) => void) {
    return supabase
      .channel('clients_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'clients' }, 
        callback
      )
      .subscribe()
  }
}

// Funkcje API dla logów aktywności
export const activityLogsApi = {
  // Pobierz logi aktywności
  async getLogs(clientId?: string) {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        clients(first_name, last_name)
      `)
      .order('timestamp', { ascending: false })
      .limit(50)

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Pobierz historię zmian dla konkretnego klienta
  async getClientHistory(clientId: string): Promise<ClientHistory[]> {
    try {
      console.log('Pobieranie historii dla klienta:', clientId)
      
      // Sprawdź czy użytkownik jest zalogowany
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Aktualny użytkownik:', user?.id)
      
      if (!user) {
        console.error('Użytkownik nie jest zalogowany')
        return []
      }
      
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          id,
          client_id,
          changed_by,
          change_type,
          field_changed,
          old_value,
          new_value,
          timestamp
        `)
        .eq('client_id', clientId)
        .order('timestamp', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Błąd query activity_logs:', error)
        console.error('Szczegóły błędu:', JSON.stringify(error, null, 2))
        
        // Sprawdź czy to problem z RLS
        if (error.code === 'PGRST116' || error.message?.includes('RLS')) {
          console.error('Problem z Row Level Security - użytkownik może nie mieć dostępu')
        }
        
        // Zwróć pustą tablicę zamiast rzucania błędem
        return []
      }

      console.log('Pobrano logi:', data?.length || 0)

      // Jeśli nie ma logów, zwróć pustą tablicę
      if (!data || data.length === 0) {
        return []
      }

      // Pobierz informacje o użytkownikach osobno z avatarami
      const userIds = [...new Set(data.map(log => log.changed_by).filter(Boolean))]
      console.log('Pobieranie użytkowników:', userIds)

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, role, avatar_url')
        .in('id', userIds)

      if (usersError) {
        console.error('Błąd pobierania użytkowników:', usersError)
        // Kontynuuj bez danych użytkowników
      }

      console.log('Pobrano użytkowników:', users?.length || 0)

      // Mapuj użytkowników do słownika dla szybkiego dostępu
      const usersMap = (users || []).reduce((acc, user) => {
        acc[user.id] = user
        return acc
      }, {} as Record<string, any>)

      // Przekształć dane z informacjami o edytorze
      const result = data.map((log: any) => {
        const user = usersMap[log.changed_by]
        return {
          id: log.id,
          client_id: log.client_id,
          changed_by: log.changed_by,
          change_type: log.change_type,
          field_changed: log.field_changed,
          old_value: log.old_value,
          new_value: log.new_value,
          timestamp: log.timestamp,
          editor_name: user?.full_name || log.changed_by || 'Nieznany użytkownik',
          editor_role: user?.role || 'unknown',
          editor_avatar: user?.avatar_url || null
        }
      })

      console.log('Zwracanie historii:', result.length, 'wpisów')
      return result

    } catch (error) {
      console.error('Błąd w getClientHistory:', error)
      throw error
    }
  },

  // Dodaj log aktywności
  async createLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert([{
        ...log,
        timestamp: new Date().toISOString()
      }])
      .select()
      .single()
    
    if (error) throw error
    return data as ActivityLog
  },

  // Funkcja testowa do sprawdzania dostępu do activity_logs
  async testActivityLogsAccess() {
    try {
      console.log('Testowanie dostępu do activity_logs...')
      
      // Sprawdź autoryzację
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Test - użytkownik:', user?.id, user?.email)
      
      if (!user) {
        return { 
          success: false, 
          error: 'Brak autoryzacji - użytkownik nie jest zalogowany' 
        }
      }
      
      // Sprawdź czy użytkownik istnieje w tabeli users
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', user.id)
        .single()
        
      console.log('Test - profil użytkownika:', userProfile)
      console.log('Test - błąd profilu:', userError)
      
      if (userError || !userProfile) {
        return { 
          success: false, 
          error: 'Użytkownik nie istnieje w tabeli users' 
        }
      }
      
      // Testuj dostęp do activity_logs
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact' })
        .limit(1)

      console.log('Test activity_logs - data:', data)
      console.log('Test activity_logs - error:', error)
      console.log('Test activity_logs - count:', count)
      
      return { 
        success: !error, 
        data, 
        error, 
        count,
        user: userProfile
      }
    } catch (error) {
      console.error('Błąd testu activity_logs:', error)
      return { success: false, error }
    }
  }
}

// Funkcje API dla raportów
export const reportsApi = {
  // Podsumowanie dnia
  async getDailySummary(date: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('status, edited_by')
      .gte('updated_at', `${date}T00:00:00`)
      .lt('updated_at', `${date}T23:59:59`)

    if (error) throw error

    // Agregacja danych
    const statusBreakdown = data.reduce((acc: any, client) => {
      acc[client.status] = (acc[client.status] || 0) + 1
      return acc
    }, {})

    const employeeStats = data.reduce((acc: any, client) => {
      acc[client.edited_by] = (acc[client.edited_by] || 0) + 1
      return acc
    }, {})

    return {
      totalClients: data.length,
      statusBreakdown,
      employeeStats
    }
  },

  // Podsumowanie tygodniowe
  async getWeeklySummary(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('status, edited_by, updated_at')
      .gte('updated_at', startDate)
      .lt('updated_at', endDate)

    if (error) throw error
    return data
  }
}

// Funkcje autoryzacji
export const authApi = {
  // Zaloguj użytkownika
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    return data
  },

  // Zarejestruj nowego użytkownika
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })
    if (error) throw error
    return data
  },

  // Wyloguj użytkownika
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Pobierz aktualnego użytkownika
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Pobierz profil użytkownika z rolą
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data as User
  },

  // Pobierz wszystkich użytkowników (dla opcji filtrowania)
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, avatar_url')
      .order('full_name')
    
    if (error) throw error
    return data as User[]
  },

  // Sprawdź sesję użytkownika
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Nasłuchuj zmian w autoryzacji
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Zaktualizuj język użytkownika
  async updateUserLanguage(userId: string, language: 'pl' | 'en' | 'sk') {
    const { data, error } = await supabase
      .from('users')
      .update({ language })
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data as User
  }
} 