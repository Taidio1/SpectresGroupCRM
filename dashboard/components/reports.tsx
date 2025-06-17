"use client"

import { useState } from "react"
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
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

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

export function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('today')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const today = new Date().toLocaleDateString('pl-PL')

  const handleExportPDF = () => {
    alert('Eksport do PDF - funkcjonalność w przygotowaniu')
  }

  const handleExportCSV = () => {
    alert('Eksport do CSV - funkcjonalność w przygotowaniu')
  }

  return (
    <div className="w-full h-full">
      {/* Header - pełna szerokość */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analityka i statystyki</h1>
          <p className="text-slate-400">Szczegółowe raporty wydajności - {today}</p>
        </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
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
        </div>
    </div>
  )
} 