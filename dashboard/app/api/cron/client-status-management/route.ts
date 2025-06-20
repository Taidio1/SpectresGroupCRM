import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 🎯 Automatyczne zarządzanie statusem klientów
// Uruchamiane codziennie przez CRON job lub można wywołać manualnie

export async function POST(request: NextRequest) {
  try {
    console.log('🤖 Rozpoczynam automatyczne zarządzanie statusem klientów...')
    
    const results = {
      processed: 0,
      statusChanged: 0,
      ownersReset: 0,
      errors: [] as Array<{
        clientId: string
        clientName: string
        error: string
      }>
    }

    // 1. Pobierz wszystkich klientów ze statusem "canvas"
    const { data: canvasClients, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('status', 'canvas')
      .not('status_changed_at', 'is', null)

    if (fetchError) {
      console.error('❌ Błąd pobierania klientów canvas:', fetchError)
      return NextResponse.json({ error: 'Błąd pobierania danych' }, { status: 500 })
    }

    if (!canvasClients || canvasClients.length === 0) {
      console.log('ℹ️ Brak klientów canvas do przetworzenia')
      return NextResponse.json({ 
        message: 'Brak klientów canvas do przetworzenia',
        results 
      })
    }

    console.log(`📊 Znaleziono ${canvasClients.length} klientów canvas do sprawdzenia`)

    const now = new Date()

    for (const client of canvasClients) {
      try {
        results.processed++
        
        const statusChangedAt = new Date(client.status_changed_at)
        const daysSinceStatusChange = (now.getTime() - statusChangedAt.getTime()) / (1000 * 60 * 60 * 24)
        
        let needsUpdate = false
        let updateData: any = {}

        // 🔄 REGUŁA 1: Po 2 dniach canvas → antysale
        if (daysSinceStatusChange >= 2) {
          updateData.status = 'antysale'
          needsUpdate = true
          results.statusChanged++
          
          console.log(`🔄 Zmieniam status klienta ${client.first_name} ${client.last_name} z canvas na antysale (${daysSinceStatusChange.toFixed(1)} dni)`)
        }

        // 🔄 REGUŁA 2: Po 5 dniach bez kliknięcia → reset owner_id
        if (daysSinceStatusChange >= 5) {
          const lastPhoneClick = client.last_phone_click ? new Date(client.last_phone_click) : null
          
          // Sprawdź czy od zmiany statusu na canvas nikt nie kliknął telefonu
          if (!lastPhoneClick || lastPhoneClick < statusChangedAt) {
            updateData.owner_id = null
            needsUpdate = true
            results.ownersReset++
            
            console.log(`🔄 Resetuję owner_id klienta ${client.first_name} ${client.last_name} (brak kontaktu przez ${daysSinceStatusChange.toFixed(1)} dni)`)

            // 📝 Zaloguj w activity_logs
            try {
              await supabase
                .from('activity_logs')
                .insert({
                  action: 'AUTO_OWNER_RESET',
                  table_name: 'clients',
                  record_id: client.id,
                  old_values: { owner_id: client.owner_id },
                  new_values: { owner_id: null },
                  user_id: null, // System action
                  details: `Automatyczny reset właściciela po ${daysSinceStatusChange.toFixed(1)} dniach bez kontaktu`,
                  ip_address: '127.0.0.1'
                })
            } catch (logError) {
              console.error('❌ Błąd logowania activity_logs:', logError)
            }
          }
        }

        // 💾 Aktualizuj klienta jeśli potrzeba
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', client.id)

          if (updateError) {
            console.error(`❌ Błąd aktualizacji klienta ${client.id}:`, updateError)
            results.errors.push({
              clientId: client.id,
              clientName: `${client.first_name} ${client.last_name}`,
              error: updateError.message
            })
          } else {
            console.log(`✅ Zaktualizowano klienta ${client.first_name} ${client.last_name}`)

            // 📝 Zaloguj zmianę statusu
            if (updateData.status) {
              try {
                await supabase
                  .from('activity_logs')
                  .insert({
                    action: 'AUTO_STATUS_CHANGE',
                    table_name: 'clients',
                    record_id: client.id,
                    old_values: { status: client.status },
                    new_values: { status: updateData.status },
                    user_id: null, // System action
                    details: `Automatyczna zmiana statusu z ${client.status} na ${updateData.status} po ${daysSinceStatusChange.toFixed(1)} dniach`,
                    ip_address: '127.0.0.1'
                  })
              } catch (logError) {
                console.error('❌ Błąd logowania activity_logs:', logError)
              }
            }
          }
        }

      } catch (clientError) {
        console.error(`❌ Błąd przetwarzania klienta ${client.id}:`, clientError)
        results.errors.push({
          clientId: client.id,
          clientName: `${client.first_name} ${client.last_name}`,
          error: clientError instanceof Error ? clientError.message : 'Nieznany błąd'
        })
      }
    }

    console.log('✅ Zakończono automatyczne zarządzanie statusem klientów')
    console.log(`📊 Wyniki: ${results.processed} przetworzono, ${results.statusChanged} zmian statusu, ${results.ownersReset} resetów właściciela, ${results.errors.length} błędów`)

    return NextResponse.json({
      success: true,
      message: 'Automatyczne zarządzanie statusem zakończone pomyślnie',
      results
    })

  } catch (error) {
    console.error('❌ Krytyczny błąd automatycznego zarządzania statusem:', error)
    return NextResponse.json({
      error: 'Krytyczny błąd podczas automatycznego zarządzania statusem',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

// Dla testowania - można wywołać przez GET
export async function GET(request: NextRequest) {
  return POST(request)
} 