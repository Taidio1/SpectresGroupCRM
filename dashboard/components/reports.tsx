"use client"

import { useState, useEffect } from "react"
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
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Award,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit,
  Save,
  X,
  DollarSign,
  Edit2,
  Info,
  Calculator,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useAuth } from "@/store/useStore"
import { reportsApi, type EmployeeStats, type EmployeeActivityStats } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { logger } from "@/lib/logger"

// Dane do raportów
const dailyStats = {
  totalClients: 24,
  statusBreakdown: {
    'canvas': 8,
    'sale': 6,
    'antysale': 4,
    'brak kontaktu': 3,
    'nie jest zainteresowany': 2,
    'zdenerwowany klient': 1,
  },
  employeeStats: {
    'admin': 8,
    'manager1': 6,
    'pracownik1': 5,
    'pracownik2': 5,
  }
}

const weeklyStats = {
  totalClients: 168,
  avgPerDay: 24,
  bestDay: 'Wtorek (32 klientów)',
  worstDay: 'Niedziela (12 klientów)',
}

// Dane do wykresów
const statusChartData = Object.entries(dailyStats.statusBreakdown).map(([status, count]) => ({
  name: status,
  value: count,
  color: status === 'canvas' ? '#06b6d4' :
    status === 'sale' ? '#10b981' :
      status === 'antysale' ? '#f59e0b' :
        status === 'brak kontaktu' ? '#6b7280' :
          status === 'nie jest zainteresowany' ? '#ef4444' : '#dc2626'
}))

const employeeChartData = Object.entries(dailyStats.employeeStats).map(([employee, count]) => ({
  name: employee,
  klienci: count,
}))

const weeklyTrendData = [
  { day: 'Pon', klienci: 28, rozmowy: 45, konwersja: 62 },
  { day: 'Wt', klienci: 32, rozmowy: 52, konwersja: 68 },
  { day: 'Śr', klienci: 24, rozmowy: 38, konwersja: 58 },
  { day: 'Czw', klienci: 29, rozmowy: 47, konwersja: 65 },
  { day: 'Pt', klienci: 26, rozmowy: 41, konwersja: 61 },
  { day: 'Sob', klienci: 17, rozmowy: 28, konwersja: 55 },
  { day: 'Nd', klienci: 12, rozmowy: 19, konwersja: 48 },
]

// Funkcja do obliczania dynamicznej prowizji na podstawie ilości klientów
const getDynamicCommissionRate = (clientsCount: number): number => {
  if (clientsCount >= 7) return 12
  if (clientsCount >= 5) return 9
  if (clientsCount >= 3) return 6
  return 3 // 0-2 klientów
}

// Funkcja do obliczania prowizji EUR na podstawie dynamicznej prowizji
const calculateCommissionEUR = (clientsCount: number, totalPaymentsEUR: number): number => {
  const commissionRate = getDynamicCommissionRate(clientsCount)
  // Oblicz prowizję jako procent od sumy wpłat w EUR (przykład: 2000 EUR x 3% = 60 EUR)
  return totalPaymentsEUR * commissionRate / 100
}

