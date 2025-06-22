"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Phone,
  Users,
  Clock,
  PieChart,
  Euro,
  TrendingUp,
  Calendar,
  Target,
  Award,
  Briefcase,
  Save,
  Edit,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts"
import { useAuth } from "@/store/useStore"
import { reportsApi } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface PersonalStats {
  phoneCallsThisMonth: number
  clientStats: { status: string, count: number, color: string }[]
  totalClients: number
  commissionTotal: number
  workingHoursThisMonth: { day: string, hours: number }[]
  totalWorkingHours: number
  totalWorkingDays: number
}

interface WorkingDay {
  date: string
  dayName: string
  formattedDate: string
  hours: number
}

export function MyStatsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<PersonalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workingHours, setWorkingHours] = useState<Record<string, number>>({})
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [tempHours, setTempHours] = useState<string>('')
  const [isUsingLocalStorage, setIsUsingLocalStorage] = useState(false)

  // Sprawdź uprawnienia - tylko pracownicy
  useEffect(() => {
    if (user && user.role !== 'pracownik') {
      console.warn('🚫 Dostęp zabroniony - tylko dla pracowników')
      router.push('/')
      return
    }
  }, [user, router])

  // Załaduj statystyki
  useEffect(() => {
    const loadStats = async () => {
      if (!user || user.role !== 'pracownik') return

      setLoading(true)
      setError(null)
      try {
        console.log('📊 Ładowanie osobistych statystyk...')
        const personalStats = await reportsApi.getMyPersonalStats(user)
        setStats(personalStats)
        console.log('✅ Statystyki załadowane:', personalStats)
      } catch (err) {
        console.error('❌ Błąd ładowania statystyk:', err)
        
        // Szczegółowe logowanie błędów
        if (err && typeof err === 'object') {
          console.error('📋 Szczegóły błędu w komponencie:', {
            message: (err as any).message,
            name: (err as any).name,
            code: (err as any).code,
            status: (err as any).status,
            response: (err as any).response
          })
        }
        
        let errorMessage = 'Błąd ładowania danych'
        if (err instanceof Error) {
          errorMessage = err.message
        } else if (typeof err === 'string') {
          errorMessage = err
        } else if (err && typeof err === 'object' && (err as any).message) {
          errorMessage = (err as any).message
        }
        
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadStats()
    loadWorkingHours()
  }, [user])

  // Załaduj godziny pracy dla czerwca 2025
  const loadWorkingHours = async () => {
    if (!user || user.role !== 'pracownik') return

    try {
      // Ustaw czerwiec 2025
      const year = 2025
      const month = 6 // czerwiec
      
      console.log('⏰ Ładowanie godzin pracy dla czerwca 2025...')
      const hours = await reportsApi.getWorkingHoursForMonth(user, year, month)
      setWorkingHours(hours)
      setIsUsingLocalStorage(false) // Tabela working_hours już istnieje w bazie
      
      console.log('✅ Godziny pracy załadowane z bazy danych dla czerwca 2025:', hours)
    } catch (err) {
      console.error('❌ Błąd ładowania godzin pracy:', err)
      // Tylko w przypadku błędu może być używany localStorage fallback
      setIsUsingLocalStorage(err && typeof err === 'object' && (err as any).message?.includes('localStorage'))
    }
  }

  // Funkcja do generowania dni roboczych w czerwcu 2025
  const getWorkingDaysInMonth = (): WorkingDay[] => {
    // Ustaw czerwiec 2025
    const year = 2025
    const month = 5 // czerwiec (indeks 5, bo miesiące są 0-11)
    
    const workingDays = []
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      const dayOfWeek = date.getDay()
      
      // Tylko dni robocze (pon-pt) - 1=pon, 2=wt, 3=śr, 4=czw, 5=pt
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        const dateString = date.toISOString().split('T')[0]
        // Generuj poprawną nazwę dnia tygodnia
        const dayName = date.toLocaleDateString('pl-PL', { weekday: 'short' })
        // Formatuj datę bezpiecznie
        const formattedDate = `${day.toString().padStart(2, '0')}.06.2025`
        
        workingDays.push({
          date: dateString,
          dayName,
          formattedDate, // Dodaj bezpieczne formatowanie
          hours: workingHours[dateString] || 0
        })
      }
    }
    
    return workingDays
  }

  // Rozpocznij edycję godzin
  const startEditing = (dateString: string, currentHours: number) => {
    setEditingDate(dateString)
    setTempHours(currentHours.toString())
  }

  // Zapisz godziny
  const saveHours = async (dateString: string) => {
    if (!user) return

    try {
      const hours = parseFloat(tempHours)
      if (isNaN(hours) || hours < 0 || hours > 12) {
        toast({
          title: "Błędne dane",
          description: "Godziny muszą być liczbą między 0 a 12",
          variant: "destructive"
        })
        return
      }

      await reportsApi.saveWorkingHours(user, dateString, hours)
      
      // Aktualizuj lokalny stan
      setWorkingHours(prev => ({
        ...prev,
        [dateString]: hours
      }))
      
      setEditingDate(null)
      setTempHours('')
      
      toast({
        title: "Zapisano",
        description: `Zapisano ${hours}h dla ${new Date(dateString).toLocaleDateString('pl-PL')} w bazie danych`,
      })
    } catch (err) {
      console.error('❌ Błąd zapisywania godzin:', err)
      toast({
        title: "Błąd",
        description: err instanceof Error ? err.message : "Nie udało się zapisać godzin",
        variant: "destructive"
      })
    }
  }

  // Anuluj edycję
  const cancelEditing = () => {
    setEditingDate(null)
    setTempHours('')
  }

  // Jeśli użytkownik nie jest pracownikiem, nie renderuj nic
  if (!user || user.role !== 'pracownik') {
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="bg-red-900/20 border-red-700">
          <CardContent className="p-6 text-center">
            <div className="text-red-400 text-lg font-semibold mb-2">Błąd ładowania</div>
            <div className="text-red-300">{error}</div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4 bg-red-600 hover:bg-red-700"
            >
              Spróbuj ponownie
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400">Brak danych do wyświetlenia</div>
      </div>
    )
  }

  // Czerwiec 2025 - hardcoded dla tabeli godzin pracy

  return (
    <div className="w-full space-y-6">
      {/* Header z powitaniem */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-600">
        <div className="flex items-center gap-4">
          <div className="bg-cyan-500/20 p-3 rounded-full">
            <Award className="h-8 w-8 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Witaj, {user.full_name}!</h2>
            <p className="text-slate-400">Twoje osiągnięcia za czerwiec 2025</p>
          </div>
        </div>
      </div>

      {/* Kluczowe metryki */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Telefony w tym miesiącu</p>
                <p className="text-3xl font-bold text-cyan-400">{stats.phoneCallsThisMonth}</p>
                <p className="text-xs text-slate-500 mt-1">Kliknięcia w numery</p>
              </div>
              <div className="text-cyan-400">
                <Phone className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Moi klienci</p>
                <p className="text-3xl font-bold text-green-400">{stats.totalClients}</p>
                <p className="text-xs text-slate-500 mt-1">Przypisanych do Ciebie</p>
              </div>
              <div className="text-green-400">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Prowizja</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.commissionTotal} zł</p>
                <p className="text-xs text-slate-500 mt-1">Za klientów Sale</p>
              </div>
              <div className="text-yellow-400">
                <Euro className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Godziny pracy</p>
                <p className="text-3xl font-bold text-purple-400">{stats.totalWorkingHours}h</p>
                <p className="text-xs text-slate-500 mt-1">{stats.totalWorkingDays} dni aktywnych</p>
              </div>
              <div className="text-purple-400">
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Rozkład statusów klientów - Wykres kołowy */}
        <Card className="col-span-5 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Rozkład statusów klientów
            </CardTitle>
            <p className="text-sm text-slate-400">Twoi przypisani klienci</p>
          </CardHeader>
          <CardContent>
            {stats.clientStats.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak przypisanych klientów</p>
                </div>
              </div>
            ) : (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie 
                        data={stats.clientStats} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={90} 
                        dataKey="count"
                      >
                        {stats.clientStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {stats.clientStats.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-slate-300 capitalize">{item.status.replace('_', ' ')}</span>
                      </div>
                      <Badge variant="outline" className="text-white border-slate-600">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Godziny pracy w tym miesiącu */}
        <Card className="col-span-7 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Godziny pracy - czerwiec 2025
            </CardTitle>
            <p className="text-sm text-slate-400">Aktywność w poszczególnych dniach</p>
          </CardHeader>
          <CardContent>
            {stats.workingHoursThisMonth.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-slate-400">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Brak aktywności w tym miesiącu</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.workingHoursThisMonth}>
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: "#94a3b8", fontSize: 11 }} 
                    />
                    <YAxis hide />
                    <Bar dataKey="hours" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Podsumowanie */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-lg font-bold text-purple-400">{stats.totalWorkingDays}</div>
                <div className="text-slate-400">Dni pracy</div>
              </div>
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-lg font-bold text-purple-400">{stats.totalWorkingHours}h</div>
                <div className="text-slate-400">Łączne godziny</div>
              </div>
              <div className="text-center p-3 bg-slate-700/50 rounded-lg">
                <div className="text-lg font-bold text-purple-400">
                  {stats.totalWorkingDays > 0 ? Math.round(stats.totalWorkingHours / stats.totalWorkingDays * 10) / 10 : 0}h
                </div>
                <div className="text-slate-400">Średnio/dzień</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edytowalna tabela godzin pracy */}
        <Card className="col-span-12 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Godziny pracy - czerwiec 2025
            </CardTitle>
            <p className="text-sm text-slate-400">Wpisz swoje godziny pracy dla dni roboczych (pon-pt)</p>
            <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-xs text-green-400 flex items-center gap-1">
                ✅ Dane są synchronizowane z bazą danych working_hours
              </p>
            </div>
            {isUsingLocalStorage && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400 flex items-center gap-1">
                  ⚠️ Używane localStorage jako fallback (błąd połączenia z bazą)
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Dzień</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-medium">Data</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">Godziny</th>
                    <th className="text-center py-3 px-4 text-slate-300 font-medium">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {getWorkingDaysInMonth().map((day) => (
                    <tr key={day.date} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {day.dayName} {/* Nazwa dnia tygodnia */}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {day.formattedDate}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {editingDate === day.date ? (
                          <Input
                            type="number"
                            min="0"
                            max="12"
                            step="0.5"
                            value={tempHours}
                            onChange={(e) => setTempHours(e.target.value)}
                            className="w-20 mx-auto bg-slate-700 border-slate-600 text-center"
                            placeholder="0"
                            autoFocus
                          />
                        ) : (
                          <span className={`font-bold ${day.hours > 0 ? 'text-green-400' : 'text-slate-500'}`}>
                            {day.hours}h
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingDate === day.date ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveHours(day.date)}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEditing}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              >
                                Anuluj
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(day.date, day.hours)}
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edytuj
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Podsumowanie godzin */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {Object.values(workingHours).reduce((sum, hours) => sum + hours, 0)}h
                </div>
                <div className="text-sm text-slate-400">Łączne godziny</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">
                  {Object.keys(workingHours).filter(date => workingHours[date] > 0).length}
                </div>
                <div className="text-sm text-slate-400">Dni z godzinami</div>
              </div>
              <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                <div className="text-2xl font-bold text-cyan-400">
                  {Object.keys(workingHours).length > 0 
                    ? Math.round((Object.values(workingHours).reduce((sum, hours) => sum + hours, 0) / Object.keys(workingHours).filter(date => workingHours[date] > 0).length) * 10) / 10 || 0
                    : 0}h
                </div>
                <div className="text-sm text-slate-400">Średnio/dzień</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 