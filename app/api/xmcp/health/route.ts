import { NextResponse } from 'next/server'
import { getCatalogInfo, clearCatalogCache } from '@/lib/xmcp'

/**
 * XMCP health check endpoint
 * GET /api/xmcp/health
 */
export async function GET() {
  try {
    const catalogInfo = await getCatalogInfo()
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'XMCP Fake Server',
      version: '1.0.0',
      catalog: {
        components: catalogInfo.stats.totalComponents,
        packages: catalogInfo.stats.packages,
        tags: catalogInfo.stats.tags.length,
        languages: catalogInfo.stats.languages,
        cached: catalogInfo.stats.hasCache,
        lastLoaded: catalogInfo.stats.lastLoaded 
          ? new Date(catalogInfo.stats.lastLoaded).toISOString()
          : null
      },
      endpoints: [
        {
          path: '/api/xmcp/tools/list_components',
          method: 'POST',
          description: 'List available components'
        },
        {
          path: '/api/xmcp/tools/get_component',
          method: 'POST',
          description: 'Get specific component'
        },
        {
          path: '/api/xmcp/health',
          method: 'GET',
          description: 'Health check and service info'
        },
        {
          path: '/api/xmcp/catalog',
          method: 'GET',
          description: 'Catalog metadata and statistics'
        }
      ]
    })
  } catch (error) {
    console.error('XMCP health check error:', error)
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'XMCP Fake Server',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Clear cache endpoint (development only)
 * DELETE /api/xmcp/health
 */
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Cache clearing not available in production' },
      { status: 403 }
    )
  }
  
  try {
    clearCatalogCache()
    
    return NextResponse.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
