import { registryItemSchema, type RegistryItem, type RegistryIndex } from '@/lib/schema/registry';
import { generateObject } from 'ai';
import { z } from 'zod';

// MCP Component Response structure (updated for new format)
interface MCPComponentResponse {
  components?: Array<{
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
  }>;
  required_dependencies?: Record<string, string>;
  package_json_dependencies?: Record<string, string>;
  helper_components?: Array<{
    name: string;
    description?: string;
    files: Array<{
      path: string;
      content: string;
    }>;
  }>;
  // Backward compatibility - old format was just the component
  component?: {
    name: string;
    package: string;
    version: string;
    description: string;
    language: string;
    props: Array<unknown>;
    variants: Array<unknown>;
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
  
  // Handle both new and old MCP response formats
  let components: unknown[];
  let dependencies: Record<string, string> = {};
  let helperComponents: unknown[] = [];
  
  if (Array.isArray(mcpResponse)) {
    // Old format: array of components
    components = mcpResponse;
  } else if (mcpResponse && typeof mcpResponse === 'object') {
    const response = mcpResponse as MCPComponentResponse;
    
    // New format: structured response
    components = response.components || (response.component ? [response.component] : []);
    
    // Extract dependencies
    dependencies = {
      ...response.required_dependencies,
      ...response.package_json_dependencies,
    };
    
    // Extract helper components
    helperComponents = response.helper_components || [];
  } else {
    components = [];
  }
  
  // First, get the design specifications from MCP
  const designSpecs = await getDesignSpecifications();
  
  const { object } = await generateObject({
    model: 'gpt-4o-mini',
    schema: registryItemSchema,
    prompt: `You are generating a ShadCN registry item. Return ONLY a valid JSON object with the exact structure shown below.

COMPONENT DATA:
${JSON.stringify(components, null, 2)}

ADDITIONAL DEPENDENCIES:
${JSON.stringify(dependencies, null, 2)}

HELPER COMPONENTS:
${JSON.stringify(helperComponents, null, 2)}

DESIGN SPECIFICATIONS:
${designSpecs}

INSTRUCTIONS:
1. Follow the design specifications exactly - they contain all implementation details
2. Generate complete, working React components with TypeScript
3. Always include "react" and "clsx" in dependencies array
4. Include ALL additional dependencies from ADDITIONAL DEPENDENCIES section
5. **CRITICAL**: Create ALL helper components from HELPER COMPONENTS section as separate files in the files array
6. **CRITICAL**: If component imports '../Spinner/Spinner', MUST include Spinner.tsx and Spinner.module.css in files array
7. **CRITICAL**: Validate that every import statement has a corresponding file in the files array
8. Use data attributes for styling variants (data-size, data-hierarchy, etc.)
9. Include forwardRef and displayName
10. **VALIDATION**: Before returning, check that all relative imports (starting with './' or '../') have matching files

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
    }
  ],
  "category": "UI Components"
}

**CRITICAL FOR HELPER COMPONENTS**: If HELPER COMPONENTS section contains files, add them to files array:
- If helper_components contains Spinner with files: [{path: "components/Spinner/Spinner.tsx", content: "..."}, {path: "components/Spinner/Spinner.module.css", content: "..."}]
- Add to files array: {"name": "Spinner.tsx", "content": "..."}, {"name": "Spinner.module.css", "content": "..."}
- Ensure component imports match: import Spinner from '../Spinner/Spinner'

**VALIDATION CHECKLIST**:
✓ Every import '../Something/Something' has corresponding Something.tsx in files array
✓ Every helper component from HELPER COMPONENTS section is included in files array
✓ All dependencies from ADDITIONAL DEPENDENCIES are in dependencies array
✓ Component uses default export and has displayName`,
  });

  // POST-GENERATION VALIDATION: Ensure helper components were included
  const validationResult = validateGeneratedRegistry(object, helperComponents as any[]);
  if (!validationResult.isValid) {
    console.warn('⚠️ Registry validation failed:', validationResult.issues);
    // Log issues but don't fail - let the system handle it gracefully
  }

  return object;
}

/**
 * Validates that the generated registry item includes all necessary helper components
 */
function validateGeneratedRegistry(registryItem: any, helperComponents: any[]): { isValid: boolean, issues: string[] } {
  const issues: string[] = [];
  
  if (!registryItem.files || !Array.isArray(registryItem.files)) {
    issues.push('Registry item missing files array');
    return { isValid: false, issues };
  }
  
  // Check if main component imports helper components
  const mainComponentFile = registryItem.files.find((f: any) => f.name?.endsWith('.tsx') && f.name.includes(registryItem.title));
  
  if (mainComponentFile && helperComponents.length > 0) {
    const componentContent = mainComponentFile.content || '';
    
    // Check for Spinner imports
    if (componentContent.includes('../Spinner/Spinner') || componentContent.includes('./Spinner')) {
      const hasSpinnerTsx = registryItem.files.some((f: any) => f.name === 'Spinner.tsx');
      const hasSpinnerCss = registryItem.files.some((f: any) => f.name === 'Spinner.module.css');
      
      if (!hasSpinnerTsx) {
        issues.push('Component imports Spinner but Spinner.tsx not found in files');
      }
      if (!hasSpinnerCss) {
        issues.push('Component imports Spinner but Spinner.module.css not found in files');
      }
    }
    
    // Validate other helper components
    helperComponents.forEach((helper: any) => {
      if (helper.files) {
        helper.files.forEach((helperFile: any) => {
          const fileName = helperFile.path.split('/').pop();
          const fileExists = registryItem.files.some((f: any) => f.name === fileName);
          
          if (!fileExists) {
            issues.push(`Helper component file '${fileName}' missing from registry files`);
          }
        });
      }
    });
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
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
