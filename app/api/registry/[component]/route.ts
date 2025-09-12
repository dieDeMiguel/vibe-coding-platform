import { NextRequest, NextResponse } from 'next/server';
import { transformMCPToRegistryItem } from '@/lib/mcp-transformer';

export async function GET(
  request: NextRequest,
  { params }: { params: { component: string } }
) {
  try {
    const { component } = params;
    
    if (!component) {
      return NextResponse.json(
        { error: 'Component name is required' },
        { status: 400 }
      );
    }
    
    // Get MCP endpoint from environment
    const mcpEndpoint = process.env.MCP_ENDPOINT || "http://localhost:3001/mcp";
    
    // Call MCP server to get component
    const mcpResponse = await fetch(mcpEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'get_component',
          arguments: { name: component }
        }
      })
    });
    
    if (!mcpResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch component from MCP: ${mcpResponse.statusText}` },
        { status: mcpResponse.status }
      );
    }
    
    const mcpData = await mcpResponse.json();
    
    if (mcpData.error) {
      return NextResponse.json(
        { error: `MCP Error: ${mcpData.error.message}` },
        { status: 400 }
      );
    }
    
    if (!mcpData.result?.content?.[0]?.text) {
      return NextResponse.json(
        { error: 'Invalid MCP response format' },
        { status: 500 }
      );
    }
    
    // Parse MCP response
    const componentData = JSON.parse(mcpData.result.content[0].text);
    
    // Transform to registry item
    const registryItem = transformMCPToRegistryItem(componentData);
    
    return NextResponse.json(registryItem, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
      }
    });
    
  } catch (error) {
    console.error('Registry endpoint error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
