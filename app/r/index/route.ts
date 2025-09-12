import { NextRequest, NextResponse } from 'next/server';
import { listComponents } from '@/lib/mcp/client';
import { normalizeListToRegistryIndex } from '@/lib/mcp/normalizer';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const packageFilter = searchParams.get('package') || undefined;
    
    // Get components list from MCP server
    const mcpResponse = await listComponents({
      query,
      tags,
      package: packageFilter,
    });
    
    // Transform to registry index format
    const registryIndex = normalizeListToRegistryIndex(mcpResponse);
    
    return NextResponse.json(registryIndex, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
    
  } catch (error) {
    console.error('Registry index endpoint error:', error);
    
    // Return structured error response
    const errorResponse = {
      error: 'Failed to fetch component index',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}
