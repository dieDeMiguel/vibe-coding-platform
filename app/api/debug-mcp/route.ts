import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Capturar toda la configuración
    const config = {
      NODE_ENV: process.env.NODE_ENV,
      MCP_BASE_URL: process.env.MCP_BASE_URL,
      MCP_ENDPOINT: process.env.MCP_ENDPOINT,
      MCP_AUTH_TOKEN: process.env.MCP_AUTH_TOKEN ? 'SET' : 'NOT SET',
      MCP_PRODUCTION_TOKEN: process.env.MCP_PRODUCTION_TOKEN ? 'SET' : 'NOT SET',
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_URL: process.env.VERCEL_URL,
      timestamp: new Date().toISOString(),
    };

    // Intentar hacer una llamada directa al MCP
    const mcpUrl = process.env.MCP_ENDPOINT || 'https://meli-xmcp-poc.vercel.app/mcp';
    const token = process.env.MCP_AUTH_TOKEN || process.env.MCP_PRODUCTION_TOKEN;
    
    let mcpTest = null;
    try {
      const response = await fetch(mcpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 1,
        }),
      });

      mcpTest = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    } catch (error) {
      mcpTest = {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return NextResponse.json({
      config,
      mcpTest,
      success: true,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false,
    }, { status: 500 });
  }
}
