"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/store/useStore"
import { callsApi } from "@/lib/supabase"
import type { CallRecord } from "@/lib/supabase"
import { usePermissions } from "@/hooks/usePermissions"
import { LocationFilter } from "@/components/location-filter"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/hooks/use-toast"
import { 
  Phone, 
  Search, 
  Calendar, 
  Building2, 
  User, 
  MapPin,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
  RefreshCw,
  Download,
  MessageSquare
} from "lucide-react"
import { format } from "date-fns"
import { pl } from "date-fns/locale"

/**
 * 📞 TABELA POŁĄCZEŃ TELEFONICZNYCH
 * 
 * Wyświetla historię połączeń z filtrami według uprawnień użytkownika:
 * - Admin/Szef: wszystkie z wybranego kraju  
 * - Menedżerowie: wszystkie z ich lokalizacji
 * - Pracownik: tylko swoje połączenia
 */
export function CallsTable() {
  const { user } = useAuth()
  const permissions = usePermissions()
  
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDateFrom, setSelectedDateFrom] = useState("")
  const [selectedDateTo, setSelectedDateTo] = useState("")
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalCalls: number
    callsToday: number
    callsThisWeek: number
    callsThisMonth: number
    topCallers: Array<{ name: string, role: string, count: number, avatar?: string }>
  }>({
    totalCalls: 0,
    callsToday: 0,
    callsThisWeek: 0,
    callsThisMonth: 0,
    topCallers: []
  })

  // Załaduj połączenia
  const loadCalls = async () => {
    if (!user) return

    setLoading(true)
    try {
      console.log('📞 Ładowanie połączeń...', { 
        locationId: selectedLocationId,
        role: user.role,
        permissions 
      })

      const filter: any = {
        locationId: selectedLocationId,
        limit: 200
      }

      if (selectedDateFrom) {
        filter.startDate = selectedDateFrom + 'T00:00:00'
      }
      if (selectedDateTo) {
        filter.endDate = selectedDateTo + 'T23:59:59'
      }

      const [callsData, statsData] = await Promise.all([
        callsApi.getCalls(user, filter),
        callsApi.getCallsStats(user, filter)
      ])

      setCalls(callsData)
      setStats(statsData)

      console.log(`✅ Załadowano ${callsData.length} połączeń`)

    } catch (error) {
      console.error('❌ Błąd ładowania połączeń:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się załadować historii połączeń",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Załaduj dane przy zmianie parametrów
  useEffect(() => {
    loadCalls()
  }, [user, selectedLocationId, selectedDateFrom, selectedDateTo])

  // Filtrowanie po wyszukiwaniu
  const filteredCalls = calls.filter(call => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      call.client_name.toLowerCase().includes(searchLower) ||
      call.client_company.toLowerCase().includes(searchLower) ||
      call.client_phone.includes(searchQuery) ||
      call.caller_name.toLowerCase().includes(searchLower)
    )
  })

  // Formatowanie daty i czasu
  const formatCallTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return {
        date: format(date, 'dd.MM.yyyy', { locale: pl }),
        time: format(date, 'HH:mm:ss', { locale: pl }),
        relative: format(date, 'EEEE, dd MMMM', { locale: pl })
      }
    } catch {
      return { date: 'Błędna data', time: '', relative: '' }
    }
  }

     // Funkcja eksportu do CSV
   const exportToCsv = () => {
     const csvData = filteredCalls.map(call => {
       const timeInfo = formatCallTime(call.call_timestamp)
       return {
         'Data': timeInfo.date,
         'Godzina': timeInfo.time,
         'Klient': call.client_name,
         'Firma': call.client_company,
         'Telefon': call.client_phone,
         'Dzwonił': call.caller_name,
         'Rola': call.caller_role,
         'Kraj': call.location_name || 'Brak',
         'Kod kraju': call.location_code || 'Brak'
       }
     })

     const headers = Object.keys(csvData[0] || {})
     const csvContent = [
       headers.join(','),
       ...csvData.map(row => headers.map(header => `"${(row as any)[header] || ''}"`).join(','))
     ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `polaczenia_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (!user) {
    return <div className="p-4 text-center text-muted-foreground">Ładowanie...</div>
  }

  return (
    <div className="space-y-6">
      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Rozmowy</p>
                <p className="text-3xl font-bold text-white">{stats.totalCalls}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+8% vs wczoraj</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Phone className="h-6 w-6 text-cyan-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Dziś</p>
                <p className="text-3xl font-bold text-white">{stats.callsToday}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+12% vs wczoraj</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Konwersja</p>
                <p className="text-3xl font-bold text-white">
                  {stats.totalCalls > 0 ? Math.round((stats.callsThisWeek / stats.totalCalls) * 100) : 0}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-400">-3% vs wczoraj</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-orange-400" />
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
              <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtry */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="h-5 w-5" />
            Filtry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtr lokalizacji - tylko dla uprawnionych */}
            {permissions.canFilterByLocation && (
                             <div className="space-y-2">
                 <Label className="text-slate-300">Kraj/Lokalizacja</Label>
                                 <LocationFilter
                   selectedLocationId={selectedLocationId}
                   onLocationChange={setSelectedLocationId}
                   showAllOption={permissions.canViewAllLocations}
                 />
              </div>
            )}

                         {/* Wyszukiwanie */}
             <div className="space-y-2">
               <Label className="text-slate-300">Szukaj</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                 <Input
                   placeholder="Klient, firma, telefon..."
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                 />
              </div>
            </div>

                         {/* Data od */}
             <div className="space-y-2">
               <Label className="text-slate-300">Data od</Label>
               <Input
                 type="date"
                 value={selectedDateFrom}
                 onChange={(e) => setSelectedDateFrom(e.target.value)}
                 className="bg-slate-700 border-slate-600 text-white"
               />
             </div>

             {/* Data do */}
             <div className="space-y-2">
               <Label className="text-slate-300">Data do</Label>
               <Input
                 type="date"
                 value={selectedDateTo}
                 onChange={(e) => setSelectedDateTo(e.target.value)}
                 className="bg-slate-700 border-slate-600 text-white"
               />
             </div>
          </div>

                     <div className="flex gap-2">
             <Button onClick={loadCalls} disabled={loading} variant="outline" className="border-slate-600 hover:bg-slate-700 text-white">
               <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
               Odśwież
             </Button>
             
             {filteredCalls.length > 0 && (
               <Button onClick={exportToCsv} className="bg-green-500 hover:bg-green-600 text-white">
                 <Download className="h-4 w-4 mr-2" />
                 CSV
               </Button>
             )}
           </div>
        </CardContent>
      </Card>

      {/* Tabela połączeń */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-cyan-400" />
              Historia połączeń
            </div>
            <div className="text-sm text-slate-400">
              Znaleziono: {filteredCalls.length} połączeń
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              <span>Ładowanie połączeń...</span>
            </div>
          ) : filteredCalls.length === 0 ? (
                         <div className="text-center p-8 text-slate-400">
               <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
               <p className="text-lg font-medium text-white">Brak połączeń</p>
               <p className="text-sm">
                 {calls.length === 0 
                   ? "Nie znaleziono żadnych połączeń w wybranym okresie"
                   : "Brak połączeń pasujących do kryteriów wyszukiwania"
                 }
               </p>
             </div>
                     ) : (
             <div className="rounded-md border border-slate-700">
               <Table>
                 <TableHeader>
                   <TableRow className="border-slate-700">
                     <TableHead className="text-slate-300">Data i godzina</TableHead>
                     <TableHead className="text-slate-300">Klient</TableHead>
                     <TableHead className="text-slate-300">Telefon</TableHead>
                     <TableHead className="text-slate-300">Dzwonił</TableHead>
                     {permissions.canViewAllLocations && <TableHead className="text-slate-300">Kraj</TableHead>}
                   </TableRow>
                 </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => {
                    const timeInfo = formatCallTime(call.call_timestamp)
                    
                                         return (
                       <TableRow key={call.id} className="border-slate-700 hover:bg-slate-700/50">
                         <TableCell>
                           <div>
                             <div className="font-medium text-white">{timeInfo.date}</div>
                             <div className="text-sm text-slate-400">{timeInfo.time}</div>
                           </div>
                         </TableCell>
                         
                         <TableCell>
                           <div>
                             <div className="font-medium text-white">{call.client_name}</div>
                             <div className="text-sm text-slate-400 flex items-center gap-1">
                               <Building2 className="h-3 w-3" />
                               {call.client_company}
                             </div>
                           </div>
                         </TableCell>
                        
                                                 <TableCell>
                           <button
                             onClick={() => window.open(`tel:${call.client_phone}`, '_self')}
                             className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline"
                           >
                             <Phone className="h-4 w-4" />
                             {call.client_phone}
                           </button>
                         </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={call.caller_avatar || ''} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                                                         <div>
                               <div className="font-medium text-white">{call.caller_name}</div>
                               <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                                 {call.caller_role}
                               </Badge>
                             </div>
                          </div>
                        </TableCell>
                        
                        {permissions.canViewAllLocations && (
                          <TableCell>
                                                         {call.location_name ? (
                               <div className="flex items-center gap-2">
                                 <MapPin className="h-4 w-4 text-slate-400" />
                                 <span className="text-white">{call.location_name}</span>
                                 <Badge variant="outline" className="border-slate-600 text-slate-300">{call.location_code}</Badge>
                               </div>
                             ) : (
                               <span className="text-slate-400">Brak</span>
                             )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top dzwoniący */}
      {stats.topCallers.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="h-5 w-5 text-orange-400" />
              Najaktywniejszi
            </CardTitle>
            <CardDescription className="text-slate-400">
              Użytkownicy z największą liczbą połączeń w wybranym okresie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCallers.map((caller, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">
                      {index + 1}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={caller.avatar || ''} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-white">{caller.name}</div>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                        {caller.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-white">{caller.count}</div>
                    <div className="text-sm text-slate-400">połączeń</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 