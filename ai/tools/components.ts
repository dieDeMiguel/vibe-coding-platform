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

export const components = ({ modelId, writer }: Params) =>
  tool({
    description,
    inputSchema: z.object({
      action: z.enum(['list', 'fetch']).describe('Action to perform'),
      query: z.string().optional().describe('Search query for list action'),
      tags: z.array(z.string()).optional().describe('Tags to filter by'),
      package: z.string().optional().describe('Package to filter by'),
      componentName: z.string().optional().describe('Component name for fetch action'),
      variant: z.string().optional().describe('Component variant'),
      sandboxId: z.string().optional().describe('Sandbox ID for fetch action'),
      generateDemo: z.boolean().optional().default(true).describe('Generate demo page'),
    }),
    
    execute: async ({ action, query, tags, package: packageFilter, componentName, variant, sandboxId, generateDemo }, { toolCallId }) => {
      writer.write({
        id: toolCallId,
        type: 'data-components',
        data: { action, componentName, variant, query, status: 'loading' },
      })

      try {
        if (action === 'list') {
          return await handleListComponents({ query, tags, packageFilter, writer, toolCallId })
        } else if (action === 'fetch') {
          if (!componentName || !sandboxId) {
            throw new Error('componentName and sandboxId are required for fetch action')
          }
          return await handleFetchComponent({
            componentName, variant, sandboxId, generateDemo: generateDemo ?? true,
            writer, toolCallId
          })
        }
        throw new Error(`Unknown action: ${action}`)
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
            action, componentName, variant, query, status: 'error',
            error: richError.error,
          },
        })

        return richError.message
      }
    },
  })

async function handleListComponents({
  query, tags, packageFilter, writer, toolCallId,
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
    data: { action: 'list', query, status: 'listing' },
  })

  const mcpEndpoint = process.env.MCP_ENDPOINT || 'http://localhost:3001/mcp'
  const response = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'list_components',
        arguments: { query, tags, packageFilter }
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to list components: ${response.statusText}`)
  }

  const mcpResponse = await response.json()
  
  if (mcpResponse.error) {
    throw new Error(`MCP Error: ${mcpResponse.error.message}`)
  }
  
  // Parse the components from MCP response
  const componentsText = mcpResponse.result?.content?.[0]?.text
  if (!componentsText) {
    throw new Error('Invalid MCP response format')
  }
  
  const { items, total } = JSON.parse(componentsText)
  const componentNames = items.map((item: { name: string }) => item.name)

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { action: 'list', query, results: componentNames, status: 'done' },
  })

  const componentList = items.map((item: any) => 
    `**${item.name}** (${item.package} v${item.version})\n  ${item.description}`
  ).join('\n\n')

  return `Found ${total} component${total !== 1 ? 's' : ''}:\n\n${componentList}`
}

async function handleFetchComponent({
  componentName, variant, sandboxId, generateDemo, writer, toolCallId,
}: {
  componentName: string
  variant?: string
  sandboxId: string
  generateDemo: boolean
  writer: UIMessageStreamWriter<UIMessage<never, DataPart>>
  toolCallId: string
}) {
  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { action: 'fetch', componentName, variant, status: 'fetching' },
  })

  // Get sandbox
  const sandbox = await Sandbox.get({ sandboxId })

  // Get component from MCP server
  const mcpEndpoint = process.env.MCP_ENDPOINT || 'http://localhost:3001/mcp'
  const response = await fetch(mcpEndpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'get_component',
        arguments: { name: componentName, variant }
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to get component: ${response.statusText}`)
  }

  const mcpResponse = await response.json()
  
  if (mcpResponse.error) {
    throw new Error(`MCP Error: ${mcpResponse.error.message}`)
  }
  
  // Parse the component from MCP response
  const componentText = mcpResponse.result?.content?.[0]?.text
  if (!componentText) {
    throw new Error('Invalid MCP response format')
  }
  
  const { component } = JSON.parse(componentText)

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { action: 'fetch', componentName, variant, status: 'generating' },
  })

  // Generate files
  const result = await generateComponentFiles({
    component, variant, sandbox, generateDemo,
  })

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: {
      action: 'fetch', componentName, variant,
      generatedFiles: result.files.map(f => f.path),
      demoPath: result.demoPath, status: 'done',
    },
  })

  const filesList = result.files.map(f => `- ${f.path}`).join('\n')
  
  return `Successfully generated ${componentName}${variant ? ` (${variant} variant)` : ''}!\n\n` +
    `Files created:\n${filesList}${result.demoPath ? `\n\nDemo: ${result.demoPath}` : ''}`
}