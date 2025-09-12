import { NextResponse } from 'next/server'
import { listComponents } from '@/lib/mcp/client'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log('🔄 Usando MCP remoto para list_components:', body)
    
    // Usar el cliente MCP remoto en lugar del fake server
    const response = await listComponents({
      query: body.query,
      tags: body.tags,
      package: body.package,
    })
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ XMCP list_components error (MCP remoto):', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}