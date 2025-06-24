"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from "@/store/useStore"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Archive,
  Server,
  Eye,
  Timer,
  Gauge,
  HardDrive,
  Users,
  FileText,
  AlertCircle,
  XCircle,
  Loader2
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
    hasErrors?: boolean
    errorCount?: number
  }
}

/**
 * 🚀 PERFORMANCE DASHBOARD - Komponent dla adminów
 * 
 * Monitoruje wydajność systemu i materializowane widoki
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 */

// 🚀 React Query hooks for performance data
function usePerformanceData() {
  return useQuery({
    queryKey: ['admin', 'performance'],
    queryFn: async () => {
      const response = await fetch('/api/admin/performance-check')
      if (!response.ok) {
        throw new Error('Failed to fetch performance data')
      }
      return response.json() as Promise<PerformanceData>
    },
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    staleTime: 1 * 60 * 1000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

function useSystemOptimization() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/performance-check', {
        method: 'POST'
      })
      if (!response.ok) {
        throw new Error('Failed to optimize system')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast({
        title: "✅ System Optimized",
        description: `Optimization completed in ${data.duration}`,
        duration: 5000
      })
      
      // Refresh performance data after optimization
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'performance'] })
      }, 2000)
    },
    onError: (error) => {
      toast({
        title: "❌ Optimization Failed",
        description: error.message || "Failed to optimize system",
        variant: "destructive"
      })
    }
  })
}

