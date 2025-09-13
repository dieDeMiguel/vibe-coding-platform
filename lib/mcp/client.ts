import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { experimental_createMCPClient } from "ai";
import { normalizeComponentToRegistryItem, normalizeListToRegistryIndex } from "./normalizer";

// MCP Client configuration
const MCP_BASE_URL = process.env.MCP_BASE_URL || "http://localhost:3001";
const MCP_ENDPOINT = `${MCP_BASE_URL}/mcp`;
const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

// Legacy MCP client instance for backward compatibility
let mcpClient: Awaited<ReturnType<typeof experimental_createMCPClient>> | null = null;

async function getMCPClient() {
  if (!mcpClient) {
    // Prepare headers with authentication if token is available
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (MCP_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${MCP_AUTH_TOKEN}`;
    }

    mcpClient = await experimental_createMCPClient({
      transport: new StreamableHTTPClientTransport(
        new URL(MCP_ENDPOINT),
        headers,
      ),
    });
  }
  return mcpClient;
}

/**
 * Get normalized tools for use in streamText (uses existing functions)
 */
export function getNormalizedTools() {
  return {
    get_component_normalized: {
      description: "Get a normalized ShadCN-compatible component with complete TypeScript code and CSS",
      parameters: {
        type: "object" as const,
        properties: {
          name: { type: "string", description: "Component name" },
          variant: { type: "string", description: "Component variant (optional)" }
        },
        required: ["name"]
      },
      execute: async (args: { name: string; variant?: string }) => {
        // Use existing getComponent function and normalize
        const result = await getComponent(args.name, args.variant);
        const normalized = await normalizeComponentToRegistryItem(result);
        return normalized;
      }
    },
    
    list_components_normalized: {
      description: "List available components in normalized ShadCN registry format",
      parameters: {
        type: "object" as const,
        properties: {
          query: { type: "string", description: "Search query (optional)" },
          tags: { type: "array", items: { type: "string" }, description: "Filter by tags (optional)" },
          package: { type: "string", description: "Filter by package (optional)" }
        },
        required: []
      },
      execute: async (args: { query?: string; tags?: string[]; package?: string }) => {
        // Use existing listComponents function and normalize
        const result = await listComponents(args);
        const normalized = await normalizeListToRegistryIndex(result);
        return normalized;
      }
    }
  };
}

/**
 * List available components from MCP server
 */
export async function listComponents(options?: {
  query?: string;
  tags?: string[];
  package?: string;
}): Promise<{
  items: Array<{
    name: string;
    package: string;
    version: string;
    description: string;
    tags?: string[];
  }>;
  total: number;
}> {
  await getMCPClient();
  
  // Call MCP server directly using JSON-RPC
  const response = await fetch(MCP_ENDPOINT, {
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
        name: 'list_components',
        arguments: {
          query: options?.query,
          tags: options?.tags,
          package: options?.package,
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message}`);
  }

  if (!data.result?.content?.[0]?.text) {
    throw new Error('Invalid MCP response format');
  }

  const result = JSON.parse(data.result.content[0].text);
  return result;
}

/**
 * Get specific component from MCP server
 */
export async function getComponent(name: string, variant?: string): Promise<{
  component: {
    name: string;
    package: string;
    version: string;
    description: string;
    language: string;
    style?: {
      type: 'scss' | 'css';
      entries: string[];
    };
    props: Array<{
      name: string;
      type: string;
      required: boolean;
      default?: unknown;
      description?: string;
    }>;
    variants: Array<{
      name: string;
      description?: string;
      props: Record<string, unknown>;
    }>;
    code?: string;
    tags?: string[];
  };
}> {
  await getMCPClient();
  
  // Call MCP server directly using JSON-RPC
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (MCP_AUTH_TOKEN) {
    headers.Authorization = `Bearer ${MCP_AUTH_TOKEN}`;
  }
  
  const response = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_component',
        arguments: { 
          name,
          variant 
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`MCP request failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`MCP Error: ${data.error.message}`);
  }

  if (!data.result?.content?.[0]?.text) {
    throw new Error('Invalid MCP response format');
  }

  const result = JSON.parse(data.result.content[0].text);
  return result;
}

/**
 * Test MCP connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await listComponents();
    return result.total >= 0;
  } catch (error) {
    console.error('MCP connection test failed:', error);
    return false;
  }
}
