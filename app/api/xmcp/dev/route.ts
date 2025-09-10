import { NextResponse } from 'next/server'
import { dev } from '@/lib/xmcp/fake-server'

/**
 * Development utilities endpoint (development only)
 * GET /api/xmcp/dev - Get development utilities info
 * POST /api/xmcp/dev - Execute development commands
 */

/**
 * Get available development utilities
 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Development utilities not available in production' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    service: 'XMCP Development Utilities',
    available: true,
    commands: [
      {
        action: 'reload',
        description: 'Reload catalog from file system',
        method: 'POST',
        body: { action: 'reload' }
      },
      {
        action: 'validate',
        description: 'Validate all components in catalog',
        method: 'POST',
        body: { action: 'validate' }
      },
      {
        action: 'inspect',
        description: 'Get raw catalog data for debugging',
        method: 'POST',
        body: { action: 'inspect' }
      }
    ],
    timestamp: new Date().toISOString()
  })
}

/**
 * Execute development commands
 */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Development utilities not available in production' },
      { status: 403 }
    )
  }

  try {
    const { action } = await req.json()

    switch (action) {
      case 'reload': {
        const catalog = await dev.reloadCatalog()
        return NextResponse.json({
          message: 'Catalog reloaded successfully',
          components: catalog?.components.length || 0,
          timestamp: new Date().toISOString()
        })
      }

      case 'validate': {
        const validation = await dev.validateCatalog()
        return NextResponse.json({
          message: 'Catalog validation completed',
          results: validation,
          timestamp: new Date().toISOString()
        })
      }

      case 'inspect': {
        const rawCatalog = await dev.getRawCatalog()
        return NextResponse.json({
          message: 'Raw catalog data retrieved',
          catalog: rawCatalog,
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json(
          { 
            error: 'Unknown action',
            availableActions: ['reload', 'validate', 'inspect']
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('XMCP dev command error:', error)
    
    return NextResponse.json(
      {
        error: 'Development command failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
