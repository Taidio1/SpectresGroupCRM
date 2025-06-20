"use client"

import { useState, useEffect } from "react"
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  User,
  Phone,
  Mail,
  Building2,
  StickyNote,
  Eye,
  EyeOff,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/store/useStore"
import { clientsApi, permissionsApi, authApi, ClientWithReminder } from "@/lib/supabase"
import { ProtectedLayout } from "@/components/auth/protected-layout"

interface CalendarReminder {
  id: string
  client: ClientWithReminder
  date: string
  time: string
  note: string
  created_by: string
  created_by_name?: string
  created_by_avatar?: string
}

interface EmployeeFilter {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: string
  visible: boolean
  count: number
}

function CalendarContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Stan podstawowy
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [reminders, setReminders] = useState<CalendarReminder[]>([])
  const [filteredReminders, setFilteredReminders] = useState<CalendarReminder[]>([])
  
  // Filtry
  const [searchQuery, setSearchQuery] = useState('')
  const [employeeFilters, setEmployeeFilters] = useState<EmployeeFilter[]>([])
  const [showAllEmployees, setShowAllEmployees] = useState(true)
  
  // Stan UI
  const [refreshing, setRefreshing] = useState(false)
  
  // Sprawdź czy użytkownik może filtrować po pracownikach
  const canFilterByEmployee = user && ['manager', 'szef', 'admin'].includes(user.role)

  // Formatowanie daty dla API
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0] // YYYY-MM-DD
  }

  // Pobierz powiadomienia dla wybranej daty
  const loadReminders = async (targetDate?: Date) => {
    if (!user) return

    try {
      setLoading(true)
      const dateStr = targetDate ? formatDateForAPI(targetDate) : formatDateForAPI(selectedDate)
      
      console.log(`📅 Ładowanie przypomnień na: ${dateStr}`)
      
      // Pobierz klientów z przypomnieniami
      const clientsWithReminders = await clientsApi.getClientsWithReminders(user, dateStr)
      
      // Przekształć klientów na powiadomienia kalendarza
      const calendarReminders: CalendarReminder[] = clientsWithReminders
        .filter(client => client.reminder?.enabled)
        .map(client => ({
          id: `${client.id}_${client.reminder?.date}_${client.reminder?.time}`,
          client,
          date: client.reminder!.date,
          time: client.reminder!.time,
          note: client.reminder!.note,
          created_by: client.owner_id || client.edited_by || 'unknown',
          created_by_name: client.owner?.full_name || client.last_edited_by_name || 'Nieznany',
          created_by_avatar: client.owner?.avatar_url || client.last_edited_by_avatar_url
        }))
        .sort((a, b) => a.time.localeCompare(b.time))

      console.log(`✅ Załadowano ${calendarReminders.length} przypomnień`)
      
      setReminders(calendarReminders)
      
      // Przygotuj filtry pracowników (tylko dla manager+)
      if (canFilterByEmployee) {
        await setupEmployeeFilters(calendarReminders)
      }
      
    } catch (error) {
      console.error('❌ Błąd ładowania przypomnień:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się załadować przypomnień",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Przygotuj filtry pracowników
  const setupEmployeeFilters = async (calendarReminders: CalendarReminder[]) => {
    try {
      // Pobierz wszystkich użytkowników
      const allUsers = await authApi.getAllUsers()
      
      // Policz powiadomienia dla każdego użytkownika
      const userCounts = calendarReminders.reduce((acc, reminder) => {
        const userId = reminder.created_by
        acc[userId] = (acc[userId] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      // Zachowaj poprzednie ustawienia widoczności
      const previousVisibilityMap = employeeFilters.reduce((acc, filter) => {
        acc[filter.id] = filter.visible
        return acc
      }, {} as Record<string, boolean>)
      
      // Przygotuj filtry tylko dla użytkowników z powiadomieniami
      const employeeFiltersData: EmployeeFilter[] = allUsers
        .filter(user => userCounts[user.id] > 0)
        .map(user => ({
          id: user.id,
          name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
          role: user.role,
          visible: previousVisibilityMap[user.id] !== undefined ? previousVisibilityMap[user.id] : true,
          count: userCounts[user.id] || 0
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      
      setEmployeeFilters(employeeFiltersData)
      
    } catch (error) {
      console.error('❌ Błąd przygotowywania filtrów pracowników:', error)
    }
  }

  // Filtruj powiadomienia
  const filterReminders = () => {
    let filtered = [...reminders]
    
    // Filtruj po wyszukiwaniu
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(reminder => 
        reminder.client.first_name.toLowerCase().includes(query) ||
        reminder.client.last_name.toLowerCase().includes(query) ||
        reminder.client.company_name.toLowerCase().includes(query) ||
        reminder.note.toLowerCase().includes(query) ||
        reminder.created_by_name?.toLowerCase().includes(query)
      )
    }
    
    // Filtruj po pracownikach (tylko dla manager+)
    if (canFilterByEmployee && !showAllEmployees) {
      const visibleEmployeeIds = employeeFilters
        .filter(filter => filter.visible)
        .map(filter => filter.id)
      
      // Filtruj tylko jeśli są jacyś widoczni pracownicy
      if (visibleEmployeeIds.length > 0) {
        filtered = filtered.filter(reminder => 
          visibleEmployeeIds.includes(reminder.created_by)
        )
      }
    }
    
    setFilteredReminders(filtered)
  }

  // Obsługa zmiany daty
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      // Resetuj filtry przy zmianie daty, żeby uniknąć ukrywania powiadomień
      setShowAllEmployees(true)
      loadReminders(date)
    }
  }

  // Obsługa odświeżania
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadReminders()
    setRefreshing(false)
    
    toast({
      title: "Odświeżono",
      description: "Powiadomienia zostały zaktualizowane",
    })
  }

  // Przełącz widoczność pracownika
  const toggleEmployeeVisibility = (employeeId: string) => {
    setEmployeeFilters(prev => 
      prev.map(filter => 
        filter.id === employeeId 
          ? { ...filter, visible: !filter.visible }
          : filter
      )
    )
  }

  // Przełącz wszystkich pracowników
  const toggleAllEmployees = () => {
    const newShowAll = !showAllEmployees
    setShowAllEmployees(newShowAll)
    
    if (newShowAll) {
      // Pokaż wszystkich
      setEmployeeFilters(prev => 
        prev.map(filter => ({ ...filter, visible: true }))
      )
    }
  }

  // Formatuj czas
  const formatTime = (time: string) => {
    return time.slice(0, 5) // HH:MM
  }

  // Pobierz kolor statusu
  const getStatusColor = (status: string) => {
    const colors = {
      'canvas': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'brak_kontaktu': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      'nie_zainteresowany': 'bg-red-500/20 text-red-400 border-red-500/30',
      'zdenerwowany': 'bg-red-600/20 text-red-300 border-red-600/30',
      'antysale': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'sale': 'bg-green-500/20 text-green-400 border-green-500/30',
      '$$': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    }
    return colors[status as keyof typeof colors] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }

  // Pobierz kolor roli
  const getRoleColor = (role: string) => {
    const colors = {
      'admin': 'bg-red-500/20 text-red-400',
      'szef': 'bg-purple-500/20 text-purple-400',
      'manager': 'bg-blue-500/20 text-blue-400',
      'pracownik': 'bg-green-500/20 text-green-400',
    }
    return colors[role as keyof typeof colors] || 'bg-slate-500/20 text-slate-400'
  }

  // Załaduj dane przy pierwszym renderze
  useEffect(() => {
    if (user) {
      loadReminders()
    }
  }, [user])

  // Filtruj powiadomienia przy zmianie filtrów
  useEffect(() => {
    filterReminders()
  }, [reminders, searchQuery, employeeFilters, showAllEmployees])

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Ładowanie...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Przycisk odświeżania i info o dacie */}
      <div className="flex items-center justify-between">
        <div className="text-slate-400">
          {user.role === 'pracownik' 
            ? 'Twoje zaplanowane powiadomienia' 
            : 'Powiadomienia zespołu'
          } na {selectedDate.toLocaleDateString('pl-PL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-slate-600 hover:bg-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Kalendarz i filtry */}
        <div className="col-span-4 space-y-4">
          {/* Kalendarz */}
          <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 shadow-xl backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-cyan-400" />
                Wybierz datę
              </CardTitle>
              <div className="text-sm text-slate-400">
                Aktualnie: {selectedDate.toLocaleDateString('pl-PL', { 
                  weekday: 'long', 
                  day: 'numeric', 
                  month: 'long',
                  year: 'numeric'
                })}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateChange}
                  className="w-full"
                  classNames={{
                    months: "flex flex-col space-y-4",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center text-white mb-4",
                    caption_label: "text-lg font-semibold text-slate-200",
                    nav: "space-x-1 flex items-center",
                    nav_button: "h-8 w-8 bg-slate-700/50 hover:bg-slate-600 border border-slate-600 rounded-lg p-0 transition-all duration-200 text-slate-400 hover:text-white shadow-sm hover:shadow-md",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse",
                    head_row: "flex mb-2",
                    head_cell: "text-slate-400 rounded-md w-10 h-8 font-medium text-xs flex items-center justify-center bg-slate-800/30",
                    row: "flex w-full",
                    cell: "flex-1 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: "h-10 w-10 mx-auto p-0 font-medium text-slate-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20 hover:text-white aria-selected:opacity-100 rounded-lg transition-all duration-200 border border-transparent hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10 leading-10 text-center",
                    day_selected: "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 focus:from-cyan-500 focus:to-blue-500 shadow-lg shadow-cyan-500/25 border-cyan-400/50",
                    day_today: "bg-slate-700/70 text-cyan-300 border-cyan-400/40 font-semibold shadow-sm",
                    day_outside: "text-slate-600 opacity-40 hover:opacity-60",
                    day_disabled: "text-slate-600 opacity-30 cursor-not-allowed hover:bg-transparent",
                    day_range_middle: "aria-selected:bg-slate-700 aria-selected:text-white",
                    day_hidden: "invisible",
                  }}
                />
              </div>
              
              {/* Legenda */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                    <span>Wybrana data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-slate-700 border border-cyan-400/40"></div>
                    <span>Dzisiaj</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filtry pracowników (tylko dla manager+) */}
          {canFilterByEmployee && employeeFilters.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Filtruj pracowników
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleAllEmployees}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    {showAllEmployees ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Ukryj niektóre
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Pokaż wszystkich
                      </>
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-48">
                  <div className="space-y-3">
                    {employeeFilters.map((employee) => (
                      <div key={employee.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={employee.visible}
                          onCheckedChange={() => toggleEmployeeVisibility(employee.id)}
                          className="border-slate-600"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Avatar className="h-6 w-6">
                            <AvatarImage 
                              src={employee.avatar_url || '/placeholder-user.jpg'} 
                              alt={employee.name}
                            />
                            <AvatarFallback className="bg-cyan-500 text-white text-xs">
                              {employee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={`employee-${employee.id}`}
                              className="text-slate-300 text-sm cursor-pointer truncate block"
                            >
                              {employee.name}
                            </Label>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getRoleColor(employee.role)}`}
                              >
                                {employee.role}
                              </Badge>
                              <span className="text-xs text-slate-500">
                                {employee.count} przypomnień
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Lista powiadomień */}
        <div className="col-span-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="h-5 w-5 text-cyan-400" />
                  Powiadomienia na {selectedDate.toLocaleDateString('pl-PL')}
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-slate-300 border-slate-600">
                    {filteredReminders.length} z {reminders.length}
                  </Badge>
                </div>
              </div>
              
              {/* Wyszukiwanie */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Szukaj po kliencie, firmie, notatce..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : filteredReminders.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <div className="text-center">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg mb-2">
                      {reminders.length === 0 
                        ? 'Brak powiadomień na ten dzień'
                        : 'Brak wyników wyszukiwania'
                      }
                    </p>
                    <p className="text-sm">
                      {reminders.length === 0 
                        ? 'Dodaj przypomnienia w sekcji Klienci'
                        : 'Spróbuj innych kryteriów wyszukiwania'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {filteredReminders.map((reminder) => (
                      <div 
                        key={reminder.id}
                        className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:bg-slate-700/70 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          {/* Informacje o czasie */}
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 bg-cyan-500/20 rounded-lg">
                              <Clock className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                              <div className="text-lg font-semibold text-white">
                                {formatTime(reminder.time)}
                              </div>
                              <div className="text-sm text-slate-400">
                                {reminder.client.first_name} {reminder.client.last_name}
                              </div>
                            </div>
                          </div>

                          {/* Status klienta */}
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(reminder.client.status)}
                          >
                            {reminder.client.status}
                          </Badge>
                        </div>

                        {/* Szczegóły klienta */}
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Building2 className="h-4 w-4 text-slate-400" />
                            {reminder.client.company_name}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-slate-300">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {reminder.client.phone}
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-slate-400" />
                              {reminder.client.email}
                            </div>
                          </div>

                          {/* Notatka przypomnienia */}
                          {reminder.note && (
                            <div className="flex items-start gap-2 text-sm">
                              <StickyNote className="h-4 w-4 text-orange-400 mt-0.5" />
                              <span className="text-orange-300">{reminder.note}</span>
                            </div>
                          )}

                          {/* Informacje o twórcy (tylko dla manager+) */}
                          {canFilterByEmployee && reminder.created_by_name && (
                            <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-600">
                              <User className="h-3 w-3" />
                              Utworzone przez: {reminder.created_by_name}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  return (
    <ProtectedLayout 
      title="Kalendarz Powiadomień" 
      subtitle="Zarządzaj przypomnieniami i terminami"
    >
      <CalendarContent />
    </ProtectedLayout>
  )
} 