// System status indicator component
function SystemStatusIndicator({ status, label, icon: Icon, description }: {
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  label: string
  icon: any
  description?: string
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          badgeVariant: 'default' as const,
          badgeText: 'Zdrowy'
        }
      case 'warning':
        return {
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/20',
          badgeVariant: 'destructive' as const,
          badgeText: 'Ostrzeżenie'
        }
      case 'error':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          badgeVariant: 'destructive' as const,
          badgeText: 'Błąd'
        }
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/20',
          badgeVariant: 'secondary' as const,
          badgeText: 'Nieznany'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2 transition-all hover:shadow-lg`}>
      <CardContent className="p-6 text-center">
        <div className={`${config.color} mb-3`}>
          <Icon className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="font-semibold text-lg mb-2">{label}</h3>
        <Badge variant={config.badgeVariant} className="mb-2">
          {config.badgeText}
        </Badge>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Database statistics component
function DatabaseStats({ tableStats }: { tableStats?: PerformanceData['tableStats'] }) {
  if (!tableStats || tableStats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak danych statystyk bazy</p>
      </div>
    )
  }

  const getTotalRecords = () => {
    return tableStats.reduce((sum, stat) => sum + (stat.record_count || 0), 0)
  }

  const getTableIcon = (tableName: string) => {
    switch (tableName) {
      case 'clients': return Users
      case 'users': return Users  
      case 'activity_logs': return FileText
      case 'activity_logs_archive': return Archive
      default: return Database
    }
  }

  return (
    <div className="space-y-4">
             <div className="grid grid-cols-2 gap-4 mb-6">
         <Card className="bg-slate-800/50 border-slate-700">
           <CardContent className="p-4 text-center">
             <Database className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
             <div className="text-2xl font-bold text-white">{tableStats.length}</div>
             <div className="text-sm text-slate-400">Monitorowane tabele</div>
           </CardContent>
         </Card>
         <Card className="bg-slate-800/50 border-slate-700">
           <CardContent className="p-4 text-center">
             <BarChart3 className="h-8 w-8 mx-auto mb-2 text-purple-400" />
             <div className="text-2xl font-bold text-white">{getTotalRecords().toLocaleString()}</div>
             <div className="text-sm text-slate-400">Łączne rekordy</div>
           </CardContent>
         </Card>
       </div>

      <div className="space-y-3">
        {tableStats.map((stat, index) => {
          const Icon = getTableIcon(stat.table_name)
          const recordCount = stat.record_count || 0
          const isLarge = recordCount > 10000
          
          return (
            <Card key={index} className={`transition-all hover:shadow-md ${isLarge ? 'border-yellow-500/30 bg-yellow-500/5' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isLarge ? 'bg-yellow-500/20' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${isLarge ? 'text-yellow-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="font-medium">{stat.table_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {recordCount.toLocaleString()} rekordów
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={isLarge ? "destructive" : "outline"}>
                      {stat.table_size}
                    </Badge>
                    {isLarge && (
                      <div className="text-xs text-yellow-600 mt-1">Duża tabela</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// View freshness component
function ViewFreshness({ viewFreshness }: { viewFreshness?: PerformanceData['viewFreshness'] }) {
  if (!viewFreshness) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Brak danych o widokach</p>
      </div>
    )
  }

  const getProgressValue = () => {
    if (viewFreshness.minutesSinceUpdate === Infinity) return 0
    if (viewFreshness.isStale) return Math.max(10, 100 - viewFreshness.minutesSinceUpdate)
    return 100
  }

  const getProgressColor = () => {
    if (viewFreshness.isStale) return 'bg-red-500'
    if (viewFreshness.minutesSinceUpdate > 30) return 'bg-yellow-500'
    return 'bg-cyan-500'
  }

  return (
    <div className="space-y-6">
             <Card className={`bg-slate-800/50 ${viewFreshness.isStale ? 'border-red-500/30' : 'border-cyan-500/30'}`}>
         <CardContent className="p-6 text-center">
           <div className={viewFreshness.isStale ? 'text-red-400' : 'text-cyan-400'}>
             {viewFreshness.isStale ? 
               <XCircle className="h-12 w-12 mx-auto mb-3" /> : 
               <CheckCircle className="h-12 w-12 mx-auto mb-3" />
             }
           </div>
           <h3 className="font-semibold text-lg mb-2 text-white">Status Widoków</h3>
           <Badge variant={viewFreshness.isStale ? "destructive" : "default"}>
             {viewFreshness.isStale ? 'Nieaktualne' : 'Aktualne'}
           </Badge>
         </CardContent>
       </Card>

      <div className="space-y-4">
                 <div className="flex justify-between items-center">
           <span className="text-sm font-medium text-slate-300">Ostatnia aktualizacja:</span>
           <span className="text-sm font-mono text-white">
             {viewFreshness.lastUpdate 
               ? new Date(viewFreshness.lastUpdate).toLocaleString('pl-PL')
               : 'Nieznana'
             }
           </span>
         </div>
         
         <div className="flex justify-between items-center">
           <span className="text-sm font-medium text-slate-300">Czas od aktualizacji:</span>
           <span className={`text-sm font-semibold ${viewFreshness.isStale ? 'text-red-400' : 'text-cyan-400'}`}>
             {viewFreshness.minutesSinceUpdate === Infinity 
               ? 'Nieznany' 
               : `${viewFreshness.minutesSinceUpdate} min`
             }
           </span>
         </div>
        
                 <div className="space-y-2">
           <div className="flex justify-between text-sm">
             <span className="text-slate-300">Świeżość danych</span>
             <span className="text-white">{getProgressValue()}%</span>
           </div>
           <div className="w-full bg-slate-600 rounded-full h-3">
             <div 
               className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
               style={{ width: `${getProgressValue()}%` }}
             />
           </div>
         </div>
      </div>
    </div>
  )
}

// Real-time metrics component for live system monitoring
function LiveMetrics() {
  const { data: perfData, dataUpdatedAt } = usePerformanceData()
  const [pulse, setPulse] = useState(false)
  
  // Create pulse animation when data updates
  useEffect(() => {
    if (dataUpdatedAt) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 1000)
      return () => clearTimeout(timer)
    }
  }, [dataUpdatedAt])

  const getSystemLoad = () => {
    if (!perfData?.tableStats) return { percentage: 0, status: 'unknown' }
    
    const totalRecords = perfData.tableStats.reduce((sum, stat) => sum + (stat.record_count || 0), 0)
    
    // Simulate load based on total records and freshness
    let load = Math.min((totalRecords / 100000) * 100, 100)
    if (perfData.viewFreshness?.isStale) load += 20
    
    load = Math.min(load, 100)
    
    const status = load > 80 ? 'high' : load > 50 ? 'medium' : 'low'
    return { percentage: Math.round(load), status }
  }

  const systemLoad = getSystemLoad()

  return (
    <Card className="border border-slate-700 bg-slate-800/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              pulse ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500'
            }`} />
            Live Metrics
          </h3>
          <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
            {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pl-PL') : '--:--'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-2">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                               <path
                 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                 fill="none"
                 stroke="#475569"
                 strokeWidth="2"
               />
               <path
                 d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                 fill="none"
                 stroke={systemLoad.status === 'high' ? '#ef4444' : 
                        systemLoad.status === 'medium' ? '#f59e0b' : '#06b6d4'}
                 strokeWidth="2"
                 strokeDasharray={`${systemLoad.percentage}, 100`}
                 className="transition-all duration-500"
               />
              </svg>
                           <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-sm font-bold text-white">{systemLoad.percentage}%</span>
             </div>
           </div>
           <div className="text-xs text-slate-400">System Load</div>
         </div>

         <div className="space-y-3">
           <div className="flex justify-between text-sm">
             <span className="text-slate-300">Tabele:</span>
             <span className="font-mono text-white">{perfData?.tableStats?.length || 0}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-slate-300">Status:</span>
             <Badge variant={perfData?.systemHealth?.overallStatus === 'healthy' ? 'default' : 'destructive'} className="text-xs">
               {perfData?.systemHealth?.overallStatus || 'Unknown'}
             </Badge>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-slate-300">Widoki:</span>
             <Badge variant={perfData?.viewFreshness?.isStale ? 'destructive' : 'default'} className="text-xs">
               {perfData?.viewFreshness?.isStale ? 'Stale' : 'Fresh'}
             </Badge>
           </div>
         </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Enhanced status indicator with animations
function AnimatedStatusCard({ title, value, icon: Icon, status, description }: {
  title: string
  value: string | number
  icon: any
  status: 'healthy' | 'warning' | 'error'
  description?: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  const getStatusStyles = () => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-slate-800/50',
          border: 'border-slate-700',
          icon: 'text-cyan-400',
          value: 'text-cyan-300'
        }
      case 'warning':
        return {
          bg: 'bg-slate-800/50',
          border: 'border-yellow-500/30',
          icon: 'text-yellow-400',
          value: 'text-yellow-300'
        }
      case 'error':
        return {
          bg: 'bg-slate-800/50',
          border: 'border-red-500/30',
          icon: 'text-red-400',
          value: 'text-red-300'
        }
    }
  }

  const styles = getStatusStyles()

  return (
    <Card 
      className={`${styles.bg} ${styles.border} border-2 transition-all duration-300 cursor-pointer ${
        isHovered ? 'shadow-lg scale-105' : 'shadow-sm'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6 text-center">
        <div className={`${styles.icon} mb-3 transition-transform duration-300 ${
          isHovered ? 'scale-110' : ''
        }`}>
          <Icon className="h-8 w-8 mx-auto" />
        </div>
                 <h3 className="font-semibold text-sm text-slate-300 mb-1">{title}</h3>
         <div className={`text-2xl font-bold ${styles.value} mb-2`}>
           {value}
         </div>
         {description && (
           <p className="text-xs text-slate-400">{description}</p>
         )}
      </CardContent>
    </Card>
  )
}

