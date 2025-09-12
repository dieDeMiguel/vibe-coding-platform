import { NextRequest, NextResponse } from 'next/server';
import { getComponent } from '@/lib/mcp/client';
import { normalizeComponentToRegistryItem } from '@/lib/mcp/normalizer';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: { component: string } }
) {
  try {
    const { component } = params;
    
    if (!component) {
      return NextResponse.json(
        { 
          error: 'Component name is required',
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }
    
    // Parse query parameters for variant
    const { searchParams } = new URL(request.url);
    const variant = searchParams.get('variant') || undefined;
    
    // Get component from MCP server
    const mcpResponse = await getComponent(component, variant);
    
    // Transform to registry item with validation
    const registryItem = normalizeComponentToRegistryItem(mcpResponse);
    
    return NextResponse.json(registryItem, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error) {
    console.error('Registry component endpoint error:', error);
    
    // Handle Zod validation errors specifically
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid component data structure',
          details: 'Component data does not match expected schema',
          validation_errors: error.errors,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 422,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    // Handle component not found
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'Component not found',
          details: `Component '${params.component}' does not exist`,
          timestamp: new Date().toISOString(),
        },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}
