import type { UIMessageStreamWriter, UIMessage } from 'ai'
import type { DataPart } from '../messages/data-parts'
import { Sandbox } from '@vercel/sandbox'
import { getRichError } from './get-rich-error'
import { tool } from 'ai'
import { type NormalizedComponentSpec } from './components/file-generator'
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
 * Validates that all relative imports in a component have corresponding files
 */
function validateImports(componentContent: string, availableFiles: Array<{path: string, content: string}>): string[] {
  const missingImports: string[] = []
  
  // Extract import statements with relative paths
  const importRegex = /import.*from\s+['"](\.\.\?\/[^'"]+)['"]/g
  const imports = [...componentContent.matchAll(importRegex)]
  
  for (const [, importPath] of imports) {
    // Convert import path to expected file path
    // '../Spinner/Spinner' -> 'Spinner.tsx'
    const fileName = importPath.split('/').pop() + '.tsx'
    
    // Check if file exists in available files
    const fileExists = availableFiles.some(file => file.path.endsWith(fileName))
    
    if (!fileExists) {
      missingImports.push(importPath)
    }
  }
  
  return missingImports
}

/**
 * Validates that all npm package imports are listed in dependencies
 */
function validateNpmDependencies(componentContent: string, declaredDependencies: string[]): string[] {
  const missingDependencies: string[] = []
  
  // Extract import statements for npm packages (not relative paths)
  const importRegex = /import.*from\s+['"]([^.][^'"]+)['"]/g
  const imports = [...componentContent.matchAll(importRegex)]
  
  for (const [, importPath] of imports) {
    // Skip built-in modules and scoped packages for now
    if (importPath.startsWith('@') || ['react', 'react-dom'].includes(importPath)) {
      continue
    }
    
    // Check if dependency is declared
    if (!declaredDependencies.includes(importPath)) {
      missingDependencies.push(importPath)
    }
  }
  
  return missingDependencies
}

/**
 * Attempts to auto-recover missing helper component files
 */
async function attemptAutoRecovery(missingImports: string[], _componentTitle: string): Promise<Array<{path: string, content: string, type: 'tsx' | 'css' | 'scss'}>> {
  const recoveredFiles: Array<{path: string, content: string, type: 'tsx' | 'css' | 'scss'}> = []
  
  for (const importPath of missingImports) {
    const { name: componentName, type: componentType } = parseImportPath(importPath)
    
    // Try to auto-recover based on component type and name
    const template = getComponentTemplate(componentName, componentType)
    
    if (template) {
      // Add main component file
      recoveredFiles.push({
        path: `components/${componentName}/${componentName}.tsx`,
        content: template.component,
        type: 'tsx'
      })
      
      // Add CSS module if template provides one
      if (template.styles) {
        recoveredFiles.push({
          path: `components/${componentName}/${componentName}.module.css`,
          content: template.styles,
          type: 'css'
        })
      }
      
      console.log(`🔄 Auto-recovered ${componentName} (${componentType}) component`)
    } else {
      console.warn(`⚠️ No template available for ${componentName} (${componentType})`)
    }
  }
  
  return recoveredFiles
}

/**
 * Extracts component name and type from import path
 */
function parseImportPath(importPath: string): { name: string; type: 'component' | 'icon' | 'util' | 'unknown' } {
  const parts = importPath.split('/')
  const fileName = parts[parts.length - 1]
  const directory = parts[parts.length - 2]
  
  // Determine type based on directory or naming patterns
  let type: 'component' | 'icon' | 'util' | 'unknown' = 'unknown'
  
  if (directory === 'icons' || fileName.startsWith('Icon') || fileName.includes('Icon')) {
    type = 'icon'
  } else if (directory === 'utils' || fileName.includes('util') || fileName.includes('helper')) {
    type = 'util'
  } else if (fileName[0] === fileName[0].toUpperCase()) {
    // Capitalized = likely a component
    type = 'component'
  }
  
  return { name: fileName, type }
}

/**
 * Gets component template based on name and type
 */
function getComponentTemplate(name: string, type: 'component' | 'icon' | 'util' | 'unknown'): { component: string; styles?: string } | null {
  // Spinner component
  if (name === 'Spinner') {
    return {
      component: generateSpinnerComponent(),
      styles: generateSpinnerStyles()
    }
  }
  
  // Generic icon component
  if (type === 'icon' || name.includes('Icon')) {
    return {
      component: generateIconComponent(name)
    }
  }
  
  // Generic component
  if (type === 'component') {
    return {
      component: generateGenericComponent(name),
      styles: generateGenericStyles(name)
    }
  }
  
  return null
}

/**
 * Generates default Spinner component content
 */
