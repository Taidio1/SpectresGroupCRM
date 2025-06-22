"use client"

import { useState, useEffect } from "react"
import { useErrorLogger } from "@/hooks/useErrorLogger"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bug, 
  RefreshCw, 
  Trash2, 
  Download, 
  AlertCircle, 
  Clock,
  User,
  Globe,
  Settings
} from "lucide-react"

interface ErrorLog {
  timestamp: string
  message: string
  error?: {
    name: string
    message: string
    stack: string
  }
  context?: {
    component?: string
    pathname?: string
    retryCount?: number
    userId?: string
    userAgent?: string
    url?: string
    [key: string]: any
  }
}

export function AuthDebugPanel() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const { getStoredLogs, clearStoredLogs } = useErrorLogger()

  const loadLogs = () => {
    const storedLogs = getStoredLogs()
    setLogs(storedLogs.reverse()) // Newest first
  }

  const loadSessionInfo = () => {
    const info = {
      localStorage: {
        keys: Object.keys(localStorage),
        authKeys: Object.keys(localStorage).filter(key => 
          key.includes('auth') || key.includes('supabase') || key.includes('session')
        )
      },
      cookies: document.cookie.split(';').map(cookie => cookie.trim()),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
    setSessionInfo(info)
  }

  useEffect(() => {
    loadLogs()
    loadSessionInfo()
  }, [])

  const downloadLogs = () => {
    const data = {
      logs,
      sessionInfo,
      exportedAt: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `auth-debug-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearLogs = () => {
    clearStoredLogs()
    setLogs([])
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pl-PL')
  }

  const getErrorSeverity = (error?: any) => {
    if (!error) return 'info'
    if (error.message?.includes('timeout') || error.message?.includes('hang')) return 'critical'
    if (error.message?.includes('session') || error.message?.includes('auth')) return 'high'
    return 'medium'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-blue-500'
    }
  }

  return (
    <Card className="w-full max-w-6xl mx-auto bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Panel Debugowania Autoryzacji
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Odśwież
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Eksportuj
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearLogs}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Wyczyść
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700">
            <TabsTrigger value="logs" className="data-[state=active]:bg-slate-600">
              Logi Błędów ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="session" className="data-[state=active]:bg-slate-600">
              Info Sesji
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="data-[state=active]:bg-slate-600">
              Diagnostyka
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="logs" className="mt-4">
            <ScrollArea className="h-96">
              {logs.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-slate-400">
                  <div className="text-center">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Brak logów błędów</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => {
                    const severity = getErrorSeverity(log.error)
                    return (
                      <Card key={index} className="bg-slate-700/50 border-slate-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                className={`${getSeverityColor(severity)} text-white`}
                              >
                                {severity}
                              </Badge>
                              <span className="text-sm text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(log.timestamp)}
                              </span>
                            </div>
                            {log.context?.component && (
                              <Badge variant="outline" className="text-xs border-slate-500 text-slate-300">
                                {log.context.component}
                              </Badge>
                            )}
                          </div>
                          
                          <h4 className="text-white font-medium mb-2">{log.message}</h4>
                          
                          {log.error && (
                            <Alert className="mb-3 bg-red-900/20 border-red-500/30">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription className="text-red-400">
                                <strong>{log.error.name}:</strong> {log.error.message}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {log.context && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              {log.context.pathname && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Globe className="h-3 w-3" />
                                  <span>Ścieżka: {log.context.pathname}</span>
                                </div>
                              )}
                              {log.context.userId && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <User className="h-3 w-3" />
                                  <span>User ID: {log.context.userId}</span>
                                </div>
                              )}
                              {log.context.retryCount !== undefined && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <RefreshCw className="h-3 w-3" />
                                  <span>Próba: {log.context.retryCount}</span>
                                </div>
                              )}
                              {log.context.action && (
                                <div className="flex items-center gap-1 text-slate-400">
                                  <Settings className="h-3 w-3" />
                                  <span>Akcja: {log.context.action}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="session" className="mt-4">
            <ScrollArea className="h-96">
              {sessionInfo && (
                <div className="space-y-4">
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white">Local Storage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-slate-300 space-y-1">
                        <p><strong>Wszystkie klucze:</strong> {sessionInfo.localStorage.keys.length}</p>
                        <p><strong>Klucze autoryzacji:</strong></p>
                        <ul className="ml-4 space-y-1">
                          {sessionInfo.localStorage.authKeys.map((key: string, i: number) => (
                            <li key={i} className="text-cyan-400">• {key}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white">Cookies</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-slate-300 space-y-1">
                        {sessionInfo.cookies.map((cookie: string, i: number) => (
                          <div key={i} className="break-all">{cookie}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-white">Informacje Przeglądarki</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-slate-300 space-y-2">
                        <p><strong>URL:</strong> {sessionInfo.url}</p>
                        <p><strong>User Agent:</strong></p>
                        <div className="break-all text-slate-400">{sessionInfo.userAgent}</div>
                        <p><strong>Timestamp:</strong> {formatDate(sessionInfo.timestamp)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="troubleshooting" className="mt-4">
            <div className="space-y-4">
              <Alert className="bg-blue-900/20 border-blue-500/30">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-blue-400">
                  <strong>Typowe Problemy i Rozwiązania:</strong>
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3 text-sm text-slate-300">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-white mb-2">🔄 Nieskończone ładowanie</h4>
                    <ul className="space-y-1 text-slate-400 text-xs">
                      <li>• Sprawdź czy nie ma błędów timeout w logach</li>
                      <li>• Wyczyść localStorage i cookies</li>
                      <li>• Sprawdź połączenie z Supabase</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-white mb-2">🚫 Błędy sesji</h4>
                    <ul className="space-y-1 text-slate-400 text-xs">
                      <li>• Sprawdź klucze API w localStorage</li>
                      <li>• Sprawdź ważność tokenów</li>
                      <li>• Sprawdź czy RLS jest poprawnie skonfigurowany</li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-white mb-2">⚡ Problemy z wydajnością</h4>
                    <ul className="space-y-1 text-slate-400 text-xs">
                      <li>• Sprawdź liczbę prób retry w logach</li>
                      <li>• Sprawdź czy nie ma memory leaks</li>
                      <li>• Sprawdź network requests w DevTools</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
} 