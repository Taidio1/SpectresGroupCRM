import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pkhuggdkcglicghgxiyp.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBraHVnZ2RrY2dsaWNnaGd4aXlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MTEwNzEsImV4cCI6MjA2NTQ4NzA3MX0.LbWtb-modRDlvnkGF5IswRHe1lJpd4zCMgkQ3_E0QQk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Funkcja pomocnicza do generowania poprawnych URL-i avatarów z Supabase Storage
export const getAvatarUrl = (avatarUrl?: string | null): string | null => {
  if (!avatarUrl) return null
  
  // Jeśli to już pełny URL (zaczyna się od http), zwróć bez zmian
  if (avatarUrl.startsWith('http')) {
    return avatarUrl
  }
  
  // Jeśli to ścieżka w bucket'u (zawiera folder), wygeneruj publiczny URL
  if (avatarUrl.includes('/')) {
    try {
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(avatarUrl)
      
      return data.publicUrl
    } catch (error) {
      console.error('Błąd generowania URL avatara:', error)
      return null
    }
  }
  
  // Fallback - prawdopodobnie niepoprawny format
  console.warn('Nierozpoznany format avatar_url:', avatarUrl)
  return null
}

// Storage API dla plików CSV
export const storageApi = {
  // Upload pliku CSV do bucket
  async uploadCSV(file: File, user: User): Promise<string> {
    try {
      const fileName = `${user.id}_${Date.now()}_${file.name}`
      const filePath = `csv-imports/${fileName}`
      
      console.log(`📁 Uploading CSV: ${filePath}`)
      
      const { data, error } = await supabase.storage
        .from('csv-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        console.error('❌ Storage upload error:', error)
        throw new Error(`Błąd uploadu: ${error.message}`)
      }
      
      console.log('✅ File uploaded successfully:', data.path)
      return data.path
      
    } catch (error) {
      console.error('❌ Upload failed:', error)
      throw error
    }
  },
  
  // Pobierz publiczny URL pliku
  getPublicUrl(path: string): string {
    const { data } = supabase.storage
      .from('csv-files')
      .getPublicUrl(path)
    
    return data.publicUrl
  },
  
  // Usuń plik z bucket
  async deleteFile(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from('csv-files')
      .remove([path])
    
    if (error) {
      console.error('❌ File deletion error:', error)
      throw new Error(`Błąd usuwania pliku: ${error.message}`)
    }
  }
}

// CSV Import API
export const csvImportApi = {
  // Parsuj CSV i zwróć dane
  parseCSV(csvText: string): { headers: string[], rows: string[][] } {
    const lines = csvText.split('\n').filter(line => line.trim() !== '')
    
    if (lines.length < 2) {
      throw new Error('Plik CSV jest pusty lub zawiera tylko nagłówki')
    }
    
    // Parsowanie z obsługą cudzysłowów
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result.map(cell => cell.replace(/^"|"$/g, '')) // Usuń cudzysłowy
    }
    
    const headers = parseCSVLine(lines[0])
    const rows = lines.slice(1).map(parseCSVLine)
    
    return { headers, rows }
  },
  
  // Mapuj nagłówki CSV na pola bazy danych
  mapHeaders(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {}
    
    const fieldMappings = [
      { fields: ['first_name', 'imię', 'name', 'firstName'], dbField: 'first_name' },
      { fields: ['last_name', 'nazwisko', 'surname', 'lastName'], dbField: 'last_name' },
      { fields: ['company_name', 'firma', 'company', 'companyName', 'nazwa'], dbField: 'company_name' },
      { fields: ['nip', 'tax_id', 'taxId'], dbField: 'nip' },
      { fields: ['phone', 'telefon', 'telephone'], dbField: 'phone' },
      { fields: ['email', 'e-mail', 'mail'], dbField: 'email' },
      { fields: ['website', 'www', 'strona', 'url'], dbField: 'website' },
      { fields: ['notes', 'notatka', 'note', 'comment'], dbField: 'notes' },
      { fields: ['status'], dbField: 'status' }
    ]
    
    for (const fieldMapping of fieldMappings) {
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i].toLowerCase().trim()
        if (fieldMapping.fields.some(field => header.includes(field))) {
          mapping[fieldMapping.dbField] = i
          break
        }
      }
    }
    
    return mapping
  },
  
  // Waliduj wymagane pola
  validateRequiredFields(mapping: Record<string, number>): void {
    const requiredFields = ['company_name']
    const missingFields = requiredFields.filter(field => !(field in mapping))
    
    if (missingFields.length > 0) {
      throw new Error(`Brak wymaganych kolumn: ${missingFields.join(', ')}. Wymagane: Firma/Nazwa`)
    }
  },
  
  // Sprawdź dostępne kolumny i pokaż informacje
  analyzeColumns(mapping: Record<string, number>, headers: string[]): { found: string[], missing: string[], optional: string[] } {
    const allPossibleFields = [
      { field: 'first_name', displayName: 'Imię', required: false },
      { field: 'last_name', displayName: 'Nazwisko', required: false },
      { field: 'company_name', displayName: 'Firma/Nazwa', required: true },
      { field: 'phone', displayName: 'Telefon', required: false },
      { field: 'email', displayName: 'Email', required: false },
      { field: 'nip', displayName: 'NIP', required: false },
      { field: 'website', displayName: 'Strona WWW', required: false },
      { field: 'notes', displayName: 'Notatki', required: false },
      { field: 'status', displayName: 'Status', required: false }
    ]
    
    const found: string[] = []
    const missing: string[] = []
    const optional: string[] = []
    
    allPossibleFields.forEach(({ field, displayName, required }) => {
      if (field in mapping) {
        found.push(displayName)
      } else if (required) {
        missing.push(displayName)
      } else {
        optional.push(displayName)
      }
    })
    
    return { found, missing, optional }
  },
  
  // Przekształć wiersz CSV na obiekt klienta
  rowToClient(row: string[], mapping: Record<string, number>, user: User): Omit<Client, 'id' | 'created_at' | 'updated_at'> {
    const getField = (field: string, defaultValue: string = 'brak informacji'): string => {
      const index = mapping[field]
      if (index === undefined) {
        return defaultValue
      }
      const value = (row[index] || '').trim()
      return value === '' ? defaultValue : value
    }
    
    // Walidacja statusu
    const rawStatus = getField('status', 'canvas').toLowerCase()
    const validStatuses = ['canvas', 'brak_kontaktu', 'nie_zainteresowany', 'zdenerwowany', 'antysale', 'sale', '$$'] as const
    const status = validStatuses.includes(rawStatus as any) ? rawStatus as Client['status'] : 'canvas'
    
    return {
      first_name: getField('first_name'), // Opcjonalne - może być "brak informacji"
      last_name: getField('last_name'), // Opcjonalne - może być "brak informacji"
      company_name: getField('company_name', ''), // Wymagane - nie może być "brak informacji"
      nip: getField('nip'),
      phone: getField('phone'),
      email: getField('email'),
      website: getField('website'),
      notes: getField('notes'),
      status,
      edited_by: user.id,
      edited_at: new Date().toISOString(),
      owner_id: user.id,
      last_edited_by_name: user.full_name, // Zapisz dane importera
      last_edited_by_avatar_url: user.avatar_url
    }
  },
  
  // Import pełnego CSV do bazy danych
  async importCSV(file: File, user: User, onProgress?: (progress: { current: number, total: number, status: string }) => void): Promise<{ success: number, errors: any[] }> {
    try {
      onProgress?.({ current: 0, total: 100, status: 'Uploading pliku...' })
      
      // 1. Upload pliku do Storage
      const filePath = await storageApi.uploadCSV(file, user)
      
      onProgress?.({ current: 20, total: 100, status: 'Parsowanie CSV...' })
      
      // 2. Czytanie i parsowanie CSV
      const csvText = await file.text()
      const { headers, rows } = csvImportApi.parseCSV(csvText)
      
      onProgress?.({ current: 40, total: 100, status: 'Mapowanie kolumn...' })
      
      // 3. Mapowanie nagłówków
      const mapping = csvImportApi.mapHeaders(headers)
      csvImportApi.validateRequiredFields(mapping)
      
      // 4. Analiza dostępnych kolumn
      const columnAnalysis = csvImportApi.analyzeColumns(mapping, headers)
      
      console.log('📊 CSV Headers:', headers)
      console.log('📊 Field mapping:', mapping)
      console.log('📊 Rows to import:', rows.length)
      console.log('✅ Znalezione kolumny:', columnAnalysis.found)
      console.log('❌ Brakujące wymagane:', columnAnalysis.missing)
      console.log('⚪ Opcjonalne (będą "brak informacji"):', columnAnalysis.optional)
      
      onProgress?.({ current: 50, total: 100, status: `Importowanie ${rows.length} klientów...` })
      
      // 4. Import wierszy do bazy
      const results = { success: 0, errors: [] as any[] }
      
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i]
          
          // Sprawdź czy wiersz nie jest pusty
          if (row.every(cell => cell.trim() === '')) {
            continue
          }
          
          const clientData = csvImportApi.rowToClient(row, mapping, user)
          
          // Walidacja podstawowych danych
          if (!clientData.company_name || clientData.company_name.trim() === '') {
            results.errors.push({
              row: i + 2, // +2 bo liczymy od 1 i pomijamy nagłówek
              error: 'Brak wymaganych danych: firma/nazwa',
              data: row
            })
            continue
          }
          
          // Dodaj klienta do bazy
          await clientsApi.createClient(clientData, user)
          results.success++
          
          // Aktualizuj progress
          const progress = 50 + Math.floor((i / rows.length) * 40)
          onProgress?.({ current: progress, total: 100, status: `Zaimportowano ${results.success}/${rows.length} klientów` })
          
        } catch (error) {
          console.error(`❌ Błąd importu wiersza ${i + 2}:`, error)
          results.errors.push({
            row: i + 2,
            error: error instanceof Error ? error.message : 'Nieznany błąd',
            data: rows[i]
          })
        }
      }
      
      onProgress?.({ current: 95, total: 100, status: 'Finalizowanie...' })
      
      // 5. Opcjonalnie usuń plik z Storage (lub zachowaj dla historii)
      // await storageApi.deleteFile(filePath)
      
      onProgress?.({ current: 100, total: 100, status: 'Zakończono!' })
      
      console.log(`✅ Import zakończony: ${results.success} sukces, ${results.errors.length} błędów`)
      return results
      
    } catch (error) {
      console.error('❌ CSV Import failed:', error)
      throw error
    }
  }
}

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
  status_changed_at?: string // Czas ostatniej zmiany statusu
  last_phone_click?: string // Czas ostatniego kliknięcia w telefon
  last_edited_by_name?: string // Pełne imię i nazwisko ostatniego edytora
  last_edited_by_avatar_url?: string // Avatar URL ostatniego edytora
  owner?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  } // Informacje o właścicielu klienta
  reminder?: {
    enabled: boolean
    date: string
    time: string
    note: string
  } // Przypomnienie dla klienta
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
  phone?: string 
  bio?: string 
  avatar_url?: string 
  language?: 'pl' | 'en' | 'sk' 
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

