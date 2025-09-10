import { NextResponse } from 'next/server'
import { checkBotId } from 'botid/server'
import { 
  fakeGetComponent,
  type GetComponentRequest,
  GetComponentRequestSchema 
} from '@/lib/xmcp'

/**
 * XMCP endpoint for getting a specific component
 * POST /api/xmcp/tools/get_component
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
    let requestData: GetComponentRequest
    try {
      const body = await req.json()
      requestData = GetComponentRequestSchema.parse(body)
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
    const response = await fakeGetComponent(requestData)

    // Add metadata for debugging in development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        ...response,
        _debug: {
          timestamp: new Date().toISOString(),
          requestData,
          endpoint: 'get_component',
          componentName: requestData.name,
          variant: requestData.variant,
        }
      })
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('XMCP get_component error:', error)
    
    // Handle component not found specifically
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Component not found',
          message: error.message
        },
        { status: 404 }
      )
    }
    
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
    endpoint: 'get_component',
    description: 'Retrieves a specific UI component with full specification',
    method: 'POST',
    parameters: {
      name: {
        type: 'string',
        required: true,
        description: 'Name of the component to retrieve'
      },
      variant: {
        type: 'string',
        required: false,
        description: 'Specific variant of the component to retrieve'
      }
    },
    example: {
      request: {
        name: 'Button',
        variant: 'primary'
      },
      response: {
        component: {
          name: 'Button',
          package: '@meli/ui',
          version: '2.1.0',
          description: 'Primary action button component',
          language: 'tsx',
          props: [
            {
              name: 'variant',
              type: "'primary' | 'secondary'",
              required: false,
              default: 'primary'
            }
          ],
          variants: [
            {
              name: 'primary',
              props: { variant: 'primary' }
            }
          ],
          code: '/* TSX component code */',
          assets: []
        }
      }
    }
  })
}
