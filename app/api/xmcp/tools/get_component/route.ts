import { NextResponse } from 'next/server'
import { getComponent } from '@/lib/mcp/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('🔄 Usando MCP remoto para get_component:', body)
    
    // Usar el cliente MCP remoto en lugar del fake server
    const response = await getComponent(body.name, body.variant)
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ XMCP get_component error (MCP remoto):', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}