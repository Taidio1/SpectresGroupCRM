import { NextRequest, NextResponse } from 'next/server'

// 🧪 Ręczne wywołanie automatycznego zarządzania statusem klientów
// Pomocnicze API do testowania systemu

export async function GET(request: NextRequest) {
  try {
    // Wywołaj API CRON
    const cronUrl = new URL('/api/cron/client-status-management', request.url)
    const response = await fetch(cronUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const result = await response.json()
    
    return NextResponse.json({
      message: 'Test automatycznego zarządzania statusem wykonany',
      cronResponse: result,
      success: response.ok
    })
    
  } catch (error) {
    console.error('❌ Błąd testowego wywołania CRON:', error)
    return NextResponse.json({
      error: 'Błąd podczas testowego wywołania automatycznego zarządzania statusem',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
} 