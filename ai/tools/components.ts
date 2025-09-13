import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import { generateComponentFiles, type NormalizedComponentSpec } from './components/file-generator'
import type { RegistryItem } from '@/lib/schema/registry'
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

  // Get components list from internal registry endpoint
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
      
  const queryParams = new URLSearchParams();
  if (query) queryParams.set('query', query);
  if (tags?.length) queryParams.set('tags', tags.join(','));
  if (packageFilter) queryParams.set('package', packageFilter);
  
  const indexUrl = `${baseUrl}/r/index${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(indexUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list components: ${response.statusText}`)
  }

  const items = await response.json()
  const total = items.length
  const componentNames = items.map((item: { name: string }) => item.name)

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { action: 'list', query, results: componentNames, status: 'done' },
  })

  const componentList = items.map((item: any) => 
    `**${item.title}** (${item.category})\n  ${item.description || 'No description available'}`
  ).join('\n\n')

  return `Found ${total} component${total !== 1 ? 's' : ''}:\n\n${componentList}`
}

/**
 * Converts registry item back to NormalizedComponentSpec for compatibility
 */
function convertRegistryToNormalizedSpec(registryItem: RegistryItem, originalComponent: any): NormalizedComponentSpec {
  return {
    name: registryItem.title,
    package: originalComponent.package || '@andes/ui',
    version: originalComponent.version || '1.0.0',
    description: registryItem.description || '',
    language: originalComponent.language || 'tsx',
    style: originalComponent.style,
    props: originalComponent.props || [],
    variants: originalComponent.variants || [],
    code: registryItem.files.find(f => f.name.endsWith('.tsx'))?.content,
    assets: [],
    tags: [registryItem.category],
    dependencies: registryItem.dependencies,
  }
}

/**
 * Generates component files from registry item
 */
async function generateComponentFilesFromRegistry({
  registryItem,
  component,
  variant,
  sandbox,
  generateDemo = true,
}: {
  registryItem: RegistryItem
  component: NormalizedComponentSpec
  variant?: string
  sandbox: Sandbox
  generateDemo?: boolean
}) {
  // Use registry item files directly
  const files = registryItem.files.map(file => ({
    path: `components/${registryItem.title}/${file.name}`,
    content: file.content,
    type: file.name.endsWith('.tsx') ? 'tsx' as const :
          file.name.endsWith('.scss') ? 'scss' as const :
          file.name.endsWith('.css') ? 'css' as const : 'tsx' as const,
  }))

  // Add demo files if requested
  if (generateDemo) {
    const demoContent = generateBasicDemoPage(registryItem)
    const demoPath = `app/demo/${registryItem.name}/page.tsx`
    files.push({
      path: demoPath,
      content: demoContent,
      type: 'tsx',
    })

    // Generate demo layout
    const demoLayoutContent = generateBasicDemoLayout()
    files.push({
      path: `app/demo/layout.tsx`,
      content: demoLayoutContent,
      type: 'tsx',
    })
  }

  // Write files to sandbox
  await sandbox.writeFiles(files.map(file => ({
    path: file.path,
    content: Buffer.from(file.content, 'utf-8')
  })))
  
  files.forEach(file => console.log(`✓ Generated: ${file.path}`))

  return {
    files,
    demoPath: generateDemo ? `app/demo/${registryItem.name}/page.tsx` : undefined,
    componentPath: `components/${registryItem.title}/${registryItem.title}.tsx`,
    metadata: {
      name: registryItem.title,
      variant,
      generatedAt: new Date().toISOString(),
      filesCount: files.length,
    },
  }
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

  // Get component from internal registry endpoint
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : 'https://meli-vibe-coding-platform.vercel.app'; // Force main URL instead of deployment-specific URL
      
  const registryUrl = `${baseUrl}/r/${componentName}${variant ? `?variant=${variant}` : ''}`;
  
  console.log('🔧 Component fetch debug:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  VERCEL_URL:', process.env.VERCEL_URL);
  console.log('  baseUrl:', baseUrl);
  console.log('  registryUrl:', registryUrl);
  
  const response = await fetch(registryUrl, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Component '${componentName}' not found`)
    }
    throw new Error(`Failed to get component: ${response.statusText}`)
  }

  // Get registry item directly
  const registryItem = await response.json();
  
  // Convert registry item back to NormalizedComponentSpec for compatibility
  const component = convertRegistryToNormalizedSpec(registryItem, {
    name: registryItem.title,
    package: '@andes/ui',
    version: '1.0.0',
    description: registryItem.description,
    language: 'tsx',
    props: [],
    variants: [],
  });

  writer.write({
    id: toolCallId,
    type: 'data-components',
    data: { action: 'fetch', componentName, variant, status: 'generating' },
  })

  // Generate files based on registry item
  const result = await generateComponentFilesFromRegistry({
    registryItem, component, variant, sandbox, generateDemo,
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

/**
 * Generate basic demo page for registry item
 */
function generateBasicDemoPage(registryItem: RegistryItem): string {
  const importPath = `@/components/${registryItem.title}/${registryItem.title}`
  
  return `'use client'

import React from 'react'
import { ${registryItem.title} } from '${importPath}'

export default function ${registryItem.title}Demo() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ${registryItem.title} Component
        </h1>
        <p className="text-lg text-gray-600">
          ${registryItem.description || 'Component demonstration'}
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Basic Usage
        </h2>
        <div className="border rounded-lg p-6 bg-white">
          <${registryItem.title}>
            Sample content
          </${registryItem.title}>
        </div>
      </section>
    </div>
  )
}`
}

/**
 * Generate basic demo layout
 */
function generateBasicDemoLayout(): string {
  return `import type { ReactNode } from 'react'

export default function DemoLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Component Demo
          </h1>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to App
          </a>
        </div>
      </nav>
      {children}
    </div>
  )
}`
}