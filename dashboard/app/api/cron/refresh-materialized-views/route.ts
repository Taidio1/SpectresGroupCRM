import { performanceApi } from '@/lib/supabase';

/**
 * 🚀 PERFORMANCE CRON JOB: Refresh Materialized Views
 * 
 * Automatycznie odświeża materializowane widoki co 4 godziny
 * dla utrzymania aktualności danych performance
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 * 
 * Schedule: "0 every-4-hours * * *" (co 4 godziny)
 */
export async function POST() {
  try {
    console.log('🔄 CRON: Rozpoczynam odświeżanie materializowanych widoków...')
    
    const startTime = Date.now()
    
    // Odśwież wszystkie materializowane widoki
    const result = await performanceApi.refreshMaterializedViews()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`✅ CRON: Materializowane widoki odświeżone w ${duration}ms:`, result)
    
    return Response.json({ 
      success: true, 
      message: result,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      views: ['mv_monthly_employee_stats', 'mv_dashboard_summary', 'mv_activity_summary']
    })
    
  } catch (error) {
    console.error('❌ CRON: Błąd odświeżania materializowanych widoków:', error)
    
    let errorMessage = 'Nieznany błąd'
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

/**
 * 🔍 GET endpoint dla sprawdzenia statusu
 */
export async function GET() {
  return Response.json({
    endpoint: 'refresh-materialized-views',
    description: 'Odświeża materializowane widoki dla wydajności aplikacji',
    schedule: 'Co 4 godziny (0 */4 * * *)',
    lastRun: 'Sprawdź logi aplikacji',
    status: 'active'
  })
} 