// Funkcja mapująca EmployeeStats na format używany przez komponent
const mapEmployeeStatsToDisplay = (stats: EmployeeStats[]) => {
  // Filtruj tylko te rekordy które mają prawidłowe dane użytkownika
  return stats
    .filter(stat => stat.user && stat.user.full_name) // Tylko z prawidłowymi danymi użytkownika
    .map(stat => {
      const clientsCount = stat.custom_clients_count || 0
      const totalPayments = stat.custom_total_payments || 0
      const dynamicCommissionRate = getDynamicCommissionRate(clientsCount)
      const dynamicCommissionEUR = calculateCommissionEUR(clientsCount, totalPayments)

      return {
        id: stat.id,
        user_id: stat.user_id,
        name: stat.user?.full_name || 'Brak danych',
        email: stat.user?.email || 'brak@email.com',
        role: stat.user?.role || 'pracownik',
        avatar: stat.user?.avatar_url || '/placeholder-user.jpg',
        // Dane dla prowizji z bazy danych - z priorytetem custom pól
        dailyTarget: stat.daily_target,
        dailyAchieved: stat.daily_achieved || 0,
        yesterdayShortage: stat.yesterday_shortage || 0,
        monthlyCanvas: stat.monthly_canvas || 0,
        monthlyAntysale: stat.monthly_antysale || 0,
        monthlySale: stat.monthly_sale || 0,
        commissionRate: dynamicCommissionRate, // 🎯 NOWE: Dynamiczna prowizja
        commissionEUR: dynamicCommissionEUR, // 🎯 NOWE: Prowizja EUR na podstawie dynamicznej stawki
        penalty: stat.total_penalties || 0,
        // Edytowalne pola
        customClientsCount: clientsCount,
        customTotalPayments: totalPayments,
        // Mapowanie statusChanges z dzisiaj
        statusChanges: {
          canvas: stat.status_changes_today?.canvas || 0,
          sale: stat.status_changes_today?.sale || 0,
          antysale: stat.status_changes_today?.antysale || 0,
          brak_kontaktu: stat.status_changes_today?.other || 0,
          nie_zainteresowany: 0,
          zdenerwowany: 0
        },
        // Obliczone wartości
        conversionRate: stat.monthly_sale > 0 ?
          ((stat.monthly_sale / (stat.monthly_canvas + stat.monthly_antysale + stat.monthly_sale)) * 100).toFixed(1) :
          0,
        efficiency: (stat.daily_achieved || 0) >= stat.daily_target ?
          Math.min(100, (((stat.daily_achieved || 0) / stat.daily_target) * 100)) :
          (((stat.daily_achieved || 0) / stat.daily_target) * 100),
        lastActive: new Date().toISOString()
      }
    })
}

const statusColors = {
  canvas: 'bg-blue-500/20 text-blue-400',
  sale: 'bg-green-500/20 text-green-400',
  antysale: 'bg-orange-500/20 text-orange-400',
  brak_kontaktu: 'bg-gray-500/20 text-gray-400',
  nie_zainteresowany: 'bg-red-500/20 text-red-400',
  zdenerwowany: 'bg-red-600/20 text-red-300'
}

// Funkcja do kolorowania badge'a prowizji na podstawie stawki
const getCommissionBadgeColor = (commissionRate: number) => {
  if (commissionRate >= 12) return 'bg-green-500/20 text-green-400' // 7+ klientów
  if (commissionRate >= 9) return 'bg-blue-500/20 text-blue-400'   // 5-6 klientów
  if (commissionRate >= 6) return 'bg-yellow-500/20 text-yellow-400' // 3-4 klientów
  return 'bg-gray-500/20 text-gray-400' // 0-2 klientów
}

// Funkcja do wyświetlania opisu poziomu prowizji
const getCommissionDescription = (clientsCount: number) => {
  if (clientsCount >= 7) return '7+ klientów'
  if (clientsCount >= 5) return '5-6 klientów'
  if (clientsCount >= 3) return '3-4 klientów'
  return '0-2 klientów'
}

