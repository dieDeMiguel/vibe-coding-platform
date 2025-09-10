import { NextResponse } from 'next/server'
import { checkBotId } from 'botid/server'
import { getCatalogInfo, searchComponents } from '@/lib/xmcp'

/**
 * XMCP catalog metadata endpoint
 * GET /api/xmcp/catalog
 */
export async function GET() {
  try {
    // Bot detection for sensitive endpoints
    const checkResult = await checkBotId()
    if (checkResult.isBot) {
      return NextResponse.json(
        { error: 'Bot detected' }, 
        { status: 403 }
      )
    }

    const catalogInfo = await getCatalogInfo()
    
    return NextResponse.json({
      metadata: catalogInfo.metadata,
      statistics: {
        totalComponents: catalogInfo.stats.totalComponents,
        packages: catalogInfo.stats.packages.map(pkg => ({
          name: pkg,
          // Count components in this package
          componentCount: catalogInfo.stats.totalComponents // Simplified for now
        })),
        tags: catalogInfo.stats.tags.map(tag => ({
          name: tag,
          // Count components with this tag
          componentCount: 1 // Simplified for now
        })),
        languages: catalogInfo.stats.languages,
        cacheStatus: {
          hasCache: catalogInfo.stats.hasCache,
          lastLoaded: catalogInfo.stats.lastLoaded 
            ? new Date(catalogInfo.stats.lastLoaded).toISOString()
            : null
        }
      },
      _links: {
        health: '/api/xmcp/health',
        listComponents: '/api/xmcp/tools/list_components',
        getComponent: '/api/xmcp/tools/get_component',
        search: '/api/xmcp/catalog/search'
      }
    })
  } catch (error) {
    console.error('XMCP catalog info error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve catalog information',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Advanced component search endpoint
 * POST /api/xmcp/catalog/search
 */
export async function POST(req: Request) {
  try {
    // Bot detection
    const checkResult = await checkBotId()
    if (checkResult.isBot) {
      return NextResponse.json(
        { error: 'Bot detected' }, 
        { status: 403 }
      )
    }

    // Parse search parameters
    const body = await req.json()
    const {
      query,
      tags,
      packages,
      languages,
      limit = 20,
      offset = 0
    } = body

    // Validate parameters
    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100' },
        { status: 400 }
      )
    }

    // Perform search
    const results = await searchComponents({
      query,
      tags,
      packages,
      languages,
      limit,
      offset
    })

    return NextResponse.json({
      ...results,
      pagination: {
        offset,
        limit,
        hasMore: results.hasMore,
        nextOffset: results.hasMore ? offset + limit : null
      },
      _debug: process.env.NODE_ENV === 'development' ? {
        searchParams: { query, tags, packages, languages, limit, offset },
        timestamp: new Date().toISOString()
      } : undefined
    })

  } catch (error) {
    console.error('XMCP catalog search error:', error)
    
    return NextResponse.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
