"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Shield, 
  Users, 
  Database, 
  BarChart3, 
  Settings, 
  Activity, 
  RefreshCw,
  UserPlus,
  Trash2,
  Edit,
  Crown,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Phone,
  Target,
  Clock,
  Archive,
  Zap,
  FileText,
  Download,
  ArrowUp
} from "lucide-react"
import { reportsApi, authApi, User, EmployeeStats, clientsApi } from "@/lib/supabase"
import { PerformanceDashboard } from "./performance-dashboard"
import { UserEditDialog } from "./user-edit-dialog"
import { ManagerHierarchyPanel } from "./manager-hierarchy-panel"

interface SystemStats {
  totalUsers: number
  totalClients: number
  totalActivities: number
  activeUsers: number
  dbUtilization: {
    withOwner: number
    withoutOwner: number
    total: number
    utilizationPercentage: number
  }
}

export function AdminPanel() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [activeTab, setActiveTab] = useState("overview")
  const [loading, setLoading] = useState(true)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([])
  const [phoneStats, setPhoneStats] = useState({ totalPhoneCalls: 0, totalPhoneCallsToday: 0 })
  const [performanceData, setPerformanceData] = useState<any>(null)

  // Sprawdź uprawnienia
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'szef'
  const canPromoteUsers = user?.role === 'admin' || user?.role === 'szef'

  // Funkcja ładowania statystyk systemu
  const loadSystemStats = async () => {
    if (!hasAdminAccess) return

    try {
      setLoading(true)

      // Pobierz wszystkich użytkowników
      const users = await authApi.getAllUsersForDisplay()
      setAllUsers(users)

      // Pobierz statystyki pracowników
      const empStats = await reportsApi.getEmployeeStats(user!)
      setEmployeeStats(empStats)

      // Pobierz statystyki wykorzystania bazy
      const dbUtil = await reportsApi.getDatabaseUtilization()

      // Pobierz statystyki telefonów
      const phoneStatsData = await reportsApi.getPhoneClicksStats(user!)
      setPhoneStats(phoneStatsData)

      // Pobierz wszystkich klientów dla statystyk
      const allClients = await clientsApi.getClients(user!)

      const stats: SystemStats = {
        totalUsers: users.length,
        totalClients: allClients.length,
        totalActivities: phoneStatsData.totalPhoneCalls,
        activeUsers: users.filter(u => u.role === 'pracownik').length,
        dbUtilization: dbUtil
      }

      setSystemStats(stats)

    } catch (error) {
      console.error('❌ Błąd ładowania statystyk:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się załadować statystyk systemu",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Funkcja resetowania właścicieli klientów
  const handleResetClientOwners = async () => {
    if (!user || user.role !== 'admin') {
      toast({
        title: "Brak uprawnień",
        description: "Tylko administrator może resetować właścicieli klientów",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await reportsApi.resetAllClientOwners(user)
      
      toast({
        title: "✅ Sukces",
        description: result.message,
        duration: 10000
      })

      // Odśwież statystyki
      loadSystemStats()

    } catch (error: any) {
      console.error('❌ Błąd resetowania:', error)
      toast({
        title: "Błąd",
        description: error.message || "Nie udało się zresetować właścicieli",
        variant: "destructive"
      })
    }
  }

  // Funkcja pobierania danych wydajności
  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/admin/performance-check')
      const data = await response.json()
      setPerformanceData(data)
    } catch (error) {
      console.error('❌ Błąd pobierania danych wydajności:', error)
    }
  }

  // Funkcja obsługi aktualizacji użytkownika
  const handleUserUpdated = (updatedUser: User) => {
    setAllUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    )
  }

  // Ładowanie danych przy montowaniu komponentu
  useEffect(() => {
    if (hasAdminAccess) {
      loadSystemStats()
      loadPerformanceData()
    }
  }, [hasAdminAccess])

  // Jeśli brak uprawnień
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-400" />
              Brak Dostępu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-300">
                Panel administracyjny jest dostępny tylko dla użytkowników z rolą 
                <strong> admin </strong> lub <strong> szef</strong>.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <div className="text-slate-400 text-sm">
                Twoja rola: <Badge variant="outline" className="ml-1">{user?.role}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Crown className="h-8 w-8 text-amber-400" />
              Admin Panel
            </h1>
            <div className="text-slate-400 mt-1">
              Panel administracyjny Spectres Group CRM
              <Badge variant="outline" className="ml-2 text-xs">
                {user?.role === 'admin' ? 'Administrator' : 'Szef'}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={loadSystemStats}
              disabled={loading}
              className="text-cyan-400 border-slate-600 hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        {!loading && systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Użytkownicy</p>
                    <p className="text-2xl font-bold text-white">{systemStats.totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-cyan-400" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {systemStats.activeUsers} pracowników
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Klienci</p>
                    <p className="text-2xl font-bold text-white">{systemStats.totalClients}</p>
                  </div>
                  <Target className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {systemStats.dbUtilization.utilizationPercentage}% przypisanych
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Telefony</p>
                    <p className="text-2xl font-bold text-white">{phoneStats.totalPhoneCalls}</p>
                  </div>
                  <Phone className="h-8 w-8 text-amber-400" />
                </div>
                <div className="mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {phoneStats.totalPhoneCallsToday} dziś
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">System</p>
                    <p className="text-2xl font-bold text-green-400">Online</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-400" />
                </div>
                <div className="mt-2">
                  <Badge variant="default" className="text-xs bg-green-600">
                    Sprawny
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content - Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Przegląd
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-slate-700">
              <Users className="h-4 w-4 mr-2" />
              Użytkownicy
            </TabsTrigger>
            <TabsTrigger value="hierarchy" className="data-[state=active]:bg-slate-700">
              <ArrowUp className="h-4 w-4 mr-2" />
              Hierarchia
            </TabsTrigger>
            <TabsTrigger value="database" className="data-[state=active]:bg-slate-700">
              <Database className="h-4 w-4 mr-2" />
              Baza Danych
            </TabsTrigger>
            <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              Wydajność
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-slate-700">
              <Settings className="h-4 w-4 mr-2" />
              Ustawienia
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Pracownicy */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-400" />
                    Top Pracownicy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {employeeStats.length > 0 ? (
                    <div className="space-y-3">
                      {employeeStats
                        .sort((a, b) => (b.monthly_sale || 0) - (a.monthly_sale || 0))
                        .slice(0, 5)
                        .map((emp, index) => (
                          <div key={emp.user_id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 text-white font-bold text-sm">
                                {index + 1}
                              </div>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={emp.user?.avatar_url || '/placeholder-user.jpg'} />
                                <AvatarFallback className="bg-cyan-600 text-white text-xs">
                                  {emp.user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white text-sm font-medium">{emp.user?.full_name}</p>
                                <p className="text-slate-400 text-xs">{emp.user?.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-green-400 font-bold">{emp.monthly_sale || 0}</p>
                              <p className="text-slate-400 text-xs">sales</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Brak danych pracowników</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Wykorzystanie Bazy */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5 text-cyan-400" />
                    Wykorzystanie Bazy Danych
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {systemStats?.dbUtilization && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Klienci z właścicielem:</span>
                        <span className="text-white font-bold">{systemStats.dbUtilization.withOwner}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Klienci bez właściciela:</span>
                        <span className="text-white font-bold">{systemStats.dbUtilization.withoutOwner}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Łącznie:</span>
                        <span className="text-white font-bold">{systemStats.dbUtilization.total}</span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Wykorzystanie:</span>
                          <span className="text-cyan-400">{systemStats.dbUtilization.utilizationPercentage}%</span>
                        </div>
                        <Progress 
                          value={systemStats.dbUtilization.utilizationPercentage} 
                          className="h-2"
                        />
                      </div>

                      {user?.role === 'admin' && (
                        <Button
                          variant="outline"
                          onClick={handleResetClientOwners}
                          className="w-full mt-4 text-orange-400 border-orange-500/50 hover:bg-orange-500/10"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Resetuj Właścicieli Klientów
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Zarządzanie Użytkownikami
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-400">Użytkownik</TableHead>
                      <TableHead className="text-slate-400">Email</TableHead>
                      <TableHead className="text-slate-400">Rola</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Akcje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allUsers.map((userItem) => (
                      <TableRow key={userItem.id} className="border-slate-700">
                        <TableCell className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={userItem.avatar_url || '/placeholder-user.jpg'} />
                            <AvatarFallback className="bg-cyan-600 text-white text-xs">
                              {userItem.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex items-center gap-2">
                            <span className="text-white">{userItem.full_name}</span>
                            {canPromoteUsers && userItem.role === 'junior_manager' && (
                              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md">
                                <ArrowUp className="h-3 w-3 text-amber-400" />
                                <span className="text-xs text-amber-400">Możliwość promocji</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400">{userItem.email}</TableCell>
                        <TableCell>
                          <Badge variant={
                            userItem.role === 'admin' ? 'destructive' :
                            userItem.role === 'szef' ? 'default' :
                            userItem.role === 'manager' ? 'secondary' :
                            userItem.role === 'project_manager' ? 'secondary' :
                            userItem.role === 'junior_manager' ? 'secondary' :
                            'outline'
                          }>
                            {userItem.role === 'admin' && 'Administrator'}
                            {userItem.role === 'szef' && 'Szef'}
                            {userItem.role === 'manager' && 'Manager'}
                            {userItem.role === 'project_manager' && 'Project Manager'}
                            {userItem.role === 'junior_manager' && 'Junior Manager'}
                            {userItem.role === 'pracownik' && 'Pracownik'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-600">
                            Aktywny
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <UserEditDialog 
                              user={userItem} 
                              onUserUpdated={handleUserUpdated}
                            />
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hierarchy Tab */}
          <TabsContent value="hierarchy" className="space-y-6">
            <ManagerHierarchyPanel onHierarchyUpdated={loadSystemStats} />
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Statystyki Bazy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Tabela 'users':</span>
                        <span className="text-white font-bold">{systemStats?.totalUsers || 0} rekordów</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Tabela 'clients':</span>
                        <span className="text-white font-bold">{systemStats?.totalClients || 0} rekordów</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-700/50">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Tabela 'activity_logs':</span>
                        <span className="text-white font-bold">{systemStats?.totalActivities || 0} rekordów</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Archive className="h-5 w-5" />
                    Operacje Konserwacyjne
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full text-cyan-400 border-slate-600 hover:bg-slate-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Odśwież Materialized Views
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-amber-400 border-slate-600 hover:bg-slate-700"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archiwizuj Stare Logi
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-green-400 border-slate-600 hover:bg-slate-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Optymalizuj Bazę Danych
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <PerformanceDashboard />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Ustawienia Systemu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-medium mb-3">Konfiguracja Ogólna</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                        <div>
                          <p className="text-white text-sm">Automatyczne odświeżanie</p>
                          <p className="text-slate-400 text-xs">Odświeżaj dashboard co 5 minut</p>
                        </div>
                        <Badge variant="default" className="bg-green-600">Włączone</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50">
                        <div>
                          <p className="text-white text-sm">Powiadomienia email</p>
                          <p className="text-slate-400 text-xs">Powiadomienia o błędach systemu</p>
                        </div>
                        <Badge variant="outline">Wyłączone</Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-white font-medium mb-3">Raporty i Eksport</h3>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full text-cyan-400 border-slate-600 hover:bg-slate-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Eksportuj Dane Użytkowników
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-green-400 border-slate-600 hover:bg-slate-700"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Generuj Raport Systemu
                      </Button>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>
    </div>
  )
} 