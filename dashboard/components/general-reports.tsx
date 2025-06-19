"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  Phone,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  Clock,
  Calendar,
  Filter,
  Download,
  PieChart,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from "recharts"

// Dane ogólnych statystyk
const overallStats = {
  totalEmployees: 5,
  totalPhoneCalls: 838,
  totalPhoneCallsToday: 136,
  avgConversionRate: 69.3,
  totalClients: 500,
  activeClients: 280,
  avgCallDuration: "8:42",
  totalStatusChanges: 1285,
  efficiency: 84.2
}

// Dane do wykresów
const dailyStatsData = [
  { day: 'Pon', telefony: 145, konwersja: 68, klienci: 95 },
  { day: 'Wt', telefony: 189, konwersja: 72, klienci: 112 },
  { day: 'Śr', telefony: 134, konwersja: 65, klienci: 89 },
  { day: 'Czw', telefony: 167, konwersja: 71, klienci: 103 },
  { day: 'Pt', telefony: 203, konwersja: 78, klienci: 128 },
  { day: 'Sob', telefony: 98, konwersja: 62, klienci: 76 },
  { day: 'Nd', telefony: 67, konwersja: 58, klienci: 45 },
]

const statusDistributionData = [
  { name: 'Canvas', value: 241, color: '#06b6d4' },
  { name: 'Sale', value: 162, color: '#10b981' },
  { name: 'Antysale', value: 91, color: '#f59e0b' },
  { name: 'Brak kontaktu', value: 198, color: '#6b7280' },
  { name: 'Nie zainteresowany', value: 105, color: '#ef4444' },
  { name: 'Zdenerwowany', value: 41, color: '#dc2626' },
]

const employeePerformanceData = [
  { name: 'Jan K.', telefony: 145, konwersja: 68 },
  { name: 'Anna N.', telefony: 189, konwersja: 75 },
  { name: 'Piotr Z.', telefony: 167, konwersja: 66 },
  { name: 'Maria W.', telefony: 203, konwersja: 79 },
  { name: 'Tomasz K.', telefony: 134, konwersja: 59 },
]

const monthlyTrendData = [
  { month: 'Sty', telefony: 2890, konwersja: 65, klienci: 1890 },
  { month: 'Lut', telefony: 3120, konwersja: 68, klienci: 2100 },
  { month: 'Mar', telefony: 3450, konwersja: 71, klienci: 2350 },
  { month: 'Kwi', telefony: 3220, konwersja: 69, klienci: 2200 },
  { month: 'Maj', telefony: 3680, konwersja: 73, klienci: 2480 },
  { month: 'Cze', telefony: 3890, konwersja: 75, klienci: 2650 },
]

export function GeneralReports() {
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const today = new Date().toLocaleDateString('pl-PL')

  const handleExportPDF = () => {
    alert('Eksport do PDF - funkcjonalność w przygotowaniu')
  }

  const handleExportCSV = () => {
    alert('Eksport do CSV - funkcjonalność w przygotowaniu')
  }

  return (
    <div className="w-full h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Tydzień</SelectItem>
                <SelectItem value="month">Miesiąc</SelectItem>
                <SelectItem value="quarter">Kwartał</SelectItem>
                <SelectItem value="year">Rok</SelectItem>
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

      {/* Kluczowe metryki */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Łączne telefony</p>
                <p className="text-3xl font-bold text-white">{overallStats.totalPhoneCalls}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+{overallStats.totalPhoneCallsToday} dziś</span>
                </div>
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
                <p className="text-sm text-slate-400">Średnia konwersja</p>
                <p className="text-3xl font-bold text-white">{overallStats.avgConversionRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">+2.3% vs poprzedni okres</span>
                </div>
              </div>
              <div className="text-green-400">
                <Target className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Aktywni klienci</p>
                <p className="text-3xl font-bold text-white">{overallStats.activeClients}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-sm text-slate-400">z {overallStats.totalClients} ogółem</span>
                </div>
              </div>
              <div className="text-blue-400">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ogólna efektywność</p>
                <p className="text-3xl font-bold text-white">{overallStats.efficiency}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Bardzo dobra</span>
                </div>
              </div>
              <div className="text-purple-400">
                <Award className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Trend tygodniowy */}
        <Card className="col-span-8 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Trend wydajności zespołu
            </CardTitle>
            <p className="text-sm text-slate-400">Telefony, konwersja i klienci w czasie</p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyStatsData}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 12 }} 
                  />
                  <YAxis hide />
                  <Line type="monotone" dataKey="telefony" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 4 }} />
                  <Line type="monotone" dataKey="konwersja" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", r: 4 }} />
                  <Line type="monotone" dataKey="klienci" stroke="#f59e0b" strokeWidth={3} dot={{ fill: "#f59e0b", r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-8 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span className="text-slate-400">Telefony</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-slate-400">Konwersja (%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-slate-400">Klienci</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rozkład statusów */}
        <Card className="col-span-4 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Rozkład statusów
            </CardTitle>
            <p className="text-sm text-slate-400">Łączne zmiany statusów</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie 
                    data={statusDistributionData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={50} 
                    outerRadius={90} 
                    dataKey="value"
                  >
                    {statusDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4">
              {statusDistributionData.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Wydajność pracowników */}
        <Card className="col-span-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Porównanie wydajności pracowników</CardTitle>
            <p className="text-sm text-slate-400">Telefony vs konwersja</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeePerformanceData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 11 }} 
                  />
                  <YAxis hide />
                  <Bar dataKey="telefony" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="konwersja" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span className="text-slate-400">Telefony</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-slate-400">Konwersja (%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trend miesięczny */}
        <Card className="col-span-6 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Trend miesięczny</CardTitle>
            <p className="text-sm text-slate-400">Rozwój w czasie</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#94a3b8", fontSize: 12 }} 
                  />
                  <YAxis hide />
                  <Line type="monotone" dataKey="telefony" stroke="#06b6d4" strokeWidth={2} />
                  <Line type="monotone" dataKey="klienci" stroke="#f59e0b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span className="text-slate-400">Telefony</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-slate-400">Klienci</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Podsumowanie zespołu */}
        <Card className="col-span-12 bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Podsumowanie zespołu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-6">
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-cyan-400">{overallStats.totalEmployees}</div>
                <div className="text-sm text-slate-400">Aktywnych pracowników</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{overallStats.avgCallDuration}</div>
                <div className="text-sm text-slate-400">Średni czas rozmowy</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{overallStats.totalStatusChanges}</div>
                <div className="text-sm text-slate-400">Łączne zmiany statusów</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{Math.round(overallStats.totalPhoneCalls / overallStats.totalEmployees)}</div>
                <div className="text-sm text-slate-400">Średnio telefonów/pracownik</div>
              </div>
              <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                <div className="text-2xl font-bold text-orange-400">{Math.round(overallStats.activeClients / overallStats.totalEmployees)}</div>
                <div className="text-sm text-slate-400">Średnio klientów/pracownik</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 