export function Reports() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [employeeStatsData, setEmployeeStatsData] = useState<EmployeeStats[]>([])
  const [employeeActivityData, setEmployeeActivityData] = useState<EmployeeActivityStats[]>([])
  const [filteredActivityData, setFilteredActivityData] = useState<EmployeeActivityStats[]>([])
  const [selectedMonth, setSelectedMonth] = useState('all-months')
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all-employees')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null)
  const [editValues, setEditValues] = useState<{ clientsCount: number, totalPayments: number }>({ clientsCount: 0, totalPayments: 0 })
  const [saving, setSaving] = useState(false)
  const [commissionSystemOpen, setCommissionSystemOpen] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const today = new Date().toLocaleDateString('pl-PL')

  // Sprawdź czy użytkownik ma uprawnienia do statystyk pracowników
  const hasManagerAccess = user?.role && ['manager', 'szef', 'admin'].includes(user.role)

  // Ładowanie danych z bazy danych
  const loadEmployeeStats = async () => {
    if (!user || !hasManagerAccess) return

    setLoading(true)
    try {
      logger.loading('Ładowanie statystyk pracowników', { component: 'reports' })
      const stats = await reportsApi.getEmployeeStats(user)

      // DEBUG: Sprawdź surowe dane z API (tylko w dev)
      logger.debug('Surowe dane z API', { count: stats.length, firstRecord: stats[0] })

      setEmployeeStatsData(stats)

      // Konwertuj na format używany przez UI
      const displayData = mapEmployeeStatsToDisplay(stats)

      // DEBUG: Sprawdź dane po mapowaniu (tylko w dev)
      logger.debug('Dane po mapowaniu', { count: displayData.length, firstRecord: displayData[0] })

      setEmployees(displayData)

      logger.success('Załadowano statystyki', { component: 'reports', count: stats.length })
    } catch (error) {
      logger.error('Błąd ładowania statystyk', error, { component: 'reports' })
    } finally {
      setLoading(false)
    }
  }

  // Ładuj dane aktywności pracowników
  const loadEmployeeActivityStats = async () => {
    if (!user || !hasManagerAccess) return
    
    setLoading(true)
    try {
      logger.loading('Ładowanie statystyk aktywności pracowników', { component: 'reports' })
      const activityStats = await reportsApi.getEmployeeActivityStats(user)
      
      logger.success('Załadowano statystyki aktywności', { component: 'reports', count: activityStats.length })
      setEmployeeActivityData(activityStats)
    } catch (error) {
      logger.error('Błąd ładowania statystyk aktywności', error, { component: 'reports' })
    } finally {
      setLoading(false)
    }
  }

  // Ładuj dane przy pierwszym renderze (aktywności również)
  useEffect(() => {
    if (user && hasManagerAccess) {
      loadEmployeeStats()
      loadEmployeeActivityStats()
    }
  }, [user])

  // Filtrowanie danych aktywności pracowników
  useEffect(() => {
    let filtered = employeeActivityData

    // Filtr po miesiącu
    if (selectedMonth !== 'all-months') {
      const [year, month] = selectedMonth.split('-')
      filtered = filtered.filter(employee => {
        const periodDate = new Date(employee.period_start)
        const employeeYear = periodDate.getFullYear().toString()
        const employeeMonth = (periodDate.getMonth() + 1).toString().padStart(2, '0')
        return employeeYear === year && employeeMonth === month
      })
    }

    // Filtr po pracowniku
    if (selectedEmployeeFilter !== 'all-employees') {
      filtered = filtered.filter(employee => 
        employee.user_id === selectedEmployeeFilter
      )
    }

    setFilteredActivityData(filtered)
  }, [employeeActivityData, selectedMonth, selectedEmployeeFilter])

  // Funkcja filtrowania
  useEffect(() => {
    let filtered = employees

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(emp =>
        emp.name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query)
      )
    }

    // Sortowanie
    filtered = [...filtered].sort((a, b) => {
      let aValue: any = a[sortField as keyof typeof a]
      let bValue: any = b[sortField as keyof typeof b]

      if (sortField === 'totalStatusChanges') {
        aValue = Object.values(a.statusChanges as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0)
        bValue = Object.values(b.statusChanges as Record<string, number>).reduce((sum: number, val: number) => sum + val, 0)
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredEmployees(filtered)
  }, [employees, searchQuery, sortField, sortDirection])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const getEfficiencyBadge = (efficiency: number) => {
    if (efficiency >= 90) return 'bg-green-500/20 text-green-400'
    if (efficiency >= 80) return 'bg-blue-500/20 text-blue-400'
    if (efficiency >= 70) return 'bg-yellow-500/20 text-yellow-400'
    return 'bg-red-500/20 text-red-400'
  }

  const getTotalStatusChanges = (statusChanges: Record<string, number>) => {
    return Object.values(statusChanges).reduce((sum: number, val: number) => sum + val, 0)
  }

  const handleExportPDF = () => {
    alert('Eksport do PDF - funkcjonalność w przygotowaniu')
  }

  const handleExportCSV = () => {
    alert('Eksport do CSV - funkcjonalność w przygotowaniu')
  }

  // Funkcje do obsługi edycji
  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee)
    setEditValues({
      clientsCount: employee.customClientsCount,
      totalPayments: employee.customTotalPayments
    })
  }

  const handleCancelEdit = () => {
    setEditingEmployee(null)
    setEditValues({ clientsCount: 0, totalPayments: 0 })
  }

  const handleSaveEdit = async () => {
    if (!editingEmployee || !user) return

    setSaving(true)
    try {
      logger.loading(`Zapisywanie edycji dla pracownika ${editingEmployee.name}`, { 
        component: 'reports', 
        userId: editingEmployee.user_id,
        editValues 
      })

      const result = await reportsApi.updateEmployeeClientStats(
        editingEmployee.user_id,
        editValues.clientsCount,
        editValues.totalPayments,
        user
      )

      logger.success('Aktualizacja pomyślna', { component: 'reports', result })

      toast({
        title: "Sukces",
        description: `Statystyki dla ${editingEmployee.name} zostały zaktualizowane`
      })

      // Odśwież dane - z obsługą błędów
      try {
        await loadEmployeeStats()
      } catch (refreshError) {
        logger.warn('Nie udało się odświeżyć danych, ale edycja została zapisana', { 
          component: 'reports', 
          error: refreshError 
        })
        toast({
          title: "Informacja",
          description: "Edycja zapisana, ale nie udało się odświeżyć widoku. Odśwież stronę manually.",
          variant: "default"
        })
      }

      // Zakończ edycję
      setEditingEmployee(null)
      setEditValues({ clientsCount: 0, totalPayments: 0 })

    } catch (error) {
      logger.error('Błąd zapisywania edycji', error, { component: 'reports' })

      // Sprawdź czy to błąd uprawnień
      const errorMessage = error instanceof Error ? error.message : "Nieznany błąd"

      if (errorMessage.includes('403') || errorMessage.includes('permission') || errorMessage.includes('uprawnienia')) {
        toast({
          title: "Brak uprawnień",
          description: "Nie masz uprawnień do edycji statystyk pracowników. Skontaktuj się z administratorem.",
          variant: "destructive"
        })
      } else if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
        toast({
          title: "Błąd połączenia",
          description: "Sprawdź połączenie internetowe i spróbuj ponownie.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Błąd",
          description: `Nie udało się zapisać zmian: ${errorMessage}`,
          variant: "destructive"
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full h-full">
      {/* Header - pełna szerokość */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Dziś</SelectItem>
                <SelectItem value="week">Tydzień</SelectItem>
                <SelectItem value="month">Miesiąc</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportPDF} className="bg-green-500 hover:bg-green-600">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handleExportCSV} variant="outline" className="border-slate-600 hover:bg-slate-700">
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Podsumowanie dnia */}
        <div className="col-span-12 grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Klienci obsłużeni</p>
                  <p className="text-3xl font-bold text-white">{dailyStats.totalClients}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">+12% vs wczoraj</span>
                  </div>
                </div>
                <div className="text-cyan-400">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Rozmowy</p>
                  <p className="text-3xl font-bold text-white">47</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">+8% vs wczoraj</span>
                  </div>
                </div>
                <div className="text-green-400">
                  <Phone className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Konwersja</p>
                  <p className="text-3xl font-bold text-white">64%</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-sm text-red-400">-3% vs wczoraj</span>
                  </div>
                </div>
                <div className="text-orange-400">
                  <TrendingUp className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Średni czas rozmowy</p>
                  <p className="text-3xl font-bold text-white">8:42</p>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-green-400">+15s vs wczoraj</span>
                  </div>
                </div>
                <div className="text-purple-400">
                  <MessageSquare className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wykres statusów */}
        <Card className="col-span-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Rozkład statusów klientów</CardTitle>
            <p className="text-sm text-slate-400">Dzisiejsze statystyki</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {statusChartData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-slate-300 truncate">{item.name}</span>
                  <span className="font-semibold text-white ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Aktywność pracowników */}
        <Card className="col-span-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Aktywność pracowników</CardTitle>
            <p className="text-sm text-slate-400">Liczba obsłużonych klientów</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeChartData}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                  />
                  <YAxis hide />
                  <Bar dataKey="klienci" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {Object.entries(dailyStats.employeeStats).map(([employee, count]) => (
                <div key={employee} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{employee}</span>
                  <span className="font-semibold text-white">{count} klientów</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabela aktywności pracowników */}
        <Card className="col-span-12 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-400" />
                  Aktywności pracowników
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-40 bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Filtruj miesiąc" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-months">Wszystkie miesiące</SelectItem>
                    <SelectItem value="2025-06">Czerwiec 2025</SelectItem>
                    <SelectItem value="2025-07">Lipiec 2025</SelectItem>
                    <SelectItem value="2025-08">Sierpień 2025</SelectItem>
                    <SelectItem value="2025-09">Wrzesień 2025</SelectItem>
                    <SelectItem value="2025-10">Październik 2025</SelectItem>
                    <SelectItem value="2025-11">Listopad 2025</SelectItem>
                    <SelectItem value="2025-12">Grudzień 2025</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedEmployeeFilter} onValueChange={setSelectedEmployeeFilter}>
                  <SelectTrigger className="w-48 bg-slate-700 border-slate-600">
                    <SelectValue placeholder="Filtruj pracownika" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-employees">Wszyscy pracownicy</SelectItem>
                    {employeeActivityData.map((employee) => (
                      <SelectItem key={employee.user_id} value={employee.user_id}>
                        {employee.user?.full_name || 'Nieznany pracownik'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400">
                    <Button
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                    >
                      Imię i nazwisko <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">
                    <Button
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                    >
                      Miesiąc <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">
                    <Button
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                    >
                      Przepracowane godziny <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">
                    <Button
                      variant="ghost"
                      className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                    >
                      Średnia dzienna <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-slate-400 text-center">Efektywność</TableHead>
                  <TableHead className="text-slate-400 text-center">Aktywności</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Dane z bazy danych - tabela employee_statistics */}
                {filteredActivityData.length > 0 ? (
                  filteredActivityData.map((employee) => {
                    // Oblicz wartości dla wyświetlenia
                    const totalHours = Math.floor(employee.total_work_minutes / 60)
                    const totalMinutes = employee.total_work_minutes % 60
                    const expectedHours = Math.floor(employee.expected_work_minutes / 60)
                    const avgDailyHours = Math.floor(employee.average_daily_minutes / 60)
                    const avgDailyMinutes = employee.average_daily_minutes % 60
                    const efficiency = employee.efficiency_percentage
                    const avgDailyActivities = employee.average_daily_activities
                    
                    // Określ kolor na podstawie efektywności
                    const getEfficiencyColor = (eff: number) => {
                      if (eff >= 95) return 'text-green-400'
                      if (eff >= 80) return 'text-yellow-400'
                      return 'text-orange-400'
                    }
                    
                    const getEfficiencyBadgeColor = (eff: number) => {
                      if (eff >= 95) return 'bg-green-500/20 text-green-400'
                      if (eff >= 80) return 'bg-yellow-500/20 text-yellow-400'
                      return 'bg-orange-500/20 text-orange-400'
                    }

                    // Format daty okresu
                    const periodDate = new Date(employee.period_start)
                    const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 
                                       'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień']
                    const monthName = monthNames[periodDate.getMonth()]
                    const year = periodDate.getFullYear()

                    return (
                      <TableRow key={employee.id} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={employee.user?.avatar_url} />
                              <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                {employee.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'XX'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-white">{employee.user?.full_name || 'Nieznany'}</div>
                              <div className="text-xs text-slate-400">{employee.user?.email || 'brak@email.com'}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-500/20 text-blue-400">
                            {monthName} {year}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-semibold text-white">
                            {totalHours}h {totalMinutes > 0 ? `${totalMinutes}min` : ''}
                          </div>
                          <div className="text-xs text-slate-400">z {expectedHours}h możliwych</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={`font-semibold ${getEfficiencyColor(efficiency)}`}>
                            {avgDailyHours}.{Math.round(avgDailyMinutes * 10 / 60)}h
                          </div>
                          <div className="text-xs text-slate-400">na dzień</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={Math.min(100, efficiency)} className="w-16 h-2" />
                            <Badge className={`${getEfficiencyBadgeColor(efficiency)} text-xs`}>
                              {Math.round(efficiency)}%
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm text-slate-300">{employee.total_activities} akcji</div>
                          <div className="text-xs text-slate-400">{avgDailyActivities.toFixed(1)}/dzień</div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow className="border-slate-700">
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-slate-400">
                        {loading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Ładowanie statystyk aktywności...
                          </div>
                        ) : (
                          'Brak danych o aktywności pracowników'
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Podsumowanie aktywności */}
            <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
              <div className="grid grid-cols-5 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-slate-400">Łączne godziny</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {(() => {
                      const totalMinutes = employeeActivityData.reduce((sum, emp) => sum + emp.total_work_minutes, 0)
                      const hours = Math.floor(totalMinutes / 60)
                      const minutes = totalMinutes % 60
                      return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`
                    })()}
                  </div>
                  <div className="text-xs text-slate-500">wszystkich pracowników</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Średnia dzienna</div>
                  <div className="text-xl font-bold text-green-400">
                    {employeeActivityData.length > 0 ? (() => {
                      const avgMinutes = employeeActivityData.reduce((sum, emp) => sum + emp.average_daily_minutes, 0) / employeeActivityData.length
                      const hours = Math.floor(avgMinutes / 60)
                      const minutes = Math.round(avgMinutes % 60)
                      return `${hours}.${Math.round(minutes * 10 / 60)}h`
                    })() : '0h'}
                  </div>
                  <div className="text-xs text-slate-500">na pracownika</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Efektywność</div>
                  <div className="text-xl font-bold text-purple-400">
                    {employeeActivityData.length > 0 ? 
                      Math.round(employeeActivityData.reduce((sum, emp) => sum + emp.efficiency_percentage, 0) / employeeActivityData.length) 
                      : 0}%
                  </div>
                  <div className="text-xs text-slate-500">średnia zespołu</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Akcje łącznie</div>
                  <div className="text-xl font-bold text-orange-400">
                    {employeeActivityData.reduce((sum, emp) => sum + emp.total_activities, 0).toLocaleString('pl-PL')}
                  </div>
                  <div className="text-xs text-slate-500">w miesiącu</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400">Pracowników</div>
                  <div className="text-xl font-bold text-blue-400">{employeeActivityData.length}</div>
                  <div className="text-xs text-slate-500">aktywnych</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela z prowizjami - druga tabela */}
        <Card className="col-span-12 bg-slate-800 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  Statystyki pracowników z prowizją
                </CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <Dialog open={commissionSystemOpen} onOpenChange={setCommissionSystemOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      <Calculator className="h-4 w-4 mr-2" />
                      System prowizyjny
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-xl">
                        <DollarSign className="h-6 w-6 text-green-400" />
                        System Prowizyjny - Szczegółowe Informacje
                      </DialogTitle>
                      <DialogDescription className="text-slate-400">
                        Poznaj jak działa nasz system naliczania prowizji na podstawie liczby obsłużonych klientów
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                      {/* Tabela progów prowizji */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4 text-cyan-400">📊 Progi prowizji</h3>
                        <Table>
                          <TableHeader>
                            <TableRow className="border-slate-600">
                              <TableHead className="text-slate-300">Liczba klientów</TableHead>
                              <TableHead className="text-slate-300 text-center">Stawka prowizji</TableHead>
                              <TableHead className="text-slate-300 text-center">Kolor oznaczeń</TableHead>
                              <TableHead className="text-slate-300 text-center">Opis poziomu</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <TableRow className="border-slate-600">
                              <TableCell className="font-medium">0-2 klientów</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-gray-500/20 text-gray-400 text-white font-semibold">3%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-4 h-4 bg-gray-400 rounded-full mx-auto"></div>
                              </TableCell>
                              <TableCell className="text-center text-gray-400">Poziom podstawowy</TableCell>
                            </TableRow>
                            <TableRow className="border-slate-600">
                              <TableCell className="font-medium">3-4 klientów</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-yellow-500/20 text-yellow-400 text-white font-semibold">6%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-4 h-4 bg-yellow-400 rounded-full mx-auto"></div>
                              </TableCell>
                              <TableCell className="text-center text-yellow-400">Poziom standardowy</TableCell>
                            </TableRow>
                            <TableRow className="border-slate-600">
                              <TableCell className="font-medium">5-6 klientów</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-blue-500/20 text-blue-400 text-white font-semibold">9%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-4 h-4 bg-blue-400 rounded-full mx-auto"></div>
                              </TableCell>
                              <TableCell className="text-center text-blue-400">Poziom bardzo dobry</TableCell>
                            </TableRow>
                            <TableRow className="border-slate-600">
                              <TableCell className="font-medium">7+ klientów</TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-green-500/20 text-green-400 text-white font-semibold">12%</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="w-4 h-4 bg-green-400 rounded-full mx-auto"></div>
                              </TableCell>
                              <TableCell className="text-center text-green-400">Poziom mistrzowski</TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  onClick={handleExportPDF}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Eksportuj PDF
                </Button>
                <Button
                  onClick={handleExportCSV}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Eksportuj CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-slate-400">Ładowanie statystyk...</p>
                </div>
              </div>
            ) : (
              <>
              

                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('name')}
                          className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                        >
                          Pracownik {getSortIcon('name')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-slate-400 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('clients_count')}
                          className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                        >
                          Liczba klientów {getSortIcon('clients_count')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-slate-400 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('total_payments_eur')}
                          className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                        >
                          Łączne wpłaty (EUR) {getSortIcon('total_payments_eur')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-slate-400 text-center">Procent prowizji</TableHead>
                      <TableHead className="text-slate-400 text-center">
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('commission_eur')}
                          className="text-slate-400 hover:text-white p-0 h-auto font-medium"
                        >
                          Prowizja (EUR) {getSortIcon('commission_eur')}
                        </Button>
                      </TableHead>

                      <TableHead className="text-slate-400 text-center">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.name} className="border-slate-700 hover:bg-slate-700/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                                {employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-white">{employee.name}</div>
                              <div className="text-xs text-slate-400">ID: {employee.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-semibold text-cyan-400 text-lg">{employee.customClientsCount}</div>
                          <div className="text-xs text-slate-400">{getCommissionDescription(employee.customClientsCount)}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-semibold text-white">€{employee.customTotalPayments.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-slate-400">z {employee.customClientsCount} klientów</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getCommissionBadgeColor(employee.commissionRate)} text-white font-semibold`}>
                            {employee.commissionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-bold text-green-400 text-lg">€{employee.commissionEUR.toLocaleString('pl-PL', { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-slate-400">{employee.commissionRate}% z wpłat</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-2 justify-center">
                            <Button
                              onClick={() => handleEditEmployee(employee)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Edytuj
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {editingEmployee && (
                  <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Edit2 className="h-5 w-5 text-blue-400" />
                      Edycja danych: {editingEmployee.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Liczba klientów
                        </label>
                        <input
                          type="number"
                          value={editValues.clientsCount}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            clientsCount: parseInt(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Łączne wpłaty (EUR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editValues.totalPayments}
                          onChange={(e) => setEditValues({
                            ...editValues,
                            totalPayments: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <Button
                        onClick={handleSaveEdit}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Zapisz zmiany
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Anuluj
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-300 mb-4">📊 Podsumowanie zespołu:</h4>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-slate-400">Łączni klienci</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {filteredEmployees.reduce((sum: number, emp: any) => sum + emp.customClientsCount, 0)}
                      </div>
                      <div className="text-xs text-slate-500">wszystkich pracowników</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">Łączne wpłaty</div>
                      <div className="text-2xl font-bold text-green-400">
                        €{filteredEmployees.reduce((sum: number, emp: any) => sum + emp.customTotalPayments, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500">suma wszystkich</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">Łączne prowizje</div>
                      <div className="text-2xl font-bold text-purple-400">
                        €{filteredEmployees.reduce((sum: number, emp: any) => sum + emp.commissionEUR, 0).toLocaleString('pl-PL', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500">suma prowizji</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400">Średnia efektywność</div>
                      <div className="text-2xl font-bold text-orange-400">
                        {filteredEmployees.length > 0 ? Math.round(filteredEmployees.reduce((sum: number, emp: any) => sum + emp.efficiency, 0) / filteredEmployees.length) : 0}%
                      </div>
                      <div className="text-xs text-slate-500">zespołu</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 