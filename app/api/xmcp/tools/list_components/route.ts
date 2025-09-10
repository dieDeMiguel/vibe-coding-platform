import { NextResponse } from 'next/server'
import { checkBotId } from 'botid/server'
import { 
  fakeListComponents,
  type ListComponentsRequest,
  ListComponentsRequestSchema 
} from '@/lib/xmcp'

/**
 * XMCP endpoint for listing available components
 * POST /api/xmcp/tools/list_components
 */
export async function POST(req: Request) {
  try {
    // Bot detection (following VCP pattern)
    const checkResult = await checkBotId()
    if (checkResult.isBot) {
      return NextResponse.json(
        { error: 'Bot detected' }, 
        { status: 403 }
      )
    }

    // Parse and validate request body
    let requestData: ListComponentsRequest
    try {
      const body = await req.json()
      requestData = ListComponentsRequestSchema.parse(body)
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Invalid request format',
          details: error instanceof Error ? error.message : 'Unknown validation error'
        },
        { status: 400 }
      )
    }

    // Call fake MCP server
    const response = await fakeListComponents(requestData)

    // Add metadata for debugging in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        ...response,
        _debug: {
          timestamp: new Date().toISOString(),
          requestData,
          endpoint: 'list_components',
        }
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('XMCP list_components error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

/**
 * GET handler for health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'list_components',
    description: 'Lists available UI components from the MCP catalog',
    method: 'POST',
    parameters: {
      query: {
        type: 'string',
        required: false,
        description: 'Search query to filter components'
      },
      tags: {
        type: 'array<string>',
        required: false,
        description: 'Tags to filter components by'
      },
      package: {
        type: 'string',
        required: false,
        description: 'Package name to filter components by'
      }
    },
    example: {
      request: {
        query: 'button',
        tags: ['form', 'action'],
        package: '@meli/ui'
      },
      response: {
        items: [
          {
            name: 'Button',
            description: 'Primary action button component',
            package: '@meli/ui',
            version: '2.1.0',
            tags: ['button', 'action', 'form']
          }
        ],
        total: 1
      }
    }
  })
}
