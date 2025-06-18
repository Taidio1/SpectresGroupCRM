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
  Package,
  Search,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
  Phone,
  Clock,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import Link from "next/link"
import { useAuth } from "@/store/useStore"
import { clientsApi, getCanvasStatusColor } from "@/lib/supabase"

// Mockowane dane klientów z slotami
const mockClients = [
  { id: 1, name: 'Jan Kowalski', company: 'ABC Sp. z o.o.', status: 'canvas', slot: '8:00', phone: '+48 123 456 789' },
  { id: 2, name: 'Anna Nowak', company: 'XYZ Ltd.', status: 'canvas', slot: '9:00', phone: '+48 987 654 321' },
  { id: 3, name: 'Piotr Zieliński', company: 'DEF Group', status: 'sale', slot: '10:30', phone: '+48 111 222 333' },
  { id: 4, name: 'Maria Wiśniewska', company: 'GHI Corp.', status: 'sale', slot: '11:00', phone: '+48 444 555 666' },
  { id: 5, name: 'Tomasz Kaczmarek', company: 'JKL Inc.', status: 'antysale', slot: '13:00', phone: '+48 777 888 999' },
  { id: 6, name: 'Ewa Lewandowska', company: 'MNO Sp. z o.o.', status: 'antysale', slot: '14:30', phone: '+48 333 444 555' },
  { id: 7, name: 'Adam Szymański', company: 'PQR Ltd.', status: 'canvas', slot: '15:30', phone: '+48 666 777 888' },
  { id: 8, name: 'Katarzyna Wójcik', company: 'STU Group', status: 'sale', slot: '16:00', phone: '+48 999 000 111' },
]

// Plan dnia zgodnie z README
const dailySchedule = [
  { time: '8:00 - 10:00', type: 'canvas', color: '#06b6d4', clients: mockClients.filter(c => c.status === 'canvas' && ['8:00', '9:00'].includes(c.slot)) },
  { time: '10:10 - 12:00', type: 'sales', color: '#10b981', clients: mockClients.filter(c => c.status === 'sale' && ['10:30', '11:00'].includes(c.slot)) },
  { time: '12:30 - 15:00', type: 'antysales', color: '#f59e0b', clients: mockClients.filter(c => c.status === 'antysale' && ['13:00', '14:30'].includes(c.slot)) },
  { time: '15:10 - 16:30', type: 'canvas + sales', color: '#8b5cf6', clients: mockClients.filter(c => (c.status === 'canvas' || c.status === 'sale') && ['15:30', '16:00'].includes(c.slot)) },
]

// Ostatnie aktywności
const recentActivities = [
  { type: "client", text: "Nowy klient dodany: Jan Kowalski", time: "2m", user: "Admin" },
  { type: "status", text: "Status zmieniony na 'sale': Anna Nowak", time: "5m", user: "Manager1" },
  { type: "call", text: "Rozmowa zakończona: Piotr Zieliński", time: "8m", user: "Pracownik1" },
  { type: "note", text: "Notatka dodana: Maria Wiśniewska", time: "12m", user: "Pracownik2" },
  { type: "edit", text: "Dane zaktualizowane: Tomasz Kaczmarek", time: "15m", user: "Manager1" },
]

