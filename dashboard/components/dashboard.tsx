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

// Statystyki statusów klientów
const statusData = [
  { name: "Canvas", value: 3, color: "#06b6d4" },
  { name: "Sales", value: 3, color: "#10b981" },
  { name: "Antysales", value: 2, color: "#f59e0b" },
]

// Dane aktywności pracowników
const employeeStats = [
  { name: "Mon", admin: 12, manager: 8, pracownik: 15 },
  { name: "Tue", admin: 15, manager: 10, pracownik: 18 },
  { name: "Wed", admin: 8, manager: 12, pracownik: 12 },
  { name: "Thu", admin: 18, manager: 15, pracownik: 20 },
  { name: "Fri", admin: 14, manager: 9, pracownik: 16 },
  { name: "Sat", admin: 6, manager: 4, pracownik: 8 },
  { name: "Sun", admin: 4, manager: 2, pracownik: 5 },
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
  const today = new Date().toLocaleDateString('pl-PL')

  return (
    <div className="grid grid-cols-12 gap-6">
          {/* Plan dnia - Kalendarz z slotami */}
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

          {/* Statystyki statusów */}
          <Card className="col-span-4 bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Statusy klientów</CardTitle>
              <p className="text-sm text-slate-400">Rozkład dzisiejszy</p>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Metryki dzienne */}
          <div className="col-span-4 space-y-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Klienci dziś</p>
                    <p className="text-2xl font-bold text-white">{mockClients.length}</p>
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

          {/* Aktywność pracowników */}
          <Card className="col-span-4 bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Aktywność pracowników</CardTitle>
              <Select defaultValue="weekly">
                <SelectTrigger className="w-24 bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Tydzień</SelectItem>
                  <SelectItem value="monthly">Miesiąc</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={employeeStats}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
                    <YAxis hide />
                    <Line type="monotone" dataKey="admin" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="manager" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pracownik" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-400">Admin</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-slate-400">Manager</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                  <span className="text-slate-400">Pracownik</span>
                </div>
              </div>
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