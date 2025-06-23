import { performanceApi, dashboardApi } from '@/lib/supabase';

/**
 * 🔍 PERFORMANCE MONITORING: System Performance Check
 * 
 * Endpoint dla sprawdzania metryk wydajności systemu
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 */

function generateRecommendations(tableStats: any[]): string[] {
  const recommendations: string[] = []
  
  if (!tableStats || !Array.isArray(tableStats)) {
    recommendations.push('Nie można sprawdzić statystyk tabel')
    return recommendations
  }
  
  // Sprawdź czy są tabele do archiwizacji
  const activeLogsTable = tableStats.find(stat => stat.table_name === 'activity_logs')
  if (activeLogsTable && activeLogsTable.record_count > 10000) {
    recommendations.push(`Tabela activity_logs ma ${activeLogsTable.record_count} rekordów - rozważ archiwizację`)
  }
  
  // Sprawdź rozmiar głównej tabeli
  const clientsTable = tableStats.find(stat => stat.table_name === 'activity_logs_archive')
  if (clientsTable && clientsTable.record_count > 50000) {
    recommendations.push('Tabela archiwalna jest duża - rozważ czyszczenie bardzo starych danych')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('System wydajnościowy działa optymalnie')
  }
  
  return recommendations
}

export async function GET() {
  try {
    console.log('🔍 ADMIN: Sprawdzanie metryk wydajności systemu...')
    
    let tableStats = []
    let viewFreshness = { lastUpdate: null as string | null, minutesSinceUpdate: 0, isStale: false }
    const errors = []
    
    // Sprawdź rozmiary tabel i statystyki (z obsługą błędów)
    try {
      tableStats = await performanceApi.getSystemMetrics()
      console.log('✅ Statystyki tabel pobrane pomyślnie')
    } catch (error) {
      console.error('❌ Błąd pobierania statystyk tabel:', error)
      errors.push('Nie udało się pobrać statystyk tabel')
      // Fallback data
      tableStats = [{
        table_name: 'fallback',
        record_count: 0,
        table_size: 'Brak danych',
        last_updated: new Date().toISOString()
      }]
    }
    
    // Sprawdź ostatnie odświeżenie materializowanych widoków (z obsługą błędów)
    try {
      viewFreshness = await dashboardApi.checkViewFreshness()
      console.log('✅ Świeżość widoków sprawdzona pomyślnie')
    } catch (error) {
      console.error('❌ Błąd sprawdzania świeżości widoków:', error)
      errors.push('Nie udało się sprawdzić świeżości widoków')
      // Fallback data
      viewFreshness = { 
        lastUpdate: new Date().toISOString(), 
        minutesSinceUpdate: 0, 
        isStale: false 
      }
    }
    
    // Generuj rekomendacje (zawsze działające)
    const recommendations = generateRecommendations(tableStats)
    
    // Dodaj informacje o błędach do rekomendacji
    if (errors.length > 0) {
      recommendations.unshift(...errors.map(error => `⚠️ ${error}`))
    }
    
    console.log('✅ ADMIN: Metryki wydajności pobrane (z eventualnymi ostrzeżeniami)')
    
    const overallStatus = errors.length > 0 ? 'warning' : (viewFreshness.isStale ? 'warning' : 'healthy')
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      tableStats,
      viewFreshness,
      recommendations,
      systemHealth: {
        viewsStale: viewFreshness.isStale,
        tablesHealthy: tableStats && tableStats.length > 0,
        overallStatus,
        hasErrors: errors.length > 0,
        errorCount: errors.length
      }
    })
    
  } catch (error) {
    console.error('❌ ADMIN: Krytyczny błąd sprawdzania wydajności:', error)
    
    let errorMessage = 'Krytyczny błąd systemu monitorowania wydajności'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    return Response.json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Sprawdź połączenie z bazą danych', 
        'Sprawdź uprawnienia użytkownika',
        'Skontaktuj się z administratorem systemu'
      ],
      systemHealth: {
        viewsStale: true,
        tablesHealthy: false,
        overallStatus: 'error',
        hasErrors: true,
        errorCount: 1
      }
    }, { status: 200 }) // Zwrócę 200 ale z success: false żeby frontend mógł obsłużyć
  }
}

/**
 * 🚀 POST endpoint dla manualnej optymalizacji systemu
 */
export async function POST() {
  try {
    console.log('🚀 ADMIN: Uruchamiam pełną optymalizację systemu...')
    
    const startTime = Date.now()
    
    // Uruchom pełną optymalizację bazy danych
    const optimizationResult = await performanceApi.optimizeDatabase()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`✅ ADMIN: Optymalizacja zakończona w ${duration}ms:`, optimizationResult)
    
    return Response.json({
      success: true,
      message: optimizationResult,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      actions: [
        'Zarchiwizowano stare logi',
        'Odświeżono materializowane widoki', 
        'Zaktualizowano statystyki bazy danych'
      ]
    })
    
  } catch (error) {
    console.error('❌ ADMIN: Błąd optymalizacji systemu:', error)
    
    let errorMessage = 'Nie udało się zoptymalizować systemu'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    return Response.json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 