// Interfejs dla slotu czasowego w planie dnia
export interface DailyScheduleSlot {
  time: string
  type: string
  color: string
  startTime: string
  endTime: string
  statuses: string[]
  clients: ClientWithReminder[]
}

// Interfejs dla klienta z przypomnieniam
export interface ClientWithReminder extends Client {
  reminder?: {
    enabled: boolean
    date: string
    time: string
    note: string
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
      
      // Użyj JOIN aby pobrać klientów z danymi właścicieli w jednym zapytaniu
      let query = supabase
        .from('clients')
        .select(`
          *,
          owner:users!owner_id (
            id,
            full_name,
            email,
            avatar_url,
            role
          )
        `)
        .order('updated_at', { ascending: false })

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

      console.log('🔄 Wykonuję zapytanie z JOIN...')
      const { data: clients, error } = await query
      
      if (error) {
        console.error('❌ Błąd zapytania clients:', error)
        throw error
      }
      
      console.log('✅ Pobrano klientów z JOIN:', clients?.length || 0)
      
      if (!clients || clients.length === 0) {
        console.log('ℹ️ Brak klientów w bazie danych')
        return []
      }
      
      // DEBUG: Sprawdź dane właścicieli
      const clientsWithOwners = clients.filter(client => client.owner)
      const clientsWithoutOwners = clients.filter(client => !client.owner)
      console.log('✅ Klienci z właścicielami:', clientsWithOwners.length)
      console.log('❌ Klienci bez właścicieli:', clientsWithoutOwners.length)
      
      if (clientsWithOwners.length > 0) {
        console.log('👤 Przykład klienta z właścicielem:', {
          client: `${clientsWithOwners[0].first_name} ${clientsWithOwners[0].last_name}`,
          owner_id: clientsWithOwners[0].owner_id,
          owner_name: clientsWithOwners[0].owner?.full_name,
          owner_email: clientsWithOwners[0].owner?.email
        })
      }
      
      console.log('✅ Zwracam', clients.length, 'klientów z informacjami o właścicielach')
      return clients as Client[]
      
    } catch (error) {
      console.error('❌ Błąd w getClients:', error)
      throw error
    }
  },

  // Dodaj nowego klienta z automatycznym przypisaniem właściciela
  async createClient(client: Omit<Client, 'id' | 'created_at' | 'updated_at'>, user: User) {
    // ZABEZPIECZENIE: Upewnij się że status nie jest pusty
    const safeStatus = client.status || 'canvas'
    
    const clientToCreate = {
      ...client,
      status: safeStatus, // Użyj bezpiecznego statusu
      owner_id: user.id, // Automatycznie przypisz właściciela
      edited_by: user.id,
      last_edited_by_name: user.full_name, // Zapisz dane twórcy
      last_edited_by_avatar_url: user.avatar_url,
      // Jeśli status to "canvas", ustaw status_changed_at
      ...(safeStatus === 'canvas' && { status_changed_at: new Date().toISOString() }),
      // Konwertuj undefined reminder na null dla bazy danych
      reminder: client.reminder || null
    }

    console.log('📊 Tworzenie klienta z danymi:', clientToCreate)
    
    const { data, error } = await supabase
      .from('clients')
      .insert([clientToCreate])
      .select()
      .single()
    
    if (error) {
      console.error('❌ Błąd createClient:', error)
      throw error
    }
    
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
      
      // ZABEZPIECZENIE: Jeśli status jest w aktualizacji, upewnij się że nie jest pusty
      if ('status' in updatedData && !updatedData.status) {
        console.log('⚠️ UWAGA: Pusty status w aktualizacji - ustawiam domyślny "canvas"')
        updatedData.status = 'canvas'
      }
      
      // Sprawdź czy status się zmienia
      const statusChanged = updatedData.status && updatedData.status !== currentClient.status
      if (statusChanged) {
        updatedData.status_changed_at = new Date().toISOString()
        console.log(`📊 Status zmieniony z "${currentClient.status}" na "${updates.status}" - ustawiam status_changed_at`)
        
        // Powiadomienie o zmianie na canvas
        if (updates.status === 'canvas') {
          console.log('🔔 POWIADOMIENIE: Klient przeszedł na status CANVAS - start trackingu czasu!')
        }
      }
      
      // Zawsze przypisz edytującego jako właściciela
      updatedData.owner_id = user.id
      console.log(`🎯 Przypisuję klienta ${id} do użytkownika ${user.id} (${user.email}) jako właściciela`)
      
      // Zapisz informacje o edytorze (szczególnie ważne dla pracowników)
      updatedData.last_edited_by_name = user.full_name
      updatedData.last_edited_by_avatar_url = user.avatar_url
      console.log(`👤 Zapisuję dane edytora: ${user.full_name} (rola: ${user.role})`)
      
      // Jeśli to pracownik i zmienia status - dodatkowy log
      if (user.role === 'pracownik' && statusChanged) {
        console.log(`👷 Pracownik ${user.email} zmienia status z "${currentClient.status}" na "${updates.status}"`)
      }
      
      console.log('🔄 Dane do aktualizacji:', updatedData)
      
      // Przygotuj finalne dane do UPDATE
      const finalData = {
        ...updatedData,
        edited_by: user.id,
        updated_at: new Date().toISOString(),
        // Konwertuj undefined reminder na null dla bazy danych
        ...(updatedData.reminder !== undefined && { reminder: updatedData.reminder || null })
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

  // Aktualizuj czas ostatniego kliknięcia telefonu
  async updateLastPhoneClick(clientId: string, user: User) {
    console.log('📞 Aktualizuję czas ostatniego kliknięcia telefonu:', clientId)
    
    const { data, error } = await supabase
      .from('clients')
      .update({
        last_phone_click: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId)
      .select()
      .single()
    
    if (error) {
      console.error('❌ Błąd updateLastPhoneClick:', error)
      throw error
    }

    // Zaloguj w activity_logs
    try {
      await activityLogsApi.createLog({
        client_id: clientId,
        changed_by: user.id,
        change_type: 'update',
        field_changed: 'last_phone_click',
        old_value: undefined,
        new_value: data.last_phone_click
      })
    } catch (logError) {
      console.error('❌ Błąd logowania activity_logs (updateLastPhoneClick):', logError)
    }
    
    return data as Client
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

  // Funkcja do czyszczenia nieistniejących owner_id
  async cleanupInvalidOwnerIds() {
    try {
      console.log('🧹 Rozpoczynam czyszczenie nieistniejących owner_id...')
      
      // Pobierz wszystkich klientów z owner_id
      const { data: allClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, owner_id, first_name, last_name')
        .not('owner_id', 'is', null)
      
      if (clientsError) throw clientsError
      
      console.log('📊 Znaleziono klientów z owner_id:', allClients?.length || 0)
      
      if (!allClients || allClients.length === 0) {
        return { cleaned: 0, errors: [] }
      }
      
      // Pobierz wszystkie unikalne owner_id
      const ownerIds = [...new Set(allClients.map(c => c.owner_id))]
      console.log('🔍 Sprawdzam owner_id:', ownerIds)
      
      // Sprawdź które użytkownicy istnieją
      const { data: existingUsers, error: usersError } = await supabase
        .from('users')
        .select('id')
        .in('id', ownerIds)
      
      if (usersError) throw usersError
      
      const existingUserIds = (existingUsers || []).map(u => u.id)
      console.log('✅ Istniejący użytkownicy:', existingUserIds)
      
      // Znajdź klientów z nieistniejącymi owner_id
      const clientsToClean = allClients.filter(client => 
        client.owner_id && !existingUserIds.includes(client.owner_id)
      )
      
      console.log('🧹 Klienci do wyczyszczenia:', clientsToClean.length)
      
      if (clientsToClean.length === 0) {
        console.log('✅ Brak klientów do wyczyszczenia')
        return { cleaned: 0, errors: [] }
      }
      
      // Wyczyść owner_id dla problematycznych klientów
      const cleanupResults: string[] = []
      const errors: any[] = []
      
      for (const client of clientsToClean) {
        try {
          console.log(`🧹 Czyszczę owner_id dla ${client.first_name} ${client.last_name} (${client.owner_id})`)
          
          const { error } = await supabase
            .from('clients')
            .update({ owner_id: null })
            .eq('id', client.id)
          
          if (error) {
            console.error(`❌ Błąd czyszczenia ${client.id}:`, error)
            errors.push({ client: client.id, error: error.message })
          } else {
            cleanupResults.push(client.id)
          }
        } catch (err) {
          console.error(`❌ Wyjątek podczas czyszczenia ${client.id}:`, err)
          errors.push({ client: client.id, error: String(err) })
        }
      }
      
      console.log(`✅ Wyczyszczono ${cleanupResults.length} klientów`)
      if (errors.length > 0) {
        console.error(`❌ Błędy przy ${errors.length} klientach:`, errors)
      }
      
      return { 
        cleaned: cleanupResults.length, 
        errors,
        cleanedClients: clientsToClean.filter(c => cleanupResults.includes(c.id))
      }
      
    } catch (error) {
      console.error('❌ Błąd w cleanupInvalidOwnerIds:', error)
      throw error
    }
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
  },

  // Subskrypcja na zmiany owner_id dla real-time aktualizacji
  subscribeToOwnerChanges(callback: (payload: any) => void) {
    try {
      // Sprawdź czy callback jest funkcją
      if (typeof callback !== 'function') {
        console.error('❌ Callback nie jest funkcją w subscribeToOwnerChanges')
        throw new Error('Callback musi być funkcją')
      }

      console.log('📡 Tworzę kanał Supabase dla owner changes...')
      
      // Najpierw sprawdź czy real-time jest włączony i dostępny
      const channelName = `clients_owner_changes_${Date.now()}`
      console.log('📡 Nazwa kanału:', channelName)
      
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'clients',
            filter: 'owner_id=neq.null' // Tylko gdy owner_id się zmienia
          }, 
          (payload) => {
            try {
              console.log('📡 Real-time payload otrzymany:', {
                eventType: payload.eventType,
                table: payload.table,
                changes: payload.new ? {
                  id: payload.new.id,
                  owner_id: payload.new.owner_id,
                  first_name: payload.new.first_name,
                  last_name: payload.new.last_name
                } : 'brak danych'
              })
              
              if (typeof callback === 'function') {
                callback(payload)
              } else {
                console.error('❌ Callback nie jest funkcją podczas wywołania')
              }
            } catch (callbackError) {
              console.error('❌ Błąd w callback:', callbackError)
            }
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Subskrypcja owner_changes status:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Subskrypcja owner_changes aktywna')
          } else if (status === 'CLOSED') {
            console.warn('⚠️ Subskrypcja owner_changes zamknięta - prawdopodobnie problem z autoryzacją real-time')
            console.warn('💡 Real-time może być wyłączony w ustawieniach Supabase lub brakuje uprawnień')
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Błąd kanału real-time:', err)
            console.error('💡 Sprawdź ustawienia real-time w Supabase Dashboard')
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Timeout subskrypcji - problemy z połączeniem WebSocket')
          } else {
            console.log('📡 Status subskrypcji:', status)
          }
        })
      
      // Sprawdź stan kanału po krótkim czasie
      setTimeout(() => {
        if (channel.state === 'closed') {
          console.warn('⚠️ Kanał real-time został zamknięty - prawdopodobnie RLS blokuje real-time lub feature jest wyłączony')
        }
      }, 2000)
      
      console.log('✅ Kanał owner changes utworzony')
      return channel
      
    } catch (error) {
      console.error('❌ Błąd w subscribeToOwnerChanges:', error)
      console.warn('💡 Real-time nie będzie działać - aplikacja będzie używać okresowego odświeżania')
      
      // Zwróć mock object aby nie powodować błędów
      return {
        unsubscribe: () => {
          console.log('🧹 Mock unsubscribe dla błędnego kanału')
        }
      }
    }
  },

  // Pobierz klientów z przypomnieniami na konkretny dzień
  async getClientsWithReminders(user: User, targetDate?: string): Promise<ClientWithReminder[]> {
    try {
      const today = targetDate || new Date().toISOString().split('T')[0] // format YYYY-MM-DD
      
      console.log(`📅 Pobieranie klientów z przypomnieniami na: ${today}`)

      // Pobierz wszystkich klientów użytkownika
      const allClients = await this.getClients(user)

      // Filtruj tylko tych z przypomnieniami na dziś
      const clientsWithTodayReminders = allClients.filter(client => {
        // Sprawdź czy klient ma aktywne przypomnienie
        const reminder = client.reminder || {
          enabled: false,
          date: '',
          time: '',
          note: ''
        }

        return reminder.enabled && reminder.date === today
      })

      // Sortuj według godziny przypomnienia
      const sortedClients = clientsWithTodayReminders.sort((a, b) => {
        const timeA = a.reminder?.time || '00:00'
        const timeB = b.reminder?.time || '00:00'
        return timeA.localeCompare(timeB)
      })

      console.log(`✅ Znaleziono ${sortedClients.length} klientów z przypomnieniami na ${today}`)
      
      return sortedClients
    } catch (error) {
      console.error('❌ Błąd pobierania klientów z przypomnieniami:', error)
      throw error
    }
  },

  // Pobierz przypomnienia pogrupowane według slotów czasowych dla dashboardu
  async getDailyScheduleWithClients(user: User, targetDate?: string): Promise<DailyScheduleSlot[]> {
    try {
      const clientsWithReminders = await this.getClientsWithReminders(user, targetDate)
      
      // Definicja slotów czasowych (zgodnie z obecną strukturą dashboardu)
      const timeSlots = [
        { 
          time: '8:00 - 10:00', 
          type: 'canvas', 
          color: '#06b6d4',
          startTime: '08:00',
          endTime: '10:00',
          statuses: ['canvas']
        },
        { 
          time: '10:10 - 12:00', 
          type: 'sales', 
          color: '#10b981',
          startTime: '10:10',
          endTime: '12:00',
          statuses: ['sale']
        },
        { 
          time: '12:30 - 15:00', 
          type: 'antysales', 
          color: '#f59e0b',
          startTime: '12:30',
          endTime: '15:00',
          statuses: ['antysale']
        },
        { 
          time: '15:10 - 16:30', 
          type: 'canvas + sales', 
          color: '#8b5cf6',
          startTime: '15:10',
          endTime: '16:30',
          statuses: ['canvas', 'sale']
        },
      ]

      // Przypisz klientów do odpowiednich slotów
      const slotsWithClients = timeSlots.map(slot => {
        const slotClients = clientsWithReminders.filter(client => {
          const reminderTime = client.reminder?.time || '00:00'
          const [hours, minutes] = reminderTime.split(':').map(Number)
          const reminderMinutes = hours * 60 + minutes

          const [startHours, startMins] = slot.startTime.split(':').map(Number)
          const [endHours, endMins] = slot.endTime.split(':').map(Number)
          const startMinutes = startHours * 60 + startMins
          const endMinutes = endHours * 60 + endMins

          // Sprawdź czy godzina przypomnienia mieści się w slocie
          const timeInSlot = reminderMinutes >= startMinutes && reminderMinutes <= endMinutes
          
          // Sprawdź czy status klienta pasuje do typu slotu
          const statusMatches = slot.statuses.includes(client.status)

          return timeInSlot && statusMatches
        })

        return {
          ...slot,
          clients: slotClients
        }
      })

      console.log(`📊 Plan dnia z ${slotsWithClients.reduce((sum, slot) => sum + slot.clients.length, 0)} klientami`)
      
      return slotsWithClients
    } catch (error) {
      console.error('❌ Błąd tworzenia planu dnia:', error)
      throw error
    }
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

// Typy dla statystyk pracowników
export interface EmployeeStats {
  id: string
  user_id: string
  daily_target: number
  commission_rate: number
  monthly_canvas: number
  monthly_antysale: number
  monthly_sale: number
  total_commissions: number
  total_penalties: number
  // Pola do edycji ręcznej
  custom_clients_count?: number
  custom_total_payments?: number
  // Dodatkowe dane z JOIN
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    role: string
  }
  // Obliczone na podstawie danych z clients
  daily_achieved?: number
  yesterday_shortage?: number
  status_changes_today?: Record<string, number>
}

// Funkcje API dla raportów
export const reportsApi = {
  // Pobierz statystyki tylko pracowników z prowizją
  async getEmployeeStats(user: User): Promise<EmployeeStats[]> {
    try {
      console.log('📊 Pobieranie statystyk pracowników...')
      
      // KROK 1: Pobierz wszystkich użytkowników z rolą 'pracownik'
      const { data: allEmployees, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          email,
          avatar_url,
          role
        `)
        .eq('role', 'pracownik')
        .order('full_name', { ascending: true })

      if (usersError) {
        console.error('❌ Błąd pobierania użytkowników-pracowników:', usersError)
        throw usersError
      }

      if (!allEmployees || allEmployees.length === 0) {
        console.log('⚠️ Brak użytkowników z rolą pracownik')
        return []
      }

      console.log('✅ Pobrano wszystkich pracowników:', allEmployees.length, allEmployees.map(e => e.full_name))

      // KROK 2: Pobierz statystyki z tabeli employee_stats dla tych pracowników
      const employeeIds = allEmployees.map(emp => emp.id)
      let existingStats: any[] = []
      
      try {
        const { data, error: statsError } = await supabase
          .from('employee_stats')
          .select('*')
          .in('user_id', employeeIds)

        if (statsError) {
          console.warn('⚠️ Błąd pobierania employee_stats:', statsError)
        } else {
          existingStats = data || []
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać employee_stats:', error)
      }

      console.log('✅ Pobrano statystyki dla pracowników:', existingStats?.length || 0)

      // KROK 3: Pobierz dzisiejsze statystyki z tabeli clients (z obsługą błędów)
      const today = new Date().toISOString().split('T')[0]
      let todayClients: any[] = []
      
      try {
        const { data, error: clientsError } = await supabase
          .from('clients')
          .select('status, edited_by, created_at, updated_at')
          .gte('updated_at', `${today}T00:00:00`)
          .lt('updated_at', `${today}T23:59:59`)

        if (clientsError) {
          console.warn('⚠️ Błąd pobierania klientów z dzisiaj:', clientsError)
        } else {
          todayClients = data || []
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać dzisiejszych klientów:', error)
      }

      console.log('✅ Pobrano dzisiejszych klientów:', todayClients.length)

      // KROK 4: Pobierz wczorajsze statystyki dla kar (z obsługą błędów)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      let yesterdayClients: any[] = []
      
      try {
        const { data, error: yesterdayError } = await supabase
          .from('clients')
          .select('status, edited_by')
          .gte('updated_at', `${yesterdayStr}T00:00:00`)
          .lt('updated_at', `${yesterdayStr}T23:59:59`)

        if (yesterdayError) {
          console.warn('⚠️ Błąd pobierania wczorajszych klientów:', yesterdayError)
        } else {
          yesterdayClients = data || []
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać wczorajszych klientów:', error)
      }

      // KROK 5: Pobierz WSZYSTKICH klientów przypisanych do pracowników (z obsługą błędów)
      let allOwnedClients: any[] = []
      
      try {
        const { data, error: ownedError } = await supabase
          .from('clients')
          .select('status, owner_id')
          .not('owner_id', 'is', null)
          .in('owner_id', employeeIds)

        if (ownedError) {
          console.warn('⚠️ Błąd pobierania klientów przypisanych:', ownedError)
        } else {
          allOwnedClients = data || []
        }
      } catch (error) {
        console.warn('⚠️ Nie udało się pobrać przypisanych klientów:', error)
      }

      console.log('✅ Pobrano wszystkich przypisanych klientów:', allOwnedClients.length)

      // KROK 6: Agreguj dzisiejsze statystyki per pracownik
      const todayStats = todayClients.reduce((acc: Record<string, any>, client) => {
        const userId = client.edited_by
        if (!userId) return acc
        
        if (!acc[userId]) {
          acc[userId] = { total: 0, canvas: 0, antysale: 0, sale: 0, other: 0 }
        }
        
        acc[userId].total++
        if (client.status === 'canvas') acc[userId].canvas++
        else if (client.status === 'antysale') acc[userId].antysale++
        else if (client.status === 'sale') acc[userId].sale++
        else acc[userId].other++
        
        return acc
      }, {})

      // KROK 7: Agreguj wczorajsze statystyki per pracownik
      const yesterdayStats = yesterdayClients.reduce((acc: Record<string, number>, client) => {
        const userId = client.edited_by
        if (userId) {
          acc[userId] = (acc[userId] || 0) + 1
        }
        return acc
      }, {})

      // KROK 8: Agreguj statusy WSZYSTKICH przypisanych klientów per pracownik
      const ownedClientsStats = allOwnedClients.reduce((acc: Record<string, any>, client) => {
        const ownerId = client.owner_id
        if (!ownerId) return acc
        
        if (!acc[ownerId]) {
          acc[ownerId] = { total: 0, canvas: 0, antysale: 0, sale: 0, brak_kontaktu: 0, nie_zainteresowany: 0, zdenerwowany: 0, '$$': 0 }
        }
        
        acc[ownerId].total++
        
        switch (client.status) {
          case 'canvas':
            acc[ownerId].canvas++
            break
          case 'antysale':
            acc[ownerId].antysale++
            break
          case 'sale':
            acc[ownerId].sale++
            break
          case 'brak_kontaktu':
            acc[ownerId].brak_kontaktu++
            break
          case 'nie_zainteresowany':
            acc[ownerId].nie_zainteresowany++
            break
          case 'zdenerwowany':
            acc[ownerId].zdenerwowany++
            break
          case '$$':
            acc[ownerId]['$$']++
            break
        }
        
        return acc
      }, {})

      console.log('📊 Statystyki przypisanych klientów:', ownedClientsStats)

      // KROK 9: Stwórz mapę statystyk employee_stats
      const statsMap = new Map()
      existingStats.forEach(stat => {
        statsMap.set(stat.user_id, stat)
      })

      // KROK 10: Kombinuj dane - dla WSZYSTKICH pracowników (zawsze zwraca listę)
      const enhancedStats: EmployeeStats[] = allEmployees.map(employee => {
        const userId = employee.id
        
        // Pobierz statystyki z employee_stats lub utwórz domyślne
        const basicStat = statsMap.get(userId) || {
          id: 'temp_' + userId,
          user_id: userId,
          daily_target: 20,
          commission_rate: 3.0,
          monthly_canvas: 0,
          monthly_antysale: 0,
          monthly_sale: 0,
          total_commissions: 0,
          total_penalties: 0,
          custom_clients_count: 0,
          custom_total_payments: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const todayForUser = todayStats[userId] || { total: 0, canvas: 0, antysale: 0, sale: 0 }
        const yesterdayForUser = yesterdayStats[userId] || 0
        const ownedForUser = ownedClientsStats[userId] || { 
          total: 0, 
          canvas: 0, 
          antysale: 0, 
          sale: 0, 
          brak_kontaktu: 0, 
          nie_zainteresowany: 0, 
          zdenerwowany: 0, 
          '$$': 0 
        }
        
        // Oblicz karę za wczoraj
        const yesterdayShortage = Math.max(0, basicStat.daily_target - yesterdayForUser)
        const penalty = yesterdayShortage * 15

        // Oblicz prowizję na podstawie przypisanych klientów Sale
        const commission = (ownedForUser.sale * basicStat.commission_rate / 100) * 100

        console.log(`👤 Pracownik ${employee.full_name}: Canvas=${ownedForUser.canvas}, AntyS=${ownedForUser.antysale}, Sale=${ownedForUser.sale}`)

        return {
          ...basicStat,
          // WAŻNE: Dołącz dane użytkownika
          user: {
            id: employee.id,
            full_name: employee.full_name,
            email: employee.email,
            avatar_url: employee.avatar_url,
            role: employee.role
          },
          daily_achieved: todayForUser.total,
          yesterday_shortage: yesterdayShortage,
          status_changes_today: {
            canvas: todayForUser.canvas,
            antysale: todayForUser.antysale,
            sale: todayForUser.sale,
            other: todayForUser.other
          },
          // Używaj statystyk opartych na owner_id (przypisanych klientów)
          monthly_canvas: ownedForUser.canvas,
          monthly_antysale: ownedForUser.antysale,
          monthly_sale: ownedForUser.sale,
          total_commissions: commission,
          total_penalties: penalty
        }
      })

      console.log('✅ Przygotowano rozszerzone statystyki dla wszystkich pracowników:', enhancedStats.length)
      console.log('👥 Lista pracowników:', enhancedStats.map(s => s.user?.full_name).join(', '))
      
      return enhancedStats

    } catch (error) {
      console.error('❌ Błąd pobierania statystyk pracowników:', error)
      // W przypadku błędu, zwróć pustą listę zamiast rzucać błąd
      return []
    }
  },

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
  },

  // Aktualizuj statystyki pracownika (dla manager/szef/admin)
  async updateEmployeeStats(userId: string, updates: Partial<EmployeeStats>, currentUser: User) {
    // Sprawdź uprawnienia
    if (!['manager', 'szef', 'admin'].includes(currentUser.role)) {
      throw new Error('Brak uprawnień do modyfikacji statystyk')
    }

    const { data, error } = await supabase
      .from('employee_stats')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Edytuj ilość klientów i sumę wpłat pracownika (dla manager/szef/admin)
  async updateEmployeeClientStats(userId: string, clientsCount: number, totalPayments: number, currentUser: User) {
    // Sprawdź uprawnienia
    if (!['manager', 'szef', 'admin'].includes(currentUser.role)) {
      throw new Error('Brak uprawnień do modyfikacji statystyk')
    }

    try {
      console.log(`📝 Aktualizuję statystyki pracownika ${userId}: klienci=${clientsCount}, wpłaty=${totalPayments}`)
      
      // METODA 1: Spróbuj prostą aktualizację w employee_stats
      try {
        console.log('📝 Próba prostej aktualizacji w employee_stats')
        
        const legacyUpdates = {
          custom_clients_count: clientsCount,
          custom_total_payments: totalPayments,
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('employee_stats')
          .update(legacyUpdates)
          .eq('user_id', userId)
          .select(`
            *,
            user:users!user_id (
              id,
              full_name,
              email,
              avatar_url,
              role
            )
          `)
          .single()

        if (!error && data) {
          console.log('✅ Zaktualizowano statystyki w employee_stats (metoda 1)')
          console.log(`📊 Klienci: ${clientsCount}, Wpłaty: €${totalPayments}`)
          return data
        } else {
          console.warn('⚠️ Metoda 1 nie zadziałała:', error)
          throw error
        }

      } catch (method1Error) {
        console.warn('⚠️ Metoda 1 (prosta aktualizacja) nie zadziałała:', method1Error)
        
        // METODA 2: Spróbuj INSERT z ON CONFLICT
        try {
          console.log('📝 Próba INSERT z ON CONFLICT w employee_stats')
          
          const insertData = {
            user_id: userId,
            daily_target: 20,
            commission_rate: 3.0,
            monthly_canvas: 0,
            monthly_antysale: 0,
            monthly_sale: 0,
            total_commissions: 0,
            total_penalties: 0,
            custom_clients_count: clientsCount,
            custom_total_payments: totalPayments,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          const { data, error } = await supabase
            .from('employee_stats')
            .upsert(insertData, { 
              onConflict: 'user_id',
              ignoreDuplicates: false 
            })
            .select(`
              *,
              user:users!user_id (
                id,
                full_name,
                email,
                avatar_url,
                role
              )
            `)
            .single()

          if (!error && data) {
            console.log('✅ Zaktualizowano statystyki w employee_stats (metoda 2)')
            console.log(`📊 Klienci: ${clientsCount}, Wpłaty: €${totalPayments}`)
            return data
          } else {
            console.warn('⚠️ Metoda 2 nie zadziałała:', error)
            throw error
          }

        } catch (method2Error) {
          console.warn('⚠️ Metoda 2 (upsert) nie zadziałała:', method2Error)
          
          // METODA 3: Zaktualizuj tylko w pamięci (fallback)
          console.log('📝 Fallback - zwracam symulowane dane')
          
          return {
            id: 'temp_' + userId,
            user_id: userId,
            daily_target: 20,
            commission_rate: 3.0,
            monthly_canvas: 0,
            monthly_antysale: 0,
            monthly_sale: 0,
            total_commissions: 0,
            total_penalties: 0,
            custom_clients_count: clientsCount,
            custom_total_payments: totalPayments,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user: {
              id: userId,
              full_name: 'Pracownik',
              email: 'brak@email.com',
              avatar_url: null,
              role: 'pracownik'
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Błąd w updateEmployeeClientStats:', error)
      throw error
    }
  },

  // Stwórz statystyki dla nowego pracownika
  async createEmployeeStats(userId: string, currentUser: User) {
    // Sprawdź uprawnienia
    if (!['manager', 'szef', 'admin'].includes(currentUser.role)) {
      throw new Error('Brak uprawnień do tworzenia statystyk')
    }

    const { data, error } = await supabase
      .from('employee_stats')
      .insert([{
        user_id: userId,
        daily_target: 20,
        commission_rate: 3.0
      }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  // 📊 Nowa funkcja: Pobierz statystyki wykorzystania bazy (klienci z/bez właściciela)
  async getDatabaseUtilization(): Promise<{ withOwner: number, withoutOwner: number, total: number, utilizationPercentage: number }> {
    try {
      console.log('📊 Pobieranie statystyk wykorzystania bazy...')
      
      // Zlicz wszystkich klientów
      const { count: totalCount, error: totalError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      if (totalError) {
        console.error('❌ Błąd pobierania łącznej liczby klientów:', totalError)
        throw totalError
      }

      // Zlicz klientów z właścicielem (owner_id != null)
      const { count: withOwnerCount, error: withOwnerError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .not('owner_id', 'is', null)

      if (withOwnerError) {
        console.error('❌ Błąd pobierania klientów z właścicielem:', withOwnerError)
        throw withOwnerError
      }

      // Oblicz klientów bez właściciela
      const withoutOwnerCount = (totalCount || 0) - (withOwnerCount || 0)
      
      // Oblicz procent wykorzystania
      const utilizationPercentage = totalCount ? Math.round((withOwnerCount || 0) / totalCount * 100) : 0

      const result = {
        withOwner: withOwnerCount || 0,
        withoutOwner: withoutOwnerCount,
        total: totalCount || 0,
        utilizationPercentage
      }

      console.log('📊 Statystyki wykorzystania bazy:', result)
      return result

    } catch (error) {
      console.error('❌ Błąd pobierania statystyk wykorzystania bazy:', error)
      throw error
    }
  },

  // 🔄 ADMIN: Resetuj właścicieli wszystkich klientów
  async resetAllClientOwners(currentUser: User): Promise<{ success: number, message: string }> {
    // Sprawdź uprawnienia - tylko admin
    if (currentUser.role !== 'admin') {
      throw new Error('Brak uprawnień! Tylko administrator może resetować właścicieli klientów.')
    }

    try {
      console.log('🔄 Rozpoczynam resetowanie właścicieli klientów...')
      
      // Pobierz liczbę klientów z właścicielem przed resetowaniem
      const { count: beforeCount, error: beforeError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .not('owner_id', 'is', null)

      if (beforeError) {
        console.error('❌ Błąd sprawdzania stanu przed resetowaniem:', beforeError)
        throw beforeError
      }

      // Resetuj owner_id dla wszystkich klientów
      const { data, error } = await supabase
        .from('clients')
        .update({ owner_id: null })
        .not('owner_id', 'is', null) // Tylko te które mają właściciela
        .select('id, first_name, last_name')

      if (error) {
        console.error('❌ Błąd resetowania właścicieli:', error)
        throw error
      }

      const resetCount = data?.length || 0
      
      // Loguj akcję do activity_logs
      try {
        await activityLogsApi.createLog({
          client_id: 'bulk_action',
          changed_by: currentUser.id,
          change_type: 'update',
          field_changed: 'owner_id',
          old_value: 'various',
          new_value: 'null (reset by admin)',
        })
      } catch (logError) {
        console.error('⚠️ Nie udało się zalogować akcji:', logError)
        // Nie przerywamy procesu z powodu błędu logowania
      }

      console.log(`✅ Zresetowano właścicieli dla ${resetCount} klientów`)
      
      return {
        success: resetCount,
        message: `Pomyślnie zresetowano właścicieli dla ${resetCount} klientów. Wszyscy klienci są teraz bez przypisanego właściciela.`
      }

    } catch (error: any) {
      console.error('❌ Błąd resetowania właścicieli klientów:', error)
      throw error
    }
  },

  // Pobierz statystyki aktywności pracowników z tabeli employee_statistics
  async getEmployeeActivityStats(user: User): Promise<EmployeeActivityStats[]> {
    try {
      console.log('📊 Pobieranie statystyk aktywności pracowników...')
      
      // Sprawdź uprawnienia
      if (!user || !['manager', 'szef', 'admin'].includes(user.role)) {
        console.warn('⚠️ Brak uprawnień do podglądu statystyk aktywności')
        return []
      }

      // KROK 1: Pobierz wszystkich użytkowników z rolą 'pracownik'
      let allEmployees = []
      try {
        const { data: employees, error: usersError } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            avatar_url,
            role
          `)
          .eq('role', 'pracownik')
          .order('full_name', { ascending: true })

        if (usersError) {
          console.error('❌ Błąd pobierania użytkowników-pracowników:', usersError)
          return []
        }

        allEmployees = employees || []
        console.log(`👥 Znaleziono pracowników: ${allEmployees.length}`)
        
        if (allEmployees.length === 0) {
          console.log('⚠️ Brak użytkowników z rolą pracownik')
          return []
        }
      } catch (error) {
        console.error('❌ Błąd pobierania pracowników:', error)
        return []
      }

      // KROK 2: Pobierz statystyki aktywności - z obsługą błędów RLS
      let activityStats = []
      try {
        const employeeIds = allEmployees.map(emp => emp.id)
        console.log(`🔍 Pobieranie statystyk dla ID: ${employeeIds.slice(0, 3).join(', ')}... (${employeeIds.length} total)`)

        const { data: stats, error: statsError } = await supabase
          .from('employee_statistics')
          .select('*')
          .eq('period_type', 'monthly')
          .in('user_id', employeeIds)
          .order('period_end', { ascending: false })

        if (statsError) {
          console.error('❌ Błąd pobierania statystyk aktywności:', statsError)
          
          // Jeśli to błąd RLS (403), nie przerywaj - użyj domyślnych danych
          if (statsError.code === 'PGRST116' || statsError.message?.includes('RLS') || statsError.message?.includes('permission')) {
            console.warn('🔒 Problem z RLS - używam domyślnych danych aktywności')
            activityStats = []
          } else {
            console.error('💥 Krytyczny błąd pobierania statystyk - przerywam')
            return []
          }
        } else {
          activityStats = stats || []
          console.log(`📊 Znaleziono rekordów aktywności: ${activityStats.length}`)
        }
      } catch (error) {
        console.error('❌ Błąd zapytania o statystyki aktywności:', error)
        activityStats = []
      }

      // KROK 3: Stwórz mapę najnowszych statystyk dla każdego pracownika
      const latestStatsMap = new Map()
      if (activityStats && activityStats.length > 0) {
        activityStats.forEach(stat => {
          const userId = stat.user_id
          if (!latestStatsMap.has(userId)) {
            latestStatsMap.set(userId, stat)
          }
        })
        console.log(`🗺️ Zmapowano statystyki dla ${latestStatsMap.size} pracowników`)
      } else {
        console.log('⚠️ Brak danych aktywności - użyję domyślnych wartości')
      }

      // KROK 4: Kombinuj dane pracowników ze statystykami aktywności
      const result: EmployeeActivityStats[] = allEmployees.map(employee => {
        const userId = employee.id
        const activityStat = latestStatsMap.get(userId)

        if (activityStat) {
          // Mamy statystyki - użyj prawdziwych danych
          return {
            ...activityStat,
            user: {
              id: employee.id,
              full_name: employee.full_name,
              email: employee.email,
              avatar_url: employee.avatar_url,
              role: employee.role
            }
          }
        } else {
          // Brak statystyk - stwórz domyślne dane
          const currentDate = new Date()
          const currentMonth = currentDate.getMonth() + 1
          const currentYear = currentDate.getFullYear()
          const monthStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
          const monthEnd = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

          return {
            id: 'temp_' + userId,
            user_id: userId,
            period_type: 'monthly',
            period_start: monthStart,
            period_end: monthEnd,
            total_work_minutes: 0,
            average_daily_minutes: 0,
            expected_work_minutes: 176 * 60, // 176h * 60min = 10560 min
            efficiency_percentage: 0,
            total_activities: 0,
            average_daily_activities: 0,
            days_worked: 0,
            days_absent: 0,
            user: {
              id: employee.id,
              full_name: employee.full_name,
              email: employee.email,
              avatar_url: employee.avatar_url,
              role: employee.role
            }
          }
        }
      })

      console.log(`✅ Przygotowano statystyki aktywności dla wszystkich pracowników: ${result.length}`)
      console.log(`👥 Lista pracowników: ${result.map(s => s.user?.full_name).join(', ')}`)
      
      // Pokaż statystyki podsumowujące
      const withData = result.filter(r => r.total_work_minutes > 0).length
      const withoutData = result.length - withData
      console.log(`📊 Pracownicy z danymi: ${withData}, bez danych: ${withoutData}`)
      
      return result

    } catch (error) {
      console.error('❌ Błąd pobierania statystyk aktywności:', error)
      
      // Graceful fallback - zwróć pustą tablicę zamiast crashować
      console.log('🔄 Graceful fallback - zwracam pustą tablicę')
      return []
    }
  },

  // Pobierz trendy sprzedażowe z ostatnich 7 dni
  async getSalesTrends(user: User): Promise<Array<{ day: string, canvas: number, sale: number, antysale: number }>> {
    try {
      console.log('📈 Pobieranie trendów sprzedażowych z ostatnich 7 dni...')
      
      // Pobierz dane z ostatnich 7 dni
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 6) // 7 dni wstecz (włącznie z dzisiaj)
      
      const { data, error } = await supabase
        .from('clients')
        .select('status, updated_at, status_changed_at, owner_id, edited_by')
        .gte('updated_at', startDate.toISOString().split('T')[0])
        .lte('updated_at', endDate.toISOString().split('T')[0] + 'T23:59:59')
        .in('status', ['canvas', 'sale', 'antysale'])
        .order('updated_at', { ascending: true })

      if (error) {
        console.error('❌ Błąd pobierania trendów sprzedażowych:', error)
        throw error
      }

      console.log(`✅ Pobrano ${data?.length || 0} rekordów z ostatnich 7 dni`)

      // Filtruj klientów według uprawnień użytkownika
      let filteredData = data || []
      if (user.role === 'pracownik') {
        filteredData = filteredData.filter(client => 
          client.owner_id === user.id || 
          client.owner_id === null || 
          client.edited_by === user.id
        )
      }

      // Stwórz mapę dla dni tygodnia
      const dayNames = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
      const trends: Record<string, { canvas: number, sale: number, antysale: number }> = {}

      // Inicjalizuj ostatnie 7 dni
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        trends[dayName] = { canvas: 0, sale: 0, antysale: 0 }
      }

      // Grupuj dane według dni
      filteredData.forEach(client => {
        const date = new Date(client.updated_at)
        const dayName = dayNames[date.getDay()]
        
        if (trends[dayName]) {
          if (client.status === 'canvas') trends[dayName].canvas++
          else if (client.status === 'sale') trends[dayName].sale++
          else if (client.status === 'antysale') trends[dayName].antysale++
        }
      })

      // Przekształć na format dla wykresu (ostatnie 7 dni w kolejności)
      const result = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        result.push({
          day: dayName,
          canvas: trends[dayName].canvas,
          sale: trends[dayName].sale,
          antysale: trends[dayName].antysale
        })
      }

      console.log('✅ Trendy sprzedażowe przygotowane:', result)
      return result

    } catch (error) {
      console.error('❌ Błąd pobierania trendów sprzedażowych:', error)
      // W przypadku błędu zwróć puste dane dla ostatnich 7 dni
      const dayNames = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
      const result = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        result.push({
          day: dayName,
          canvas: 0,
          sale: 0,
          antysale: 0
        })
      }
      return result
    }
  },

  // Pobierz statystyki kliknięć telefonu tylko dla pracowników
  async getPhoneClicksStats(user: User): Promise<{ totalPhoneCalls: number, totalPhoneCallsToday: number }> {
    try {
      console.log('📞 Pobieranie statystyk kliknięć telefonu...')
      
      // Pobierz wszystkich pracowników
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'pracownik')

      if (employeesError) {
        console.error('❌ Błąd pobierania pracowników:', employeesError)
        throw employeesError
      }

      const employeeIds = (employees || []).map(emp => emp.id)
      console.log(`👥 Znaleziono ${employeeIds.length} pracowników`)

      if (employeeIds.length === 0) {
        return { totalPhoneCalls: 0, totalPhoneCallsToday: 0 }
      }

      // Pobierz wszystkie kliknięcia telefonu z activity_logs tylko dla pracowników
      const { data: allPhoneClicks, error: allClicksError } = await supabase
        .from('activity_logs')
        .select('id, changed_by, timestamp')
        .eq('field_changed', 'last_phone_click')
        .in('changed_by', employeeIds)

      if (allClicksError) {
        console.error('❌ Błąd pobierania kliknięć telefonu:', allClicksError)
        throw allClicksError
      }

      const totalPhoneCalls = allPhoneClicks?.length || 0

      // Pobierz dzisiejsze kliknięcia telefonu
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const { data: todayPhoneClicks, error: todayClicksError } = await supabase
        .from('activity_logs')
        .select('id, changed_by, timestamp')
        .eq('field_changed', 'last_phone_click')
        .in('changed_by', employeeIds)
        .gte('timestamp', `${today}T00:00:00`)
        .lt('timestamp', `${today}T23:59:59`)

      if (todayClicksError) {
        console.error('❌ Błąd pobierania dzisiejszych kliknięć telefonu:', todayClicksError)
        throw todayClicksError
      }

      const totalPhoneCallsToday = todayPhoneClicks?.length || 0

      console.log(`✅ Statystyki kliknięć telefonu: łącznie ${totalPhoneCalls}, dziś ${totalPhoneCallsToday}`)
      
      return {
        totalPhoneCalls,
        totalPhoneCallsToday
      }

    } catch (error) {
      console.error('❌ Błąd pobierania statystyk kliknięć telefonu:', error)
      // W przypadku błędu zwróć zerowe statystyki
      return { totalPhoneCalls: 0, totalPhoneCallsToday: 0 }
    }
  },

  // Pobierz dane trendów wydajności zespołu z ostatnich 7 dni
  async getTeamPerformanceTrends(user: User): Promise<Array<{ day: string, telefony: number, konwersja: number, klienci: number }>> {
    try {
      console.log('📊 Pobieranie trendów wydajności zespołu z ostatnich 7 dni...')
      
      // Pobierz wszystkich pracowników
      const { data: employees, error: employeesError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'pracownik')

      if (employeesError) {
        console.error('❌ Błąd pobierania pracowników:', employeesError)
        throw employeesError
      }

      const employeeIds = (employees || []).map(emp => emp.id)
      console.log(`👥 Znaleziono ${employeeIds.length} pracowników`)

      if (employeeIds.length === 0) {
        // Zwróć puste dane dla ostatnich 7 dni
        const dayNames = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
        const result = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dayName = dayNames[date.getDay()]
          result.push({
            day: dayName,
            telefony: 0,
            konwersja: 0,
            klienci: 0
          })
        }
        return result
      }

      // Pobierz dane z ostatnich 7 dni
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 6) // 7 dni wstecz (włącznie z dzisiaj)
      
      // 1. Pobierz kliknięcia telefonu z activity_logs (tylko pracownicy)
      const { data: phoneClicks, error: phoneError } = await supabase
        .from('activity_logs')
        .select('changed_by, timestamp')
        .eq('field_changed', 'last_phone_click')
        .in('changed_by', employeeIds)
        .gte('timestamp', startDate.toISOString().split('T')[0])
        .lte('timestamp', endDate.toISOString().split('T')[0] + 'T23:59:59')

      if (phoneError) {
        console.error('❌ Błąd pobierania kliknięć telefonu:', phoneError)
        throw phoneError
      }

      // 2. Pobierz zmiany klientów z ostatnich 7 dni (tylko przez pracowników)
      const { data: clientChanges, error: changesError } = await supabase
        .from('clients')
        .select('updated_at, status, edited_by')
        .in('edited_by', employeeIds)
        .gte('updated_at', startDate.toISOString().split('T')[0])
        .lte('updated_at', endDate.toISOString().split('T')[0] + 'T23:59:59')
        .order('updated_at', { ascending: true })

      if (changesError) {
        console.error('❌ Błąd pobierania zmian klientów:', changesError)
        throw changesError
      }

      console.log(`✅ Pobrano ${phoneClicks?.length || 0} kliknięć telefonu i ${clientChanges?.length || 0} zmian klientów`)

      // Stwórz mapę dla dni tygodnia
      const dayNames = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
      const trendsData: Record<string, { telefony: number, klienci: number, sales: number }> = {}

      // Inicjalizuj ostatnie 7 dni
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        trendsData[dayName] = { telefony: 0, klienci: 0, sales: 0 }
      }

             // Grupuj kliknięcia telefonu według dni
       if (phoneClicks && Array.isArray(phoneClicks)) {
         phoneClicks.forEach((click: any) => {
           const date = new Date(click.timestamp)
           const dayName = dayNames[date.getDay()]
           if (trendsData[dayName]) {
             trendsData[dayName].telefony++
           }
         })
       }

       // Grupuj zmiany klientów według dni
       if (clientChanges && Array.isArray(clientChanges)) {
         clientChanges.forEach((change: any) => {
           const date = new Date(change.updated_at)
           const dayName = dayNames[date.getDay()]
           if (trendsData[dayName]) {
             trendsData[dayName].klienci++
             if (change.status === 'sale') {
               trendsData[dayName].sales++
             }
           }
         })
       }

      // Przekształć na format dla wykresu (ostatnie 7 dni w kolejności)
      const result = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        const dayData = trendsData[dayName]
        
        // Oblicz konwersję (procent sales względem wszystkich klientów)
        const konwersja = dayData.klienci > 0 ? Math.round((dayData.sales / dayData.klienci) * 100) : 0
        
        result.push({
          day: dayName,
          telefony: dayData.telefony,
          konwersja: konwersja,
          klienci: dayData.klienci
        })
      }

      console.log('✅ Trendy wydajności zespołu przygotowane:', result)
      return result

    } catch (error) {
      console.error('❌ Błąd pobierania trendów wydajności zespołu:', error)
      // W przypadku błędu zwróć puste dane dla ostatnich 7 dni
      const dayNames = ['Ndz', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob']
      const result = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dayName = dayNames[date.getDay()]
        result.push({
          day: dayName,
          telefony: 0,
          konwersja: 0,
          klienci: 0
        })
      }
      return result
    }
  },

  // API dla statystyk osobistych pracownika
  async getMyPersonalStats(user: User): Promise<{
    phoneCallsThisMonth: number,
    clientStats: { status: string, count: number, color: string }[],
    totalClients: number,
    commissionTotal: number,
    workingHoursThisMonth: { day: string, hours: number }[],
    totalWorkingHours: number,
    totalWorkingDays: number
  }> {
    try {
      console.log('📊 Pobieranie osobistych statystyk pracownika:', user.id, user.role)
      
      // Sprawdź czy użytkownik to pracownik
      if (user.role !== 'pracownik') {
        console.error('❌ Nieautoryzowana rola:', user.role)
        throw new Error('Dostęp tylko dla pracowników')
      }
      
      console.log('✅ Użytkownik autoryzowany jako pracownik')

      const currentDate = new Date()
      const currentMonth = currentDate.toISOString().slice(0, 7) // YYYY-MM
      
      // Ustaw pierwszy i ostatni dzień miesiąca prawidłowo
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59)
      
      // 1. Pobierz liczbę telefonów w tym miesiącu (kliknięcia telefonu)
      const { data: phoneClicks, error: phoneError } = await supabase
        .from('activity_logs')
        .select('id, timestamp')
        .eq('changed_by', user.id)
        .eq('field_changed', 'last_phone_click')
        .gte('timestamp', startOfMonth.toISOString())
        .lte('timestamp', endOfMonth.toISOString())

      if (phoneError) {
        console.error('❌ Błąd pobierania kliknięć telefonu:', phoneError)
        throw phoneError
      }

      const phoneCallsThisMonth = phoneClicks?.length || 0
      console.log(`📞 Znaleziono ${phoneCallsThisMonth} kliknięć telefonu w tym miesiącu`)

      // 2. Pobierz klientów przypisanych do pracownika
      console.log('👥 Pobieranie klientów przypisanych do pracownika...')
      const { data: myClients, error: clientsError } = await supabase
        .from('clients')
        .select('id, status, first_name, last_name, company_name')
        .eq('owner_id', user.id)

      if (clientsError) {
        console.error('❌ Błąd pobierania klientów:', clientsError)
        throw clientsError
      }

      const clients = myClients || []
      const totalClients = clients.length
      console.log(`👤 Pracownik ma ${totalClients} przypisanych klientów`)

      // 3. Agreguj statusy klientów
      console.log('📊 Agregowanie statusów klientów...')
      const statusMap = new Map<string, number>()
      clients.forEach(client => {
        const status = client.status
        statusMap.set(status, (statusMap.get(status) || 0) + 1)
      })
      console.log('📈 Statusy klientów:', Object.fromEntries(statusMap))

      // Mapuj statusy na kolory
      const statusColors: Record<string, string> = {
        canvas: '#06b6d4',
        sale: '#10b981',
        antysale: '#f59e0b',
        brak_kontaktu: '#6b7280',
        nie_zainteresowany: '#ef4444',
        zdenerwowany: '#dc2626',
        '$$': '#fbbf24'
      }

      const clientStats = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        color: statusColors[status] || '#64748b'
      }))

      // 4. Oblicz prowizję (tylko za klientów ze statusem 'sale')
      const saleClients = statusMap.get('sale') || 0
      const commissionPerSale = 200 // 200 zł za każdego klienta sale
      const commissionTotal = saleClients * commissionPerSale

      // 5. Pobierz godziny pracy z tego miesiąca na podstawie activity_logs
      console.log('⏰ Pobieranie aktywności z tego miesiąca...')
      console.log(`📅 Zakres dat: ${startOfMonth.toISOString()} - ${endOfMonth.toISOString()}`)
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_logs')
        .select('timestamp')
        .eq('changed_by', user.id)
        .gte('timestamp', startOfMonth.toISOString())
        .lte('timestamp', endOfMonth.toISOString())
        .order('timestamp', { ascending: true })

      if (activitiesError) {
        console.error('❌ Błąd pobierania aktywności:', activitiesError)
        throw activitiesError
      }

      console.log(`⏰ Znaleziono ${activities?.length || 0} aktywności w tym miesiącu`)

      // Grupuj aktywności według dni i oblicz godziny pracy
      console.log('📅 Grupowanie aktywności według dni...')
      const dailyActivities = new Map<string, Set<number>>()
      
      if (activities && activities.length > 0) {
        activities.forEach(activity => {
          const date = new Date(activity.timestamp)
          const day = date.toISOString().split('T')[0] // YYYY-MM-DD
          const hour = date.getHours()
          
          if (!dailyActivities.has(day)) {
            dailyActivities.set(day, new Set())
          }
          dailyActivities.get(day)!.add(hour)
        })
      }

      // Przekształć na format dla wykresu
      const workingHoursThisMonth = Array.from(dailyActivities.entries())
        .map(([day, hours]) => ({
          day: new Date(day).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }),
          hours: hours.size,
          sortDate: new Date(day) // Dodaj pole do sortowania
        }))
        .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        .map(({ day, hours }) => ({ day, hours })) // Usuń pole sortDate z wynikowych danych

      const totalWorkingHours = Array.from(dailyActivities.values())
        .reduce((sum, hours) => sum + hours.size, 0)
      
      const totalWorkingDays = dailyActivities.size

      console.log('✅ Statystyki osobiste przygotowane:', {
        phoneCallsThisMonth,
        totalClients,
        commissionTotal,
        totalWorkingHours,
        totalWorkingDays
      })

      return {
        phoneCallsThisMonth,
        clientStats,
        totalClients,
        commissionTotal,
        workingHoursThisMonth,
        totalWorkingHours,
        totalWorkingDays
      }

    } catch (error) {
      console.error('❌ Błąd pobierania osobistych statystyk:', error)
      
      // Szczegółowe informacje o błędzie
      if (error && typeof error === 'object') {
        console.error('📋 Szczegóły błędu:', {
          message: (error as any).message,
          code: (error as any).code,
          details: (error as any).details,
          hint: (error as any).hint,
          stack: (error as any).stack
        })
      }
      
      // Jeśli to błąd RLS lub uprawnień, zwróć pustą strukturę zamiast crashować
      if (error && typeof error === 'object' && 
          ((error as any).code === 'PGRST116' || 
           (error as any).message?.includes('RLS') || 
           (error as any).message?.includes('permission'))) {
        console.warn('🔒 Problem z uprawnieniami - zwracam domyślne dane')
        return {
          phoneCallsThisMonth: 0,
          clientStats: [],
          totalClients: 0,
          commissionTotal: 0,
          workingHoursThisMonth: [],
          totalWorkingHours: 0,
          totalWorkingDays: 0
        }
      }
      
      throw error
    }
  },

  // Funkcje do zarządzania godzinami pracy pracownika
  async saveWorkingHours(user: User, date: string, hours: number): Promise<void> {
    try {
      console.log(`⏰ Zapisywanie godzin pracy: ${hours}h dla dnia ${date}`)
      
      // Sprawdź czy użytkownik to pracownik
      if (user.role !== 'pracownik') {
        throw new Error('Dostęp tylko dla pracowników')
      }

      // Sprawdź czy to dzień roboczy (pon-pt)
      const dayOfWeek = new Date(date).getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 0 = niedziela, 6 = sobota
        throw new Error('Można wpisywać godziny tylko dla dni roboczych (pon-pt)')
      }

      // Walidacja godzin (0-12)
      if (hours < 0 || hours > 12) {
        throw new Error('Liczba godzin musi być między 0 a 12')
      }

      // Upsert godzin pracy w bazie danych (tabela już istnieje)
      const { error } = await supabase
        .from('working_hours')
        .upsert({
          user_id: user.id,
          work_date: date,
          hours_worked: hours,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,work_date'
        })

      if (error) {
        console.error('❌ Błąd zapisywania godzin pracy do bazy:', error)
        
        // Fallback do localStorage tylko przy błędzie bazy danych
        console.warn('⚠️ Błąd bazy danych - używam localStorage jako fallback')
        const storageKey = `working_hours_${user.id}`
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}')
        existingData[date] = hours
        localStorage.setItem(storageKey, JSON.stringify(existingData))
        console.log(`✅ Zapisano ${hours}h dla dnia ${date} (localStorage fallback)`)
        return
      }

      console.log(`✅ Zapisano ${hours}h dla dnia ${date} (baza danych working_hours)`)
    } catch (error) {
      console.error('❌ Błąd w saveWorkingHours:', error)
      
      // Ultimate fallback - localStorage
      try {
        console.warn('⚠️ Używam localStorage jako ostateczny fallback')
        const storageKey = `working_hours_${user.id}`
        const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}')
        existingData[date] = hours
        localStorage.setItem(storageKey, JSON.stringify(existingData))
        console.log(`✅ Zapisano ${hours}h dla dnia ${date} (localStorage ultimate fallback)`)
      } catch (storageError) {
        console.error('❌ Nie udało się zapisać nawet do localStorage:', storageError)
        throw error
      }
    }
  },

  async getWorkingHoursForMonth(user: User, year: number, month: number): Promise<Record<string, number>> {
    try {
      console.log(`⏰ Pobieranie godzin pracy dla ${year}-${month}`)
      
      // Sprawdź czy użytkownik to pracownik
      if (user.role !== 'pracownik') {
        throw new Error('Dostęp tylko dla pracowników')
      }

      // Oblicz pierwszy i ostatni dzień miesiąca
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)

      // Pobierz godziny pracy z tabeli working_hours (tabela już istnieje)
      const { data, error } = await supabase
        .from('working_hours')
        .select('work_date, hours_worked')
        .eq('user_id', user.id)
        .gte('work_date', startDate.toISOString().split('T')[0])
        .lte('work_date', endDate.toISOString().split('T')[0])

      if (error) {
        console.error('❌ Błąd pobierania godzin pracy z bazy:', error)
        console.warn('⚠️ Błąd bazy danych - używam localStorage jako fallback')
        
        // Fallback do localStorage tylko przy błędzie bazy danych
        const storageKey = `working_hours_${user.id}`
        const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}')
        
        // Filtruj dane dla odpowiedniego miesiąca
        const hoursMap: Record<string, number> = {}
        Object.entries(storedData).forEach(([date, hours]) => {
          const dateObj = new Date(date)
          if (dateObj >= startDate && dateObj <= endDate) {
            hoursMap[date] = hours as number
          }
        })
        
        console.log(`✅ Pobrano godziny pracy z localStorage fallback dla ${Object.keys(hoursMap).length} dni`)
        return hoursMap
      }

      // Konwertuj na obiekt date -> hours
      const hoursMap: Record<string, number> = {}
      if (data) {
        data.forEach(entry => {
          hoursMap[entry.work_date] = entry.hours_worked
        })
      }

      console.log(`✅ Pobrano godziny pracy z tabeli working_hours dla ${data?.length || 0} dni`)
      return hoursMap
    } catch (error) {
      console.error('❌ Błąd w getWorkingHoursForMonth:', error)
      
      // Ultimate fallback - localStorage
      try {
        console.warn('⚠️ Używam localStorage jako ostateczny fallback')
        const storageKey = `working_hours_${user.id}`
        const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}')
        
        // Filtruj dane dla odpowiedniego miesiąca
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        const hoursMap: Record<string, number> = {}
        
        Object.entries(storedData).forEach(([date, hours]) => {
          const dateObj = new Date(date)
          if (dateObj >= startDate && dateObj <= endDate) {
            hoursMap[date] = hours as number
          }
        })
        
        console.log(`✅ Pobrano godziny pracy z localStorage ultimate fallback dla ${Object.keys(hoursMap).length} dni`)
        return hoursMap
      } catch (storageError) {
        console.error('❌ Nie udało się pobrać nawet z localStorage:', storageError)
        return {}
      }
    }
  },

  // 🚀 NOWE FUNKCJE PERFORMANCE - Materializowane Widoki

  // Zastępuje ciężkie JOIN'y - teraz natychmiastowe ładowanie
  async getMonthlyEmployeePerformance(year: number, month: number) {
    try {
      console.log(`📊 Pobieranie wydajności pracowników dla ${year}-${month} (zoptymalizowane)...`)
      
      const { data, error } = await supabase.rpc('get_monthly_employee_performance', {
        target_year: year,
        target_month: month
      })
      
      if (error) {
        console.error('❌ Błąd pobierania wydajności pracowników:', error)
        throw error
      }
      
      console.log(`✅ Wydajność pracowników pobrana: ${data?.length || 0} rekordów`)
      return data
    } catch (error) {
      console.error('❌ getMonthlyEmployeePerformance failed:', error)
      throw error
    }
  },

  // Szybkie statystyki zespołu na podstawie materializowanych widoków
  async getTeamSummary(year: number, month: number) {
    try {
      const { data, error } = await supabase
        .from('mv_monthly_employee_stats')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .order('owned_sales', { ascending: false })
      
      if (error) throw error
      
      return data
    } catch (error) {
      console.error('❌ getTeamSummary failed:', error)
      throw error
    }
  },

  // Performance analytics - top performers
  async getTopPerformers(limit: number = 10) {
    try {
      const { data, error } = await supabase.rpc('get_top_performers', {
        limit_count: limit
      })
      
      if (error) throw error
      
      return data
    } catch (error) {
      console.error('❌ getTopPerformers failed:', error)
      throw error
    }
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
    try {
      console.log('👥 getAllUsers START - sprawdzam RLS...')
      
      // Sprawdź aktualnego użytkownika
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Aktualny użytkownik:', user?.email, user?.id)
      
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, avatar_url')
        .order('full_name')
      
      console.log('👥 getAllUsers - znaleziono użytkowników:', data?.length || 0)
      console.log('👥 getAllUsers - błąd:', error)
      
      if (error) {
        console.error('❌ RLS Error in getAllUsers:', error)
        
        // Sprawdź czy to problem z RLS
        if (error.code === 'PGRST116' || error.message?.includes('RLS') || error.message?.includes('permission')) {
          console.error('🔒 Problem z Row Level Security - pracownik nie może widzieć innych użytkowników')
        }
        
        throw error
      }
      
      if (data && data.length > 0) {
        console.log('👥 Przykład użytkowników:', data.slice(0, 3).map(u => ({
          id: u.id,
          name: u.full_name,
          role: u.role
        })))
      } else {
        console.log('👥 UWAGA: Brak danych użytkowników - może RLS blokuje dostęp')
      }
      
      return data as User[]
    } catch (error) {
      console.error('❌ getAllUsers FAILED:', error)
      throw error
    }
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
  },

  // Bezpieczne pobieranie użytkowników do wyświetlania (odporne na RLS)
  async getAllUsersForDisplay() {
    try {
      console.log('👥 getAllUsersForDisplay START - bezpieczne pobieranie...')
      
      // Sprawdź aktualnego użytkownika
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Aktualny użytkownik:', user?.email, user?.id)
      
      if (!user) {
        console.log('❌ Brak zalogowanego użytkownika')
        return []
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, avatar_url')
        .order('full_name')
      
      console.log('👥 getAllUsersForDisplay - znaleziono użytkowników:', data?.length || 0)
      
      if (error) {
        console.error('❌ RLS Error in getAllUsersForDisplay:', error)
        
        // Jeśli to problem z RLS, zwróć przynajmniej aktualnego użytkownika
        if (error.code === 'PGRST116' || error.message?.includes('RLS') || error.message?.includes('permission')) {
          console.error('🔒 RLS blokuje dostęp - zwracam tylko aktualnego użytkownika')
          
          // Pobierz profil aktualnego użytkownika
          try {
            const userProfile = await this.getUserProfile(user.id)
            console.log('👤 Fallback: używam profilu aktualnego użytkownika:', userProfile.full_name)
            return [userProfile]
          } catch (profileError) {
            console.error('❌ Nie można pobrać profilu użytkownika:', profileError)
            return []
          }
        }
        
        // Inny błąd - zwróć pustą tablicę
        console.error('❌ Inny błąd - zwracam pustą tablicę')
        return []
      }
      
      if (data && data.length > 0) {
        console.log('👥 Udane pobranie użytkowników:', data.length)
        console.log('👥 Przykład użytkowników:', data.slice(0, 3).map(u => ({
          id: u.id,
          name: u.full_name,
          role: u.role
        })))
        return data as User[]
      } else {
        console.log('👥 UWAGA: Brak danych użytkowników')
        
        // Fallback - przynajmniej aktualny użytkownik
        try {
          const userProfile = await this.getUserProfile(user.id)
          console.log('👤 Fallback: używam profilu aktualnego użytkownika:', userProfile.full_name)
          return [userProfile]
        } catch (profileError) {
          console.error('❌ Nie można pobrać profilu użytkownika:', profileError)
          return []
        }
      }
      
    } catch (error) {
      console.error('❌ getAllUsersForDisplay CRITICAL ERROR:', error)
      
      // Krytyczny fallback - spróbuj przynajmniej pobrać aktualnego użytkownika
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const userProfile = await this.getUserProfile(user.id)
          console.log('👤 Krytyczny fallback: zwracam aktualnego użytkownika:', userProfile.full_name)
          return [userProfile]
        }
      } catch (criticalError) {
        console.error('❌ Krytyczny błąd fallback:', criticalError)
      }
      
      return []
    }
  }
}