function generateSpinnerComponent(): string {
  return `import React from 'react';
import styles from './Spinner.module.css';

interface SpinnerProps {
  srAnnouncement?: string;
  size?: 'small' | 'medium' | 'large';
}

const Spinner: React.FC<SpinnerProps> = ({ 
  srAnnouncement = "Loading...", 
  size = 'medium' 
}) => {
  return (
    <div className={styles.spinner} data-size={size}>
      <div className={styles.circle}></div>
      {srAnnouncement && (
        <span className={styles.srOnly}>{srAnnouncement}</span>
      )}
    </div>
  );
};

Spinner.displayName = 'Spinner';

export default Spinner;`
}

/**
 * Generates default Spinner styles
 */
function generateSpinnerStyles(): string {
  return `.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.circle {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner[data-size="small"] .circle {
  width: 12px;
  height: 12px;
  border-width: 1.5px;
}

.spinner[data-size="large"] .circle {
  width: 20px;
  height: 20px;
  border-width: 2.5px;
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}`
}

/**
 * Generates generic icon component template
 */
function generateIconComponent(name: string): string {
  return `import React from 'react';

interface ${name}Props {
  size?: number;
  className?: string;
  color?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  size = 24, 
  className = '', 
  color = 'currentColor' 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* TODO: Add actual icon path */}
      <circle cx="12" cy="12" r="10"/>
      <path d="m9 12 2 2 4-4"/>
    </svg>
  );
};

${name}.displayName = '${name}';
export default ${name};`
}

/**
 * Generates generic component template
 */
function generateGenericComponent(name: string): string {
  return `import React from 'react';
import styles from './${name}.module.css';

interface ${name}Props {
  children?: React.ReactNode;
  className?: string;
}

const ${name}: React.FC<${name}Props> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={\`\${styles.${name.toLowerCase()}} \${className}\`}>
      {children || '${name} Component'}
    </div>
  );
};

${name}.displayName = '${name}';
export default ${name};`
}

/**
 * Generates generic component styles
 */
function generateGenericStyles(name: string): string {
  return `.${name.toLowerCase()} {
  /* Add your styles here */
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background-color: #ffffff;
}`
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

  // VALIDATION: Check for missing imports in main component
  const mainComponentFile = files.find(f => f.path.endsWith(`${registryItem.title}.tsx`))
  if (mainComponentFile) {
    const missingImports = validateImports(mainComponentFile.content, files)
    if (missingImports.length > 0) {
      console.warn(`⚠️ Missing imports detected in ${registryItem.title}:`, missingImports)
      
      // AUTO-RECOVERY: Try to add missing helper files
      const recoveredFiles = await attemptAutoRecovery(missingImports, registryItem.title)
      if (recoveredFiles.length > 0) {
        files.push(...recoveredFiles)
        console.log(`✅ Auto-recovered ${recoveredFiles.length} missing files:`, recoveredFiles.map(f => f.path))
      }
    }
    
    // VALIDATION: Check for missing npm dependencies
    const missingDependencies = validateNpmDependencies(mainComponentFile.content, registryItem.dependencies)
    if (missingDependencies.length > 0) {
      console.warn(`⚠️ Missing npm dependencies in ${registryItem.title}:`, missingDependencies)
    }
  }

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
  
  // Check if component needs additional setup
  const needsClsx = result.files.some(f => f.content?.includes('clsx'))
  const hasSpinner = result.files.some(f => f.path.includes('Spinner'))
  const mainComponent = result.files.find(f => f.path.includes(`${componentName}.tsx`))
  const hasSpinnerImport = mainComponent?.content?.includes('../Spinner/Spinner') || mainComponent?.content?.includes('./Spinner')
  
  let setupInstructions = ''
  if (needsClsx) {
    setupInstructions += `\n⚠️  REQUIRED: Install clsx dependency first:\n   pnpm add clsx\n`
  }
  
  if (hasSpinnerImport && !hasSpinner) {
    setupInstructions += `\n⚠️  MISSING: Component imports Spinner but Spinner files not found!\n` +
      `   You MUST create these files:\n` +
      `   - components/Spinner/Spinner.tsx\n` +
      `   - components/Spinner/Spinner.module.css\n`
  }
  
  return `Successfully generated ${componentName}${variant ? ` (${variant} variant)` : ''}!\n\n` +
    `Files created:\n${filesList}${setupInstructions}${result.demoPath ? `\n\nDemo: ${result.demoPath}` : ''}\n\n` +
    `${setupInstructions ? '🚨 IMPORTANT: Complete the setup instructions above before using the component.' : '✅ Component is ready to use!'}`
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