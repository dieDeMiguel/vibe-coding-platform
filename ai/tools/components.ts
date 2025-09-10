import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import { generateComponentFiles } from './components/file-generator'
import description from './components.md'
import z from 'zod/v3'

interface Params {
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
}

/**
 * Components tool for XMCP integration
 * Provides access to UI component catalog and generates files in sandbox
 */
export const components = ({ modelId, writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      action: z
        .enum(['list', 'fetch'])
        .describe('Action to perform: "list" to discover components, "fetch" to retrieve and generate component files'),
      
      // List action parameters
      query: z
        .string()
        .optional()
        .describe('Search query to filter components (for list action)'),
      
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to filter components by (for list action)'),
      
      package: z
        .string()
        .optional()
        .describe('Package name to filter components by (for list action)'),
      
      // Fetch action parameters
      componentName: z
        .string()
        .optional()
        .describe('Name of the component to fetch (required for fetch action)'),
      
      variant: z
        .string()
        .optional()
        .describe('Specific variant of the component to fetch (for fetch action)'),
      
      sandboxId: z
        .string()
        .optional()
        .describe('Sandbox ID where component files should be generated (required for fetch action)'),
      
      generateDemo: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to generate a demo page for the component (for fetch action)'),
    }),
    
    execute: async ({ action, query, tags, package: packageFilter, componentName, variant, sandboxId, generateDemo }, { toolCallId }) => {
      // Initialize status
      writer.write({
        id: toolCallId,
        type: 'data-components',
        data: { 
          action, 
          componentName, 
          variant, 
          query,
          status: 'loading' 
        },
      })

      try {
        if (action === 'list') {
          return await handleListComponents({
            query,
            tags,
            packageFilter,
            writer,
            toolCallId,
          })
        } else if (action === 'fetch') {
          if (!componentName) {
            throw new Error('componentName is required for fetch action')
          }
          
          if (!sandboxId) {
            throw new Error('sandboxId is required for fetch action')
          }

          return await handleFetchComponent({
            componentName,
            variant,
            sandboxId,
            generateDemo: generateDemo ?? true,
            modelId,
            writer,
            toolCallId,
          })
        } else {
          throw new Error(`Unknown action: ${action}`)
        }
      } catch (error) {
        const richError = getRichError({
          action: `components ${action}`,
          args: { componentName, query, sandboxId },
          error,
        })

        writer.write({
          id: toolCallId,
          type: 'data-components',
          data: {
            action,
            componentName,
            variant,
            query,
            status: 'error',
            error: richError.error,
          },
        })

        return richError.message
      }
    },
  })

/**
 * Handle list components action
 */
async function handleListComponents({
  query,
  tags,
  packageFilter,
  writer,
  toolCallId,
}: {
  query?: string
  tags?: string[]
  packageFilter?: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  toolCallId: string
}) {
  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { 
      action: 'list', 
      query,
      status: 'listing' 
    },
  })

  // Call XMCP list_components endpoint
  const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:3000/api/xmcp'
  const response = await fetch(`${baseUrl}/tools/list_components`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      tags,
      package: packageFilter,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Failed to list components: ${errorData.error || response.statusText}`)
  }

  const { items, total } = await response.json()
  const componentNames = items.map((item: { name: string }) => item.name)

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: {
      action: 'list',
      query,
      results: componentNames,
      status: 'done',
    },
  })

  // Format response for AI
  const componentList = items.map((item: { name: string; package: string; version: string; description: string; tags?: string[] }) => 
    `**${item.name}** (${item.package} v${item.version})\n` +
    `  ${item.description}\n` +
    (item.tags ? `  Tags: ${item.tags.join(', ')}\n` : '')
  ).join('\n')

  return `Found ${total} component${total !== 1 ? 's' : ''} in the catalog:\n\n${componentList}\n\n` +
    `To use a component, call the components tool with action "fetch" and specify the componentName.`
}

/**
 * Handle fetch component action
 */
async function handleFetchComponent({
  componentName,
  variant,
  sandboxId,
  generateDemo,
  modelId,
  writer,
  toolCallId,
}: {
  componentName: string
  variant?: string
  sandboxId: string
  generateDemo: boolean
  modelId: string
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  toolCallId: string
}) {
  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { 
      action: 'fetch', 
      componentName,
      variant,
      status: 'fetching' 
    },
  })

  // Get sandbox instance
  let sandbox: Sandbox
  try {
    sandbox = await Sandbox.get({ sandboxId })
  } catch (error) {
    throw new Error(`Failed to get sandbox: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Call XMCP get_component endpoint
  const baseUrl = process.env.MCP_BASE_URL || 'http://localhost:3000/api/xmcp'
  const response = await fetch(`${baseUrl}/tools/get_component`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: componentName,
      variant,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(`Failed to get component: ${errorData.error || errorData.message || response.statusText}`)
  }

  const { component } = await response.json()

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: {
      action: 'fetch',
      componentName,
      variant,
      status: 'generating',
    },
  })

  // Generate component files
  const result = await generateComponentFiles({
    component,
    variant,
    sandbox,
    generateDemo,
    modelId,
  })

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: {
      action: 'fetch',
      componentName,
      variant,
      generatedFiles: result.files.map(f => f.path),
      demoPath: result.demoPath,
      status: 'done',
    },
  })

  // Format response for AI
  const filesList = result.files.map(f => `- ${f.path}`).join('\n')
  const demoInfo = result.demoPath ? `\n\nDemo page created at: ${result.demoPath}` : ''
  
  return `Successfully generated ${componentName}${variant ? ` (${variant} variant)` : ''} component!\n\n` +
    `Generated files:\n${filesList}${demoInfo}\n\n` +
    `The component is now ready to use in your application. ` +
    (result.demoPath ? `You can preview it by navigating to the demo page.` : '')
}
