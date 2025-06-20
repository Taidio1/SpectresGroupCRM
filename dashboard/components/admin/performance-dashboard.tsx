"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  RefreshCw, 
  Database, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  BarChart3,
  Zap,
  Archive
} from "lucide-react"

interface PerformanceData {
  success: boolean
  timestamp: string
  tableStats?: {
    table_name: string
    record_count: number
    table_size: string
    last_updated?: string
  }[]
  viewFreshness?: {
    lastUpdate: string | null
    minutesSinceUpdate: number
    isStale: boolean
  }
  recommendations: string[]
  systemHealth?: {
    viewsStale: boolean
    tablesHealthy: boolean
    overallStatus: 'healthy' | 'warning' | 'error'
  }
}

/**
 * 🚀 PERFORMANCE DASHBOARD - Komponent dla adminów
 * 
 * Monitoruje wydajność systemu i materializowane widoki
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 */
export function PerformanceDashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [perfData, setPerfData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Sprawdź czy user ma uprawnienia admin
  const hasAdminAccess = user?.role === 'admin'

  // Funkcja pobierania danych wydajności
  const fetchPerformanceData = async () => {
    if (!hasAdminAccess) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/performance-check')
      const data = await response.json()
      
      setPerfData(data)
      setLastRefresh(new Date())
      
      if (!data.success) {
        toast({
          title: "Błąd",
          description: data.error || "Nie udało się pobrać danych wydajności",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Błąd pobierania danych wydajności:', error)
      toast({
        title: "Błąd połączenia",
        description: "Nie udało się połączyć z API wydajności",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Funkcja manualnej optymalizacji
  const handleOptimizeSystem = async () => {
    if (!hasAdminAccess) return

    setOptimizing(true)
    try {
      const response = await fetch('/api/admin/performance-check', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✅ Optymalizacja zakończona",
          description: `System zoptymalizowany w ${data.duration}`,
          duration: 5000
        })
        
        // Odśwież dane po optymalizacji
        setTimeout(() => {
          fetchPerformanceData()
        }, 2000)
      } else {
        toast({
          title: "Błąd optymalizacji",
          description: data.error || "Nie udało się zoptymalizować systemu",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('❌ Błąd optymalizacji:', error)
      toast({
        title: "Błąd",
        description: "Nie udało się uruchomić optymalizacji",
        variant: "destructive"
      })
    } finally {
      setOptimizing(false)
    }
  }

  // Automatyczne odświeżanie co 5 minut
  useEffect(() => {
    if (hasAdminAccess) {
      fetchPerformanceData()
      
      const interval = setInterval(fetchPerformanceData, 5 * 60 * 1000) // 5 minut
      return () => clearInterval(interval)
    }
  }, [hasAdminAccess])

  // Jeśli user nie jest adminem
  if (!hasAdminAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak uprawnień</h3>
            <p className="text-muted-foreground">
              Performance Dashboard jest dostępny tylko dla administratorów
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': 
        return <Badge variant="default" className="bg-green-100 text-green-800">Zdrowy</Badge>
      case 'warning': 
        return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">Ostrzeżenie</Badge>
      case 'error': 
        return <Badge variant="destructive">Błąd</Badge>
      default: 
        return <Badge variant="secondary">Nieznany</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitorowanie wydajności i optymalizacja systemu
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchPerformanceData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
          
          <Button
            onClick={handleOptimizeSystem}
            disabled={optimizing}
            className="flex items-center gap-2"
          >
            <Zap className={`h-4 w-4 ${optimizing ? 'animate-pulse' : ''}`} />
            {optimizing ? 'Optymalizuję...' : 'Optymalizuj System'}
          </Button>
        </div>
      </div>

      {/* Status ogólny */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status Systemu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg border">
              <div className={`text-2xl font-bold ${getStatusColor(perfData?.systemHealth?.overallStatus || 'unknown')}`}>
                {perfData?.systemHealth?.overallStatus === 'healthy' && <CheckCircle className="h-8 w-8 mx-auto mb-2" />}
                {perfData?.systemHealth?.overallStatus === 'warning' && <AlertTriangle className="h-8 w-8 mx-auto mb-2" />}
                {perfData?.systemHealth?.overallStatus === 'error' && <AlertTriangle className="h-8 w-8 mx-auto mb-2" />}
              </div>
              <p className="text-sm font-medium">Status Ogólny</p>
              {perfData?.systemHealth && getStatusBadge(perfData.systemHealth.overallStatus)}
            </div>
            
            <div className="text-center p-4 rounded-lg border">
              <div className="text-2xl font-bold">
                {perfData?.viewFreshness?.isStale ? '⚠️' : '✅'}
              </div>
              <p className="text-sm font-medium">Materializowane Widoki</p>
              <Badge variant={perfData?.viewFreshness?.isStale ? "destructive" : "default"}>
                {perfData?.viewFreshness?.isStale ? 'Nieaktualne' : 'Aktualne'}
              </Badge>
            </div>
            
            <div className="text-center p-4 rounded-lg border">
              <div className="text-2xl font-bold">
                {perfData?.tableStats?.length || 0}
              </div>
              <p className="text-sm font-medium">Monitorowane Tabele</p>
              <Badge variant="secondary">
                {perfData?.systemHealth?.tablesHealthy ? 'Sprawne' : 'Sprawdzam...'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statystyki baz danych */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Statystyki Bazy Danych
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfData?.tableStats && perfData.tableStats.length > 0 ? (
              <div className="space-y-3">
                {perfData.tableStats.map((stat, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <span className="font-medium">{stat.table_name}</span>
                      <p className="text-sm text-muted-foreground">
                        {stat.record_count?.toLocaleString()} rekordów
                      </p>
                    </div>
                    <Badge variant="outline">
                      {stat.table_size}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Ładowanie...' : 'Brak danych statystyk'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Świeżość widoków */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Świeżość Widoków
            </CardTitle>
          </CardHeader>
          <CardContent>
            {perfData?.viewFreshness ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Ostatnia aktualizacja:</span>
                  <span className="font-mono text-sm">
                    {perfData.viewFreshness.lastUpdate 
                      ? new Date(perfData.viewFreshness.lastUpdate).toLocaleString()
                      : 'Nieznana'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Czas od aktualizacji:</span>
                  <span className={`font-semibold ${perfData.viewFreshness.isStale ? 'text-red-500' : 'text-green-500'}`}>
                    {perfData.viewFreshness.minutesSinceUpdate === Infinity 
                      ? 'Nieznany' 
                      : `${perfData.viewFreshness.minutesSinceUpdate} min`
                    }
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Świeżość</span>
                    <span>{perfData.viewFreshness.isStale ? 'Wymaga odświeżenia' : 'Aktualne'}</span>
                  </div>
                  <Progress 
                    value={perfData.viewFreshness.isStale ? 25 : 100} 
                    className="h-2"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {loading ? 'Sprawdzam świeżość...' : 'Brak danych o widokach'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rekomendacje */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Rekomendacje Wydajności
          </CardTitle>
        </CardHeader>
        <CardContent>
          {perfData?.recommendations && perfData.recommendations.length > 0 ? (
            <div className="space-y-2">
              {perfData.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <Archive className="h-4 w-4 mt-0.5 text-blue-500" />
                  <span className="text-sm">{recommendation}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {loading ? 'Generuję rekomendacje...' : 'Brak rekomendacji'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informacje o ostatnim odświeżeniu */}
      {lastRefresh && (
        <div className="text-center text-sm text-muted-foreground">
          Ostatnie odświeżenie: {lastRefresh.toLocaleString()}
          {perfData?.timestamp && (
            <span className="ml-2">
              (dane z: {new Date(perfData.timestamp).toLocaleString()})
            </span>
          )}
        </div>
      )}
    </div>
  )
} 