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
import { useAuth } from "@/store/useStore"
import { reportsApi, type EmployeeStats } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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

// Funkcja mapująca EmployeeStats na format używany przez komponent
const mapEmployeeStatsToDisplay = (stats: EmployeeStats[]) => {
  // Filtruj tylko te rekordy które mają prawidłowe dane użytkownika
  return stats
    .filter(stat => stat.user && stat.user.full_name) // Tylko z prawidłowymi danymi użytkownika
    .map(stat => ({
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
    commissionRate: stat.commission_rate,
    commissionEUR: stat.total_commissions || 0,
    penalty: stat.total_penalties || 0,
    // Edytowalne pola
    customClientsCount: stat.custom_clients_count || 0,
    customTotalPayments: stat.custom_total_payments || 0,
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
  }))
}

const statusColors = {
  canvas: 'bg-blue-500/20 text-blue-400',
  sale: 'bg-green-500/20 text-green-400',
  antysale: 'bg-orange-500/20 text-orange-400',
  brak_kontaktu: 'bg-gray-500/20 text-gray-400',
  nie_zainteresowany: 'bg-red-500/20 text-red-400',
  zdenerwowany: 'bg-red-600/20 text-red-300'
}

export function Reports() {
  const [employees, setEmployees] = useState<any[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<any[]>([])
  const [employeeStatsData, setEmployeeStatsData] = useState<EmployeeStats[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [loading, setLoading] = useState(true)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ clientsCount: number, totalPayments: number }>({ clientsCount: 0, totalPayments: 0 })
  const [saving, setSaving] = useState(false)
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
      console.log('📊 Ładowanie statystyk pracowników...')
      const stats = await reportsApi.getEmployeeStats(user)
      setEmployeeStatsData(stats)
      
      // Konwertuj na format używany przez UI
      const displayData = mapEmployeeStatsToDisplay(stats)
      setEmployees(displayData)
      
      console.log('✅ Załadowano statystyki:', stats.length)
    } catch (error) {
      console.error('❌ Błąd ładowania statystyk:', error)
    } finally {
      setLoading(false)
    }
  }

  // Ładuj dane przy pierwszym renderze
  useEffect(() => {
    if (user && hasManagerAccess) {
      loadEmployeeStats()
    }
  }, [user])

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
    setEditingEmployee(employee.user_id)
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
      console.log(`💾 Zapisywanie edycji dla pracownika ${editingEmployee}:`, editValues)
      
      await reportsApi.updateEmployeeClientStats(
        editingEmployee,
        editValues.clientsCount,
        editValues.totalPayments,
        user
      )
      
      toast({
        title: "Sukces",
        description: "Statystyki pracownika zostały zaktualizowane"
      })
      
      // Odśwież dane
      await loadEmployeeStats()
      
      // Zakończ edycję
      setEditingEmployee(null)
      setEditValues({ clientsCount: 0, totalPayments: 0 })
      
    } catch (error) {
      console.error('❌ Błąd zapisywania edycji:', error)
      toast({
        title: "Błąd",
        description: error instanceof Error ? error.message : "Nie udało się zapisać zmian",
        variant: "destructive"
      })
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

          {/* Trend tygodniowy */}
          <Card className="col-span-8 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Trend tygodniowy</CardTitle>
              <p className="text-sm text-slate-400">Klienci, rozmowy i konwersja</p>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyTrendData}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 12 }} 
                    />
                    <YAxis hide />
                    <Line type="monotone" dataKey="klienci" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rozmowy" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="konwersja" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-400">Klienci</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-slate-400">Rozmowy</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                  <span className="text-slate-400">Konwersja (%)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Podsumowanie tygodniowe */}
          <Card className="col-span-4 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Podsumowanie tygodniowe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-400">{weeklyStats.totalClients}</div>
                  <div className="text-sm text-slate-400">Klientów w tym tygodniu</div>
                </div>
                
                <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{weeklyStats.avgPerDay}</div>
                  <div className="text-sm text-slate-400">Średnio dziennie</div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-slate-400">Najlepszy dzień:</span>
                    <div className="text-green-400 font-medium">{weeklyStats.bestDay}</div>
                  </div>
                  <div className="text-sm">
                    <span className="text-slate-400">Najsłabszy dzień:</span>
                    <div className="text-red-400 font-medium">{weeklyStats.worstDay}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela szczegółowa */}
          <Card className="col-span-12 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Szczegółowe statystyki</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Dzień</TableHead>
                    <TableHead className="text-slate-400">Klienci</TableHead>
                    <TableHead className="text-slate-400">Rozmowy</TableHead>
                    <TableHead className="text-slate-400">Konwersja</TableHead>
                    <TableHead className="text-slate-400">Średni czas</TableHead>
                    <TableHead className="text-slate-400">Najaktywniejszy pracownik</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyTrendData.map((day, index) => (
                    <TableRow key={index} className="border-slate-700">
                      <TableCell className="text-white font-medium">{day.day}</TableCell>
                      <TableCell className="text-slate-300">{day.klienci}</TableCell>
                      <TableCell className="text-slate-300">{day.rozmowy}</TableCell>
                      <TableCell>
                        <Badge className={day.konwersja >= 60 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                          {day.konwersja}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">8:30</TableCell>
                      <TableCell className="text-slate-300">pracownik1</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tabela statystyk pracowników - TYLKO dla manager/szef/admin */}
          {hasManagerAccess && (
            <Card className="col-span-12 bg-slate-800 border-slate-700 mt-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Award className="h-5 w-5 text-orange-400" />
                      Statystyki pracowników z prowizją
                    </CardTitle>
                    <p className="text-sm text-slate-400">Szczegółowe statystyki, prowizje i kary</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Szukaj pracownika..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400">Ładowanie statystyk pracowników...</div>
                  </div>
                ) : (
                  <div>
                    <div className="overflow-x-auto">
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
                            <TableHead className="text-slate-400 text-center">Klienci (edycja)</TableHead>
                            <TableHead className="text-slate-400 text-center">Suma wpłat (edycja)</TableHead>
                            <TableHead className="text-slate-400 text-center">Canvas</TableHead>
                            <TableHead className="text-slate-400 text-center">AntyS</TableHead>
                            <TableHead className="text-slate-400 text-center">Sale</TableHead>
                            <TableHead className="text-slate-400 text-center">Prowizja (%)</TableHead>
                            <TableHead className="text-slate-400 text-center">Prowizja (EUR)</TableHead>
                            <TableHead className="text-slate-400 text-center">Akcje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEmployees.map((employee) => {
                            const isEditing = editingEmployee === employee.user_id
                            
                            return (
                              <TableRow key={employee.id} className="border-slate-700 hover:bg-slate-700/30">
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-10 w-10">
                                      <AvatarImage src={employee.avatar} />
                                      <AvatarFallback className="bg-slate-700 text-slate-300">
                                        {employee.name.split(' ').map((n: string) => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-medium text-white">{employee.name}</div>
                                      <div className="text-sm text-slate-400">{employee.email}</div>
                                      <Badge className="bg-blue-500/20 text-blue-400 text-xs mt-1">
                                        {employee.role}
                                      </Badge>
                                    </div>
                                  </div>
                                </TableCell>
                                
                                {/* Klienci (edycja) */}
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={editValues.clientsCount}
                                      onChange={(e) => setEditValues(prev => ({ ...prev, clientsCount: parseInt(e.target.value) || 0 }))}
                                      className="w-20 bg-slate-700 border-slate-600 text-center"
                                      min="0"
                                    />
                                  ) : (
                                    <div className="font-semibold text-white">{employee.customClientsCount}</div>
                                  )}
                                </TableCell>
                                
                                {/* Suma wpłat (edycja) */}
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={editValues.totalPayments}
                                      onChange={(e) => setEditValues(prev => ({ ...prev, totalPayments: parseFloat(e.target.value) || 0 }))}
                                      className="w-28 bg-slate-700 border-slate-600 text-center"
                                      min="0"
                                      step="0.01"
                                    />
                                  ) : (
                                    <div className="text-slate-300">{employee.customTotalPayments.toLocaleString()} PLN</div>
                                  )}
                                </TableCell>
                                
                                {/* Canvas - set to 0 */}
                                <TableCell className="text-center">
                                  <Badge className="bg-blue-500/20 text-blue-400">
                                    0
                                  </Badge>
                                </TableCell>
                                
                                {/* AntyS - set to 0 */}
                                <TableCell className="text-center">
                                  <Badge className="bg-orange-500/20 text-orange-400">
                                    0
                                  </Badge>
                                </TableCell>
                                
                                {/* Sale - set to 0 */}
                                <TableCell className="text-center">
                                  <Badge className="bg-green-500/20 text-green-400">
                                    0
                                  </Badge>
                                </TableCell>
                                
                                {/* Prowizja (%) */}
                                <TableCell className="text-center">
                                  <Badge className="bg-purple-500/20 text-purple-400">
                                    {employee.commissionRate}%
                                  </Badge>
                                </TableCell>
                                
                                {/* Prowizja (EUR) - set to 0 */}
                                <TableCell className="text-center">
                                  <div className="font-semibold text-green-400">
                                    €0.00
                                  </div>
                                </TableCell>
                                
                                {/* Akcje */}
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <Button
                                        size="sm"
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        className="bg-green-600 hover:bg-green-700 h-8 w-8 p-0"
                                      >
                                        {saving ? (
                                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        ) : (
                                          <Save className="h-4 w-4" />
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                        className="border-slate-600 hover:bg-slate-700 h-8 w-8 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditEmployee(employee)}
                                      className="border-slate-600 hover:bg-slate-700 h-8 w-8 p-0"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Podsumowanie prowizji */}
                    <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-slate-400">Łączna ilość klientów</div>
                          <div className="text-xl font-bold text-cyan-400">
                            {filteredEmployees.reduce((sum, emp) => sum + emp.customClientsCount, 0)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400">Łączne wpłaty</div>
                          <div className="text-xl font-bold text-green-400">
                            {filteredEmployees.reduce((sum, emp) => sum + emp.customTotalPayments, 0).toLocaleString()} PLN
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400">Średnia prowizja</div>
                          <div className="text-xl font-bold text-purple-400">
                            {filteredEmployees.length > 0 ? 
                              (filteredEmployees.reduce((sum, emp) => sum + emp.commissionRate, 0) / filteredEmployees.length).toFixed(1) : 0}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-slate-400">Liczba pracowników</div>
                          <div className="text-xl font-bold text-orange-400">
                            {filteredEmployees.length}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Legenda */}
                    <div className="mt-4 p-4 bg-slate-700/20 rounded-lg">
                      <div className="text-sm text-slate-400 mb-2">Legenda:</div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          • <span className="text-cyan-400">Klienci (edycja)</span> - ręcznie wprowadzona ilość klientów<br/>
                          • <span className="text-green-400">Suma wpłat (edycja)</span> - ręcznie wprowadzona suma wpłat w PLN<br/>
                          • <span className="text-blue-400">Canvas / AntyS / Sale</span> - ustawione na 0 (narazie)
                        </div>
                        <div>
                          • <span className="text-purple-400">Prowizja (%)</span> - stała stopa prowizji pracownika<br/>
                          • <span className="text-green-400">Prowizja (EUR)</span> - ustawiona na 0 (narazie)<br/>
                          • <span className="text-orange-400">Edycja</span> - kliknij ikonę edycji aby zmienić dane
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
    </div>
  )
} 