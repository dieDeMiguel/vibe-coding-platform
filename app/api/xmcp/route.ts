import { NextResponse } from 'next/server'
import { getCatalogInfo } from '@/lib/xmcp'

/**
 * XMCP API Documentation and Status
 * GET /api/xmcp
 */
export async function GET() {
  try {
    const catalogInfo = await getCatalogInfo()
    
    return NextResponse.json({
      service: 'XMCP (eXtended Model Context Protocol) Fake Server',
      version: '1.0.0',
      description: 'Provides UI component definitions for the Vibe Coding Platform',
      status: 'operational',
      timestamp: new Date().toISOString(),
      
      // Catalog summary
      catalog: {
        totalComponents: catalogInfo.stats.totalComponents,
        packages: catalogInfo.stats.packages.length,
        tags: catalogInfo.stats.tags.length,
        lastUpdated: catalogInfo.metadata && 'lastUpdated' in catalogInfo.metadata ? catalogInfo.metadata.lastUpdated : null
      },
      
      // API endpoints
      endpoints: {
        tools: {
          list_components: {
            path: '/api/xmcp/tools/list_components',
            method: 'POST',
            description: 'List available UI components with filtering',
            parameters: {
              query: 'string (optional) - Search query',
              tags: 'string[] (optional) - Filter by tags',
              package: 'string (optional) - Filter by package'
            }
          },
          get_component: {
            path: '/api/xmcp/tools/get_component',
            method: 'POST',
            description: 'Get detailed component specification',
            parameters: {
              name: 'string (required) - Component name',
              variant: 'string (optional) - Specific variant'
            }
          }
        },
        
        utilities: {
          health: {
            path: '/api/xmcp/health',
            method: 'GET',
            description: 'Service health check and diagnostics'
          },
          catalog: {
            path: '/api/xmcp/catalog',
            method: 'GET',
            description: 'Catalog metadata and statistics'
          },
          search: {
            path: '/api/xmcp/catalog/search',
            method: 'POST',
            description: 'Advanced component search with pagination'
          }
        },
        
        ...(process.env.NODE_ENV === 'development' && {
          development: {
            dev: {
              path: '/api/xmcp/dev',
              method: 'GET|POST',
              description: 'Development utilities (dev only)'
            }
          }
        })
      },
      
      // Usage examples
      examples: {
        listComponents: {
          request: {
            method: 'POST',
            url: '/api/xmcp/tools/list_components',
            body: {
              query: 'button',
              tags: ['form', 'action']
            }
          },
          response: {
            items: [
              {
                name: 'Button',
                description: 'Primary action button component',
                package: '@meli/ui',
                version: '2.1.0'
              }
            ],
            total: 1
          }
        },
        
        getComponent: {
          request: {
            method: 'POST',
            url: '/api/xmcp/tools/get_component',
            body: {
              name: 'Button',
              variant: 'primary'
            }
          },
          response: {
            component: {
              name: 'Button',
              package: '@meli/ui',
              description: 'Primary action button component',
              code: '/* React component code */',
              props: '/* Component props definition */',
              variants: '/* Available variants */'
            }
          }
        }
      },
      
      // Integration info
      integration: {
        baseUrl: process.env.MCP_BASE_URL || 'http://localhost:3000/api/xmcp',
        authentication: 'None (fake server)',
        rateLimit: 'None',
        cors: 'Enabled for development'
      },
      
      // Links
      _links: {
        self: '/api/xmcp',
        health: '/api/xmcp/health',
        catalog: '/api/xmcp/catalog',
        tools: {
          list_components: '/api/xmcp/tools/list_components',
          get_component: '/api/xmcp/tools/get_component'
        }
      }
    })
  } catch (error) {
    console.error('XMCP API documentation error:', error)
    
    return NextResponse.json(
      {
        service: 'XMCP Fake Server',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