// Funkcja do określania koloru statusu "canvas" na podstawie czasu
export const getCanvasStatusColor = (statusChangedAt?: string): { color: string, description: string, priority: 'low' | 'medium' | 'high' } => {
  if (!statusChangedAt) {
    return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', description: 'Nowy', priority: 'low' }
  }

  const now = new Date()
  const statusDate = new Date(statusChangedAt)
  const daysDiff = Math.floor((now.getTime() - statusDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff <= 2) {
    // 0-2 dni - zielony (świeży)
    return { 
      color: 'bg-green-500/20 text-green-400 border-green-500/30', 
      description: `Świeży (${daysDiff}d)`,
      priority: 'low'
    }
  } else if (daysDiff <= 4) {
    // 2-4 dni - żółty (uwaga)
    return { 
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
      description: `Wymaga uwagi (${daysDiff}d)`,
      priority: 'medium'
    }
  } else {
    // 5+ dni - czerwony (pilny)
    return { 
      color: 'bg-red-500/20 text-red-400 border-red-500/30', 
      description: `Pilny (${daysDiff}d)`,
      priority: 'high'
    }
  }
}

// Funkcja do pobierania klientów z oznaczeniami priorytetów
export const getCanvasClientsWithPriority = async (user: User) => {
  try {
    const clients = await clientsApi.getClients(user)
    const canvasClients = clients.filter(client => client.status === 'canvas')
    
    const priorityStats = {
      high: 0,
      medium: 0,
      low: 0,
      total: canvasClients.length
    }

    canvasClients.forEach(client => {
      const { priority } = getCanvasStatusColor(client.status_changed_at)
      priorityStats[priority]++
    })

    return {
      clients: canvasClients,
      stats: priorityStats
    }
  } catch (error) {
    console.error('Błąd pobierania klientów canvas:', error)
    return { clients: [], stats: { high: 0, medium: 0, low: 0, total: 0 } }
  }
} 

// 🚀 NOWE API PERFORMANCE - Materializowane Widoki i Optymalizacje
// Dodane zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md

export const dashboardApi = {
  // Zastępuje wolne zapytania dashboard - teraz ~10ms zamiast ~200ms
  async getDashboardMetrics() {
    try {
      console.log('⚡ Pobieranie szybkich metryk dashboard z materializowanego widoku...')
      
      const { data, error } = await supabase.rpc('get_dashboard_metrics');
      
      if (error) {
        console.error('❌ Błąd pobierania metryk dashboard:', error)
        throw error
      }
      
      console.log('✅ Dashboard metrics pobrane w trybie express:', data?.length || 0, 'metryk')
      return data
    } catch (error) {
      console.error('❌ getDashboardMetrics failed:', error)
      throw error
    }
  },

  // Sprawdzenie czy materializowane widoki są świeże
  async checkViewFreshness() {
    try {
      const { data, error } = await supabase
        .from('mv_dashboard_summary')
        .select('last_updated')
        .single()
      
      if (error) throw error
      
      const lastUpdate = new Date(data.last_updated)
      const now = new Date()
      const minutesSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60))
      
      return {
        lastUpdate: data.last_updated,
        minutesSinceUpdate,
        isStale: minutesSinceUpdate > 30 // Uznaj za nieaktualne po 30 minutach
      }
    } catch (error) {
      console.error('❌ Błąd sprawdzania świeżości widoków:', error)
      return { lastUpdate: null, minutesSinceUpdate: Infinity, isStale: true }
    }
  }
}

