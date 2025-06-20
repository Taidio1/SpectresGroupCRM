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
    
    // Sprawdź rozmiary tabel i statystyki
    const tableStats = await performanceApi.getSystemMetrics()
    
    // Sprawdź ostatnie odświeżenie materializowanych widoków
    const viewFreshness = await dashboardApi.checkViewFreshness()
    
    // Generuj rekomendacje
    const recommendations = generateRecommendations(tableStats)
    
    console.log('✅ ADMIN: Metryki wydajności pobrane pomyślnie')
    
    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      tableStats,
      viewFreshness,
      recommendations,
      systemHealth: {
        viewsStale: viewFreshness.isStale,
        tablesHealthy: tableStats ? tableStats.length > 0 : false,
        overallStatus: viewFreshness.isStale ? 'warning' : 'healthy'
      }
    })
    
  } catch (error) {
    console.error('❌ ADMIN: Błąd sprawdzania wydajności:', error)
    
    let errorMessage = 'Nie udało się sprawdzić metryk wydajności'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    return Response.json({ 
      success: false, 
      error: errorMessage,
      timestamp: new Date().toISOString(),
      recommendations: ['Sprawdź połączenie z bazą danych', 'Sprawdź uprawnienia użytkownika']
    }, { status: 500 })
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