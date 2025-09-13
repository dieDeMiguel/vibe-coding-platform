import { registryItemSchema, type RegistryItem, type RegistryIndex } from '@/lib/schema/registry';
import { generateObject } from 'ai';
import { z } from 'zod';

// MCP Component Response structure (based on actual MCP server response)
interface MCPComponentResponse {
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
}

// MCP List Response structure
interface MCPListResponse {
  items: Array<{
    name: string;
    package: string;
    version: string;
    description: string;
    tags?: string[];
  }>;
  total: number;
}

/**
 * Get design specifications from MCP server
 */
async function getDesignSpecifications(): Promise<string> {
  try {
    // Call MCP server to get design specifications
    const isDev = process.env.NODE_ENV === 'development';
    const MCP_ENDPOINT = isDev 
      ? 'http://localhost:3001/mcp/v1/tools/call' 
      : (process.env.MCP_ENDPOINT || 'https://meli-xmcp-poc.vercel.app/mcp');
    const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
    
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
          name: 'get_design_specifications',
          arguments: {
            versions: { andes: 'latest' }
          }
        }
      })
    });

    if (!response.ok) {
      console.warn('Failed to get design specifications from MCP, using fallback');
      return 'Use Mercado Libre Andes Design System specifications with clsx and data attributes.';
    }

    const data = await response.json();
    
    if (data.error) {
      console.warn('MCP Error getting design specs:', data.error.message);
      return 'Use Mercado Libre Andes Design System specifications with clsx and data attributes.';
    }

    if (data.result?.content?.[0]?.text) {
      return data.result.content[0].text;
    }
    
    return 'Use Mercado Libre Andes Design System specifications with clsx and data attributes.';
  } catch (error) {
    console.warn('Error fetching design specifications:', error);
    return 'Use Mercado Libre Andes Design System specifications with clsx and data attributes.';
  }
}

/**
 * Transforms MCP component response to ShadCN-compatible registry item using AI
 */
export async function normalizeComponentToRegistryItem(mcpResponse: MCPComponentResponse | unknown): Promise<RegistryItem> {
  console.log('normalizeComponentToRegistryItem received:', JSON.stringify(mcpResponse, null, 2));
  
  // First, get the design specifications from MCP
  const designSpecs = await getDesignSpecifications();
  console.log('Retrieved design specifications from MCP');
  
  const { object } = await generateObject({
    model: 'gpt-4o-mini',
    schema: registryItemSchema,
    prompt: `Transform this MCP component data into a ShadCN registry item format following the official Mercado Libre Design System specifications:

COMPONENT DATA:
${JSON.stringify(mcpResponse, null, 2)}

OFFICIAL DESIGN SYSTEM SPECIFICATIONS:
${designSpecs}

CRITICAL: Follow the design specifications above exactly. They contain the official implementation guidelines.

Generate a complete ShadCN registry item with:
1. All files needed for the component (TSX, CSS, helper components)
2. Proper dependencies array including "react" and "clsx"
3. Production-ready code that compiles without errors
4. Full implementation of all props from the component specification

The design specifications above contain all the implementation details you need.`,
  });

  return object;
}

/**
 * Transforms MCP list response to registry index using AI
 */
export async function normalizeListToRegistryIndex(mcpResponse: MCPListResponse | unknown[]): Promise<RegistryIndex> {
  const { object } = await generateObject({
    model: 'gpt-4o-mini',
    output: 'array',
    schema: z.object({
      name: z.string(),
      title: z.string(),
      description: z.string().optional(),
      category: z.string().default("UI"),
    }),
    prompt: `Transform this MCP components list into a registry index format:

${JSON.stringify(mcpResponse, null, 2)}

Requirements:
- Convert each component to registry index format
- Normalize names to lowercase
- Keep original titles
- Categorize components appropriately (UI, Form, Layout, Feedback, etc.)
- Ensure all items follow the schema structure`,
  });

  return object;
}

// Helper functions are no longer needed as AI generates everything