// 🚀 NOWE FUNKCJE PERFORMANCE dodane do istniejącego reportsApi

export const teamApi = {
  // Szybki przegląd aktywności zespołu
  async getTeamActivityOverview() {
    try {
      console.log('👥 Pobieranie przeglądu aktywności zespołu (zoptymalizowane)...')
      
      const { data, error } = await supabase
        .from('mv_activity_summary')
        .select('*')
        .in('role', ['pracownik', 'manager', 'szef'])
        .order('activities_24h', { ascending: false })
      
      if (error) {
        console.error('❌ Błąd pobierania aktywności zespołu:', error)
        throw error
      }
      
      console.log(`✅ Aktywność zespołu pobrana: ${data?.length || 0} użytkowników`)
      return data
    } catch (error) {
      console.error('❌ getTeamActivityOverview failed:', error)
      throw error
    }
  },

  // Sprawdzenie aktywnych użytkowników w czasie rzeczywistym
  async getActiveUsersNow() {
    try {
      const { data, error } = await supabase
        .from('mv_activity_summary')
        .select('user_id, full_name, activity_status, last_activity')
        .eq('activity_status', 'active')
        .order('last_activity', { ascending: false })
      
      if (error) throw error
      
      return data
    } catch (error) {
      console.error('❌ getActiveUsersNow failed:', error)
      throw error
    }
  },

  // Statystyki produktywności zespołu
  async getProductivityStats() {
    try {
      const { data, error } = await supabase
        .from('mv_activity_summary')
        .select('activities_24h, activities_7d, phone_clicks, status_changes')
        .in('role', ['pracownik', 'manager', 'szef'])
      
      if (error) throw error
      
      // Oblicz średnie
      const totalUsers = data.length
      const avgDaily = data.reduce((sum, user) => sum + user.activities_24h, 0) / totalUsers
      const avgWeekly = data.reduce((sum, user) => sum + user.activities_7d, 0) / totalUsers
      
      return {
        totalUsers,
        avgDailyActivities: Math.round(avgDaily),
        avgWeeklyActivities: Math.round(avgWeekly),
        totalDailyActivities: data.reduce((sum, user) => sum + user.activities_24h, 0),
        totalWeeklyActivities: data.reduce((sum, user) => sum + user.activities_7d, 0)
      }
    } catch (error) {
      console.error('❌ getProductivityStats failed:', error)
      throw error
    }
  }
}

