"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { 
  Users, 
  ArrowRight, 
  Briefcase, 
  Network, 
  RefreshCw,
  UserCheck,
  AlertCircle,
  CheckCircle2
} from "lucide-react"
import { authApi, User } from "@/lib/supabase"
import { useAuth } from "@/store/useStore"

interface ManagerHierarchyPanelProps {
  onHierarchyUpdated?: () => void
}

export function ManagerHierarchyPanel({ onHierarchyUpdated }: ManagerHierarchyPanelProps) {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [projectManagers, setProjectManagers] = useState<User[]>([])
  const [unassignedJuniorManagers, setUnassignedJuniorManagers] = useState<User[]>([])
  const [hierarchies, setHierarchies] = useState<any[]>([])
  const [selectedProjectManager, setSelectedProjectManager] = useState<string>("")
  const [selectedJuniorManager, setSelectedJuniorManager] = useState<string>("")

  // Sprawdź uprawnienia
  const canManageHierarchy = currentUser && ['szef', 'admin'].includes(currentUser.role)

  const loadData = async () => {
    if (!canManageHierarchy) return

    setLoading(true)
    try {
      // Pobierz project managerów
      const pms = await authApi.getAvailableProjectManagers()
      setProjectManagers(pms)

      // Pobierz nieprzypisanych junior managerów
      const unassigned = await authApi.getUnassignedJuniorManagers()
      setUnassignedJuniorManagers(unassigned)

      // Pobierz hierarchie dla każdego project managera
      const hierarchyData = await Promise.all(
        pms.map(async (pm) => {
          try {
            const hierarchy = await authApi.getManagerHierarchy(pm.id)
            return hierarchy
          } catch (error) {
            console.error(`Błąd ładowania hierarchii dla ${pm.full_name}:`, error)
            return {
              manager: pm,
              directReports: [],
              allSubordinates: []
            }
          }
        })
      )

      setHierarchies(hierarchyData)

    } catch (error) {
      console.error('Błąd ładowania danych hierarchii:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się załadować danych hierarchii",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssignJuniorManager = async () => {
    if (!selectedProjectManager || !selectedJuniorManager || !currentUser) {
      console.error('❌ Brak wymaganych danych:', { selectedProjectManager, selectedJuniorManager, currentUser: currentUser?.email })
      return
    }

    console.log('🔄 Rozpoczynam przypisywanie:', { selectedJuniorManager, selectedProjectManager, currentUser: currentUser.email })
    setAssigning(true)
    try {
      const result = await authApi.assignJuniorManagerToProjectManager(
        selectedJuniorManager,
        selectedProjectManager,
        currentUser
      )

      console.log('✅ Sukces przypisywania:', result)
      toast({
        title: "✅ Sukces",
        description: result.message,
        duration: 8000
      })

      // Reset form
      setSelectedProjectManager("")
      setSelectedJuniorManager("")

      // Reload data
      await loadData()

      // Notify parent
      onHierarchyUpdated?.()

    } catch (error) {
      console.error('❌ Błąd przypisywania junior managera:', error)
      
      // Bardziej szczegółowe logowanie błędu
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd - sprawdź konsolę przeglądarki'
      toast({
        title: "Błąd przypisywania",
        description: errorMessage,
        variant: "destructive",
        duration: 10000
      })
    } finally {
      setAssigning(false)
    }
  }

  useEffect(() => {
    if (canManageHierarchy) {
      loadData()
    }
  }, [canManageHierarchy])

  if (!canManageHierarchy) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-slate-400">
            <AlertCircle className="h-5 w-5" />
            <span>Brak uprawnień do zarządzania hierarchią managerów</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Przypisywanie Junior Manager do Project Manager */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Network className="h-5 w-5 text-cyan-400" />
            Przypisywanie Hierarchii
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm text-slate-400">Junior Manager</label>
              <Select value={selectedJuniorManager} onValueChange={setSelectedJuniorManager}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Wybierz Junior Manager" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {unassignedJuniorManagers.map((jm) => (
                    <SelectItem key={jm.id} value={jm.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={jm.avatar_url || '/placeholder-user.jpg'} />
                          <AvatarFallback className="bg-cyan-600 text-white text-xs">
                            {jm.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {jm.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-5 w-5 text-slate-500" />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-400">Project Manager</label>
              <Select value={selectedProjectManager} onValueChange={setSelectedProjectManager}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Wybierz Project Manager" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {projectManagers.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pm.avatar_url || '/placeholder-user.jpg'} />
                          <AvatarFallback className="bg-orange-600 text-white text-xs">
                            {pm.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {pm.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleAssignJuniorManager}
              disabled={!selectedProjectManager || !selectedJuniorManager || assigning}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {assigning ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {assigning ? 'Przypisuję...' : 'Przypisz'}
            </Button>

            <Button
              variant="outline"
              onClick={loadData}
              disabled={loading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Odśwież
            </Button>
          </div>

          {unassignedJuniorManagers.length === 0 && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              Wszyscy Junior Managerowie są przypisani
            </div>
          )}
        </CardContent>
      </Card>

      {/* Obecne Hierarchie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hierarchies.map((hierarchy) => (
          <Card key={hierarchy.manager.id} className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={hierarchy.manager.avatar_url || '/placeholder-user.jpg'} />
                  <AvatarFallback className="bg-orange-600 text-white text-xs">
                    {hierarchy.manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div>{hierarchy.manager.full_name}</div>
                  <div className="text-sm text-orange-400 font-normal">Project Manager</div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Junior Managerowie */}
              {hierarchy.directReports.filter((user: User) => user.role === 'junior_manager').map((jm: User) => (
                <div key={jm.id} className="bg-slate-700/50 p-3 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={jm.avatar_url || '/placeholder-user.jpg'} />
                      <AvatarFallback className="bg-cyan-600 text-white text-xs">
                        {jm.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-white font-medium">{jm.full_name}</span>
                    <Badge variant="secondary" className="text-xs">Junior Manager</Badge>
                  </div>
                  
                  {/* Pracownicy pod tym Junior Managerem */}
                  {hierarchy.allSubordinates.filter((emp: User) => emp.manager_id === jm.id).length > 0 && (
                    <div className="ml-6 space-y-1">
                      {hierarchy.allSubordinates.filter((emp: User) => emp.manager_id === jm.id).map((emp: User) => (
                        <div key={emp.id} className="flex items-center gap-2 text-sm text-slate-300">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={emp.avatar_url || '/placeholder-user.jpg'} />
                            <AvatarFallback className="bg-green-600 text-white text-xs">
                              {emp.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {emp.full_name}
                          <Badge variant="outline" className="text-xs">Pracownik</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Bezpośredni pracownicy Project Managera */}
              {hierarchy.directReports.filter((user: User) => user.role === 'pracownik').length > 0 && (
                <div className="bg-slate-700/30 p-3 rounded-lg">
                  <div className="text-sm text-slate-400 mb-2">Bezpośredni pracownicy:</div>
                  <div className="space-y-1">
                    {hierarchy.directReports.filter((user: User) => user.role === 'pracownik').map((emp: User) => (
                      <div key={emp.id} className="flex items-center gap-2 text-sm text-slate-300">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={emp.avatar_url || '/placeholder-user.jpg'} />
                          <AvatarFallback className="bg-green-600 text-white text-xs">
                            {emp.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {emp.full_name}
                        <Badge variant="outline" className="text-xs">Pracownik</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hierarchy.directReports.length === 0 && (
                <div className="text-slate-400 text-sm text-center py-4">
                  Brak przypisanych podwładnych
                </div>
              )}

              {/* Statystyki */}
              <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-slate-600">
                <div className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  {hierarchy.directReports.filter((u: User) => u.role === 'junior_manager').length} JM
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {hierarchy.allSubordinates.filter((u: User) => u.role === 'pracownik').length} pracowników
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-slate-400">Ładowanie hierarchii...</p>
        </div>
      )}
    </div>
  )
} 