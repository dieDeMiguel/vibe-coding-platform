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
 * Transforms MCP component response to ShadCN-compatible registry item using AI
 */
export async function normalizeComponentToRegistryItem(mcpResponse: MCPComponentResponse | unknown): Promise<RegistryItem> {
  console.log('normalizeComponentToRegistryItem received:', JSON.stringify(mcpResponse, null, 2));
  
  const { object } = await generateObject({
    model: 'gpt-4o-mini',
    schema: registryItemSchema,
    prompt: `Transform this MCP component data into a ShadCN registry item format:

${JSON.stringify(mcpResponse, null, 2)}

Requirements:
- Generate a complete React component with TypeScript
- Create CSS module styles for the component
- Extract proper dependencies (always include 'react' and 'clsx')
- Determine appropriate category based on component type
- Generate self-contained code without external package dependencies
- Use modern React patterns with forwardRef
- Include proper TypeScript interfaces

The component should be production-ready and follow best practices.`,
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