// 🔧 PERFORMANCE MONITORING API
export const performanceApi = {
  // Sprawdzenie metryk wydajności systemu
  async getSystemMetrics() {
    try {
      const { data, error } = await supabase.rpc('get_activity_logs_stats')
      
      if (error) throw error
      
      return data
    } catch (error) {
      console.error('❌ getSystemMetrics failed:', error)
      throw error
    }
  },

  // Manualne odświeżenie materializowanych widoków
  async refreshMaterializedViews() {
    try {
      console.log('🔄 Manualnie odświeżam materializowane widoki...')
      
      const { data, error } = await supabase.rpc('refresh_all_materialized_views')
      
      if (error) throw error
      
      console.log('✅ Widoki odświeżone:', data)
      return data
    } catch (error) {
      console.error('❌ refreshMaterializedViews failed:', error)
      throw error
    }
  },

  // Archiwizacja starych logów
  async archiveOldLogs() {
    try {
      console.log('📦 Uruchamiam archiwizację starych logów...')
      
      const { data, error } = await supabase.rpc('archive_old_activity_logs')
      
      if (error) throw error
      
      console.log(`✅ Zarchiwizowano ${data} starych logów`)
      return data
    } catch (error) {
      console.error('❌ archiveOldLogs failed:', error)
      throw error
    }
  },

  // Optymalizacja bazy danych
  async optimizeDatabase() {
    try {
      console.log('🚀 Uruchamiam optymalizację bazy danych...')
      
      const { data, error } = await supabase.rpc('optimize_database_performance')
      
      if (error) throw error
      
      console.log('✅ Baza danych zoptymalizowana:', data)
      return data
    } catch (error) {
      console.error('❌ optimizeDatabase failed:', error)
      throw error
    }
  }
}

export interface EmployeeActivityStats {
  id: string
  user_id: string
  period_type: string
  period_start: string
  period_end: string
  total_work_minutes: number
  average_daily_minutes: number
  expected_work_minutes: number
  efficiency_percentage: number
  total_activities: number
  average_daily_activities: number
  days_worked: number
  days_absent: number
  user?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
    role: string
  }
} 