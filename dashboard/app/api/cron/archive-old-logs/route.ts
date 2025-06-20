import { performanceApi } from '@/lib/supabase';

/**
 * 🗄️ PERFORMANCE CRON JOB: Archive Old Activity Logs
 * 
 * Automatycznie archiwizuje stare logi aktywności (starsze niż 6 miesięcy)
 * dla utrzymania wydajności bazy danych
 * 
 * Zgodnie z INSTRUKCJE_PERFORMANCE_OPTIMIZATIONS.md
 * 
 * Schedule: "0 2 * * 0" (każdą niedzielę o 2:00)
 */
export async function POST() {
  try {
    console.log('📦 CRON: Rozpoczynam archiwizację starych logów aktywności...')
    
    const startTime = Date.now()
    
    // Archiwizuj stare logi (starsze niż 6 miesięcy)
    const archivedCount = await performanceApi.archiveOldLogs()
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`✅ CRON: Archiwizacja zakończona w ${duration}ms. Zarchiwizowano ${archivedCount} logów`)
    
    return Response.json({ 
      success: true, 
      archivedCount,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      cutoffDate: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 miesięcy temu
      message: `Pomyślnie zarchiwizowano ${archivedCount} starych logów aktywności`
    })
    
  } catch (error) {
    console.error('❌ CRON: Błąd archiwizacji starych logów:', error)
    
    let errorMessage = 'Nieznany błąd archiwizacji'
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
 * 🔍 GET endpoint dla sprawdzenia statusu archiwizacji
 */
export async function GET() {
  return Response.json({
    endpoint: 'archive-old-logs',
    description: 'Archiwizuje stare logi aktywności (starsze niż 6 miesięcy)',
    schedule: 'Każdą niedzielę o 2:00 (0 2 * * 0)',
    retentionPeriod: '6 miesięcy',
    targetTable: 'activity_logs → activity_logs_archive',
    lastRun: 'Sprawdź logi aplikacji',
    status: 'active'
  })
} 