// Quick actions component
function QuickActions() {
  const optimizeMutation = useSystemOptimization()
  const { refetch } = usePerformanceData()

  const quickActions = [
    {
      title: 'Refresh Views',
      description: 'Update materialized views',
      icon: Eye,
      action: () => optimizeMutation.mutate(),
      disabled: optimizeMutation.isPending
    },
    {
      title: 'Archive Logs',
      description: 'Clean old activity logs',
      icon: Archive,
      action: () => optimizeMutation.mutate(),
      disabled: optimizeMutation.isPending
    },
    {
      title: 'Check Status',
      description: 'Refresh all metrics',
      icon: RefreshCw,
      action: () => refetch(),
      disabled: false
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto p-4 flex items-start gap-3 hover:bg-muted/50 transition-all"
                onClick={action.action}
                disabled={action.disabled}
              >
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// Main Performance Dashboard Component
export function PerformanceDashboard() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("overview")
  
  const { 
    data: perfData, 
    isLoading, 
    error, 
    refetch,
    dataUpdatedAt
  } = usePerformanceData()
  
  const optimizeMutation = useSystemOptimization()

  // Check admin access
  const hasAdminAccess = user?.role === 'admin'

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Brak uprawnień
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Performance Dashboard jest dostępny tylko dla administratorów systemu.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            Błąd ładowania danych
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Nie udało się załadować danych wydajności. Sprawdź połączenie z bazą danych.
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Spróbuj ponownie
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">
            Monitorowanie wydajności i optymalizacja systemu
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Odśwież
          </Button>
          
          <Button
            onClick={() => optimizeMutation.mutate()}
            disabled={optimizeMutation.isPending}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {optimizeMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {optimizeMutation.isPending ? 'Optymalizuję...' : 'Optymalizuj System'}
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SystemStatusIndicator
          status={perfData?.systemHealth?.overallStatus || 'unknown'}
          label="Status Ogólny"
          icon={perfData?.systemHealth?.overallStatus === 'healthy' ? CheckCircle : 
                perfData?.systemHealth?.overallStatus === 'warning' ? AlertTriangle : XCircle}
          description={`System ${perfData?.systemHealth?.overallStatus === 'healthy' ? 'działa optymalnie' : 
                                perfData?.systemHealth?.overallStatus === 'warning' ? 'wymaga uwagi' : 'ma problemy'}`}
        />
        
        <SystemStatusIndicator
          status={perfData?.viewFreshness?.isStale ? 'warning' : 'healthy'}
          label="Materializowane Widoki"
          icon={Eye}
          description={perfData?.viewFreshness?.isStale ? 'Wymagają odświeżenia' : 'Aktualne'}
        />
        
        <SystemStatusIndicator
          status={perfData?.systemHealth?.tablesHealthy ? 'healthy' : 'warning'}
          label={`${perfData?.tableStats?.length || 0} Tabele`}
          icon={Database}
          description="Monitorowane tabele bazy"
        />
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Przegląd
          </TabsTrigger>
          <TabsTrigger value="database" className="flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Baza Danych
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rekomendacje
          </TabsTrigger>
        </TabsList>

                 <TabsContent value="overview" className="space-y-6">
           {/* Live Metrics Row */}
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <LiveMetrics />
             <AnimatedStatusCard
               title="Database Health"
               value={perfData?.tableStats?.length || 0}
               icon={Database}
               status={perfData?.systemHealth?.tablesHealthy ? 'healthy' : 'warning'}
               description="Active tables"
             />
             <AnimatedStatusCard
               title="Views Status"
               value={perfData?.viewFreshness?.isStale ? 'Stale' : 'Fresh'}
               icon={Eye}
               status={perfData?.viewFreshness?.isStale ? 'error' : 'healthy'}
               description="Materialized views"
             />
             <QuickActions />
           </div>

           {/* Detailed Cards */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Clock className="h-5 w-5" />
                   Świeżość Widoków
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <ViewFreshness viewFreshness={perfData?.viewFreshness} />
               </CardContent>
             </Card>

             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Activity className="h-5 w-5" />
                   Aktywność Systemu
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="space-y-4">
                   <div className="flex justify-between">
                     <span>Status połączenia:</span>
                     <Badge variant="default" className="bg-green-100 text-green-800">
                       Online
                     </Badge>
                   </div>
                   <div className="flex justify-between">
                     <span>Ostatnie sprawdzenie:</span>
                     <span className="text-sm font-mono">
                       {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString('pl-PL') : 'Nigdy'}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span>Auto-refresh:</span>
                     <Badge variant="outline">Co 2 min</Badge>
                   </div>
                   <div className="flex justify-between">
                     <span>React Query status:</span>
                     <Badge variant="default" className="bg-blue-100 text-blue-800">
                       Aktywny
                     </Badge>
                   </div>
                 </div>
               </CardContent>
             </Card>
           </div>
         </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Statystyki Bazy Danych
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Ładowanie statystyk...</span>
                </div>
              ) : (
                <DatabaseStats tableStats={perfData?.tableStats} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rekomendacje Wydajności
              </CardTitle>
            </CardHeader>
            <CardContent>
              {perfData?.recommendations && perfData.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {perfData.recommendations.map((recommendation, index) => {
                    const isWarning = recommendation.includes('⚠️')
                    const isError = recommendation.includes('❌')
                    
                    return (
                      <Alert key={index} className={
                        isError ? 'border-red-500/50 bg-red-500/5' : 
                        isWarning ? 'border-yellow-500/50 bg-yellow-500/5' : 
                        'border-blue-500/50 bg-blue-500/5'
                      }>
                        <div className="flex items-start gap-3">
                          {isError ? <XCircle className="h-5 w-5 text-red-500 mt-0.5" /> :
                           isWarning ? <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" /> :
                           <Archive className="h-5 w-5 text-blue-500 mt-0.5" />}
                          <AlertDescription className="text-sm">
                            {recommendation}
                          </AlertDescription>
                        </div>
                      </Alert>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Brak rekomendacji - system działa optymalnie</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer with timestamp */}
      {perfData?.timestamp && (
        <div className="text-center text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Timer className="h-4 w-4 inline mr-2" />
          Dane z: {new Date(perfData.timestamp).toLocaleString('pl-PL')} • 
          Automatyczne odświeżanie co 2 minuty
        </div>
      )}
    </div>
  )
} 