import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// 🕐 CRON JOB: Sprawdzanie przypomnień i generowanie powiadomień
// Endpoint wywoływany co minutę przez zewnętrzny serwis cron (np. Vercel Cron, GitHub Actions)
// URL: /api/cron/notifications-check

export async function GET(request: NextRequest) {
  try {
    // Sprawdź autoryzację (opcjonalnie - można użyć secret token)
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default-secret'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      logger.warn('Nieautoryzowana próba dostępu do cron job notifications-check')
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      )
    }

    logger.info('🕐 Uruchamianie cron job: sprawdzanie powiadomień')

    const results = {
      reminders_checked: 0,
      reminders_created: 0,
      antysale_checked: 0,
      antysale_created: 0,
      errors: [] as string[]
    }

    // 1. Sprawdź i utwórz powiadomienia o przypomnieniach
    try {
      logger.info('📌 Sprawdzanie przypomnień klientów...')
      
      const { data: reminderData, error: reminderError } = await supabase
        .rpc('create_reminder_notifications')

      if (reminderError) {
        throw new Error(`Błąd sprawdzania przypomnień: ${reminderError.message}`)
      }

      results.reminders_checked++
      logger.success('✅ Przypomnienia sprawdzone pomyślnie')

    } catch (error) {
      const errorMsg = `Błąd w create_reminder_notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error(errorMsg)
      results.errors.push(errorMsg)
    }

    // 2. Sprawdź i utwórz ostrzeżenia o długotrwałych statusach antysale
    try {
      logger.info('⚠️ Sprawdzanie długotrwałych statusów antysale...')
      
      const { data: antysaleData, error: antysaleError } = await supabase
        .rpc('create_antysale_warnings')

      if (antysaleError) {
        throw new Error(`Błąd sprawdzania antysale: ${antysaleError.message}`)
      }

      results.antysale_checked++
      logger.success('✅ Ostrzeżenia antysale sprawdzone pomyślnie')

    } catch (error) {
      const errorMsg = `Błąd w create_antysale_warnings: ${error instanceof Error ? error.message : 'Unknown error'}`
      logger.error(errorMsg)
      results.errors.push(errorMsg)
    }

    // 3. Opcjonalnie - wyczyść stare powiadomienia (raz dziennie)
    const now = new Date()
    const isCleanupTime = now.getHours() === 2 && now.getMinutes() < 5 // Między 2:00-2:05

    if (isCleanupTime) {
      try {
        logger.info('🧹 Uruchamianie czyszczenia starych powiadomień...')
        
        const { error: cleanupError } = await supabase
          .rpc('cleanup_old_notifications')

        if (cleanupError) {
          throw new Error(`Błąd czyszczenia: ${cleanupError.message}`)
        }

        logger.success('✅ Stare powiadomienia wyczyszczone')

      } catch (error) {
        const errorMsg = `Błąd w cleanup_old_notifications: ${error instanceof Error ? error.message : 'Unknown error'}`
        logger.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    // 4. Statystyki końcowe
    const hasErrors = results.errors.length > 0
    const responseStatus = hasErrors ? 207 : 200 // 207 Multi-Status dla częściowych błędów

    logger.info('📊 Cron job notifications-check zakończony', {
      status: hasErrors ? 'partial_success' : 'success',
      results
    })

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors 
        ? 'Cron job zakończony z błędami' 
        : 'Cron job zakończony pomyślnie',
      timestamp: new Date().toISOString(),
      results
    }, { 
      status: responseStatus 
    })

  } catch (error) {
    logger.error('❌ Krytyczny błąd w cron job notifications-check', { error })
    
    return NextResponse.json({
      success: false,
      message: 'Krytyczny błąd w cron job',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    })
  }
}

// POST endpoint do manualnego uruchamiania (dla testowania)
export async function POST(request: NextRequest) {
  try {
    logger.info('🔧 Manualne uruchomienie cron job notifications-check')
    
    // Przekieruj do GET z tym samym tokenem
    const authHeader = request.headers.get('authorization')
    
    const mockRequest = new NextRequest(request.url, {
      method: 'GET',
      headers: {
        'authorization': authHeader || `Bearer ${process.env.CRON_SECRET_TOKEN || 'default-secret'}`
      }
    })

    return await GET(mockRequest)

  } catch (error) {
    logger.error('❌ Błąd w manualnym uruchomieniu cron job', { error })
    
    return NextResponse.json({
      success: false,
      message: 'Błąd w manualnym uruchomieniu',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500 
    })
  }
} 