export function Dashboard() {
  const { user } = useAuth()
  const [statusData, setStatusData] = useState([
    { name: "Canvas", value: 0, color: "#06b6d4" },
    { name: "Sale", value: 0, color: "#10b981" },
    { name: "Antysale", value: 0, color: "#f59e0b" },
    { name: "Brak kontaktu", value: 0, color: "#6b7280" },
    { name: "Nie zainteresowany", value: 0, color: "#ef4444" },
    { name: "Zdenerwowany", value: 0, color: "#dc2626" },
    { name: "$$", value: 0, color: "#fbbf24" },
  ])
  const [loading, setLoading] = useState(true)
  const [totalClients, setTotalClients] = useState(0)
  const [clients, setClients] = useState<any[]>([])
  const [canvasStats, setCanvasStats] = useState({ high: 0, medium: 0, low: 0, total: 0 })

  // Funkcja do pobierania i filtrowania danych klientów
  const loadClientStats = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // Pobierz wszystkich klientów
      const allClients = await clientsApi.getClients(user)
      
      // Filtruj klientów według uprawnień
      let filteredClients = []
      
      if (user.role === 'szef' || user.role === 'manager') {
        // Szef i Manager widzą wszystkich klientów
        filteredClients = allClients
      } else if (user.role === 'pracownik') {
        // Pracownik widzi tylko swoich klientów i klientów ogólnych
        filteredClients = allClients.filter(client => 
          client.owner?.id === user.id || client.owner_id === user.id || !client.owner_id
        )
      } else {
        // Dla innych ról (admin) - wszystkich klientów
        filteredClients = allClients
      }
      
      // Policz statusy
      const statusCounts: Record<string, number> = {}
      filteredClients.forEach(client => {
        const status = client.status
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })
      
      // Zaktualizuj dane wykresu
      const updatedStatusData = [
        { name: "Canvas", value: statusCounts.canvas || 0, color: "#06b6d4" },
        { name: "Sale", value: statusCounts.sale || 0, color: "#10b981" },
        { name: "Antysale", value: statusCounts.antysale || 0, color: "#f59e0b" },
        { name: "Brak kontaktu", value: statusCounts.brak_kontaktu || 0, color: "#6b7280" },
        { name: "Nie zainteresowany", value: statusCounts.nie_zainteresowany || 0, color: "#ef4444" },
        { name: "Zdenerwowany", value: statusCounts.zdenerwowany || 0, color: "#dc2626" },
        { name: "$$", value: statusCounts['$$'] || 0, color: "#fbbf24" },
      ].filter(item => item.value > 0) // Pokaż tylko statusy z klientami
      
      setStatusData(updatedStatusData)
      setTotalClients(filteredClients.length)
      setClients(filteredClients)
      
      // Aktualizuj statystyki Canvas
      updateCanvasStats(filteredClients)
      
    } catch (error) {
      console.error('❌ Błąd ładowania statystyk:', error)
    } finally {
      setLoading(false)
    }
  }

  // Funkcja do aktualizacji statystyk canvas
  const updateCanvasStats = (clientsList: any[] = clients) => {
    const canvasClients = clientsList.filter(client => client.status === 'canvas')
    const stats = { high: 0, medium: 0, low: 0, total: canvasClients.length }

    canvasClients.forEach(client => {
      const { priority } = getCanvasStatusColor(client.status_changed_at)
      stats[priority]++
    })

    setCanvasStats(stats)
  }

  // Ładuj dane przy pierwszym renderze i zmianie użytkownika
  useEffect(() => {
    if (user) {
      loadClientStats()
    }
  }, [user])

  const today = new Date().toLocaleDateString('pl-PL')

  return (
    <div className="grid grid-cols-12 gap-6">
          {/* Sekcja zależna od roli - Kalendarz dla pracowników, Statystyki zespołowe dla zarządzających */}
          {user?.role === 'pracownik' ? (
            // Plan dnia - Kalendarz z slotami (tylko dla pracowników)
            <Card className="col-span-8 bg-slate-800 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white">Plan dnia - Kalendarz</CardTitle>
                  <p className="text-sm text-slate-400 mt-1">Rozkład klientów wg slotów godzinowych</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-slate-400">Live</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dailySchedule.map((slot, index) => (
                    <div key={index} className="border border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: slot.color }}
                          ></div>
                          <span className="font-medium text-white">{slot.time}</span>
                          <Badge variant="outline" className="text-xs">
                            {slot.type}
                          </Badge>
                        </div>
                        <span className="text-sm text-slate-400">
                          {slot.clients.length} klientów
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {slot.clients.length === 0 ? (
                          <div className="text-slate-500 text-sm italic">Brak klientów</div>
                        ) : (
                          slot.clients.map((client) => (
                            <div key={client.id} className="flex items-center gap-2 p-2 bg-slate-700/50 rounded">
                              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate">{client.name}</div>
                                <div className="text-xs text-slate-400 truncate">{client.company}</div>
                              </div>
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span className="text-xs text-slate-400">{client.slot}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            // Analiza Wydajności Zespołu (dla manager/szef/admin)
            <div className="col-span-8 grid grid-cols-2 gap-6">
              {/* Statystyki zespołowe */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Wydajność Zespołu
                  </CardTitle>
                  <p className="text-sm text-slate-400">Porównanie wyników pracowników</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Jan Kowalski", calls: 45, conversions: 28, rate: "62%" },
                      { name: "Anna Nowak", calls: 38, conversions: 31, rate: "82%" },
                      { name: "Piotr Zieliński", calls: 52, conversions: 35, rate: "67%" },
                      { name: "Maria Wiśniewska", calls: 41, conversions: 24, rate: "59%" },
                    ].map((employee, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-slate-600 text-slate-300 text-xs">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium text-white">{employee.name}</div>
                            <div className="text-xs text-slate-400">{employee.calls} rozmów</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-400">{employee.conversions} konwersji</div>
                          <div className="text-xs text-slate-400">{employee.rate} skuteczności</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trendy sprzedażowe */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Trendy Sprzedażowe
                  </CardTitle>
                  <p className="text-sm text-slate-400">Analiza konwersji w czasie</p>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { day: "Pon", canvas: 15, sale: 8, antysale: 3 },
                        { day: "Wt", canvas: 12, sale: 12, antysale: 2 },
                        { day: "Śr", canvas: 18, sale: 10, antysale: 4 },
                        { day: "Czw", canvas: 14, sale: 16, antysale: 1 },
                        { day: "Pt", canvas: 20, sale: 14, antysale: 5 },
                        { day: "Sob", canvas: 8, sale: 6, antysale: 1 },
                        { day: "Ndz", canvas: 5, sale: 3, antysale: 0 },
                      ]}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis hide />
                        <Line type="monotone" dataKey="canvas" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4", strokeWidth: 0, r: 3 }} />
                        <Line type="monotone" dataKey="sale" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", strokeWidth: 0, r: 3 }} />
                        <Line type="monotone" dataKey="antysale" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", strokeWidth: 0, r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                        <span className="text-slate-400">Canvas</span>
                      </div>
                      <div className="text-lg font-bold text-white mt-1">92</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-slate-400">Sale</span>
                      </div>
                      <div className="text-lg font-bold text-white mt-1">69</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-slate-400">Antysale</span>
                      </div>
                      <div className="text-lg font-bold text-white mt-1">16</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Statystyki statusów */}
          <Card className="col-span-4 bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  Statusy klientów
                  {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
                  )}
                </CardTitle>
                <p className="text-sm text-slate-400">
                  {user?.role === 'pracownik' 
                    ? 'Twoi klienci i ogólni' 
                    : 'Wszyscy klienci'
                  } ({totalClients} total)
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadClientStats}
                disabled={loading}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                </div>
              ) : statusData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400">
                  <div className="text-center">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Brak danych klientów</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {statusData.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                          <span className="text-slate-300">{item.name}</span>
                        </div>
                        <span className="font-semibold text-white">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Metryki dzienne */}
          <div className="col-span-4 space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Klienci dziś</p>
                    <p className="text-2xl font-bold text-white">{totalClients}</p>
                  </div>
                  <div className="text-cyan-400">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Rozmowy</p>
                    <p className="text-2xl font-bold text-white">24</p>
                  </div>
                  <div className="text-green-400">
                    <Phone className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Konwersja</p>
                    <p className="text-2xl font-bold text-white">68%</p>
                  </div>
                  <div className="text-green-400">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Klienci Canvas - Monitoring czasu */}
          <Card className="col-span-4 bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-cyan-400" />
                <CardTitle className="text-white">Klienci Canvas - Monitoring czasu</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadClientStats}
                disabled={loading}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <TrendingUp className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {canvasStats.total > 0 ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    {canvasStats.high > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-500/20 rounded-lg border border-red-500/30">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        <span className="text-red-400 font-semibold">{canvasStats.high}</span>
                        <span className="text-red-300 text-sm">pilnych (5+ dni)</span>
                      </div>
                    )}
                    {canvasStats.medium > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-400 font-semibold">{canvasStats.medium}</span>
                        <span className="text-yellow-300 text-sm">uwaga (2-4 dni)</span>
                      </div>
                    )}
                    {canvasStats.low > 0 && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-lg border border-green-500/30">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-green-400 font-semibold">{canvasStats.low}</span>
                        <span className="text-green-300 text-sm">świeżych (0-2 dni)</span>
                      </div>
                    )}
                  </div>
                  <div className="text-center text-sm text-slate-400">
                    Łącznie: <span className="font-medium text-white">{canvasStats.total}</span> klientów canvas
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <div className="text-center">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Brak klientów canvas</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ostatnie aktywności */}
          <Card className="col-span-4 bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Ostatnie aktywności</CardTitle>
              <Button variant="ghost" size="sm" className="text-cyan-400">
                Zobacz wszystkie
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20">
                      {activity.type === "client" && <Users className="h-4 w-4 text-cyan-400" />}
                      {activity.type === "status" && <BarChart3 className="h-4 w-4 text-cyan-400" />}
                      {activity.type === "call" && <Phone className="h-4 w-4 text-cyan-400" />}
                      {activity.type === "note" && <FileText className="h-4 w-4 text-cyan-400" />}
                      {activity.type === "edit" && <Settings className="h-4 w-4 text-cyan-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300">{activity.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{activity.user}</span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-500">{activity.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
    </div>
  )
} 