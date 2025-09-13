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
  
  // First, get the design specifications from MCP
  const designSpecs = await getDesignSpecifications();
  
  const { object } = await generateObject({
    model: 'gpt-4o-mini',
    schema: registryItemSchema,
    prompt: `You are generating a ShadCN registry item. Return ONLY a valid JSON object with the exact structure shown below.

COMPONENT DATA:
${JSON.stringify(mcpResponse, null, 2)}

DESIGN SPECIFICATIONS:
${designSpecs}

INSTRUCTIONS:
1. Follow the design specifications exactly - they contain all implementation details
2. Generate complete, working React components with TypeScript
3. Always include "react" and "clsx" in dependencies array
4. Include Spinner component as separate file when needed for loading states
5. Use data attributes for styling variants (data-size, data-hierarchy, etc.)
6. Include forwardRef and displayName

RETURN THIS EXACT JSON STRUCTURE:
{
  "name": "button",
  "type": "component",
  "title": "Button", 
  "description": "Base button component with multiple hierarchies and sizes",
  "dependencies": ["react", "clsx"],
  "registryDependencies": [],
  "files": [
    {
      "name": "Button.tsx",
      "content": "// Complete React component code here"
    },
    {
      "name": "Button.module.css", 
      "content": "// Complete CSS module code here"
    },
    {
      "name": "Spinner.tsx",
      "content": "// Spinner component code if needed"
    }
  ],
  "category": "UI Components"
}`,
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
