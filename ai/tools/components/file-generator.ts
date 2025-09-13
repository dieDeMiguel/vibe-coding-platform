import type { Sandbox } from '@vercel/sandbox'

// Inline type definitions (moved from removed @/lib/xmcp/types)
export interface ComponentProp {
  name: string
  type: string
  required: boolean
  default?: unknown
  description?: string
}

export interface ComponentVariant {
  name: string
  description?: string
  props: Record<string, unknown>
}

export interface ComponentAsset {
  type: string
  path: string
  contents?: string
}

export interface ComponentStyle {
  type: 'scss' | 'css'
  entries: string[]
}

export interface NormalizedComponentSpec {
  name: string
  package: string
  version: string
  description: string
  language: string
  style?: ComponentStyle
  props: ComponentProp[]
  variants: ComponentVariant[]
  code?: string
  assets: ComponentAsset[]
  tags: string[]
  dependencies: string[]
}

export interface GeneratedFile {
  path: string
  content: string
  type: 'tsx' | 'jsx' | 'css' | 'scss' | 'json' | 'md'
}

export interface FileGenerationResult {
  files: GeneratedFile[]
  demoPath?: string
  componentPath: string
  metadata: {
    name: string
    variant?: string
    generatedAt: string
    filesCount: number
  }
}

/**
 * DEPRECATED: This function is no longer used.
 * Component generation is now handled by the MCP normalizer with AI.
 * 
 * @deprecated Use MCP normalizer instead
 */
export async function generateComponentFiles({
  component,
  variant,
  sandbox,
}: {
  component: NormalizedComponentSpec
  variant?: string
  sandbox: Sandbox
}): Promise<FileGenerationResult> {
  console.warn('generateComponentFiles is deprecated. Use MCP normalizer instead.');
  
  // Fallback implementation for backward compatibility
  const files: GeneratedFile[] = []
  const componentDir = `components/${component.name}`
  const componentPath = `${componentDir}/${component.name}.tsx`

  // Basic fallback component
  const basicComponent = `import React from 'react';

interface ${component.name}Props {
  children?: React.ReactNode;
  className?: string;
}

export const ${component.name}: React.FC<${component.name}Props> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default ${component.name};`

  files.push({
    path: componentPath,
    content: basicComponent,
    type: 'tsx',
  })

  // Basic CSS
  files.push({
    path: `${componentDir}/${component.name}.module.css`,
    content: `.${component.name.toLowerCase()} {\n  /* Add styles here */\n}`,
    type: 'css',
  })

  // Write files to sandbox
  await writeFilesToSandbox(sandbox, files)

  return {
    files,
    demoPath: undefined,
    componentPath,
    metadata: {
      name: component.name,
      variant,
      generatedAt: new Date().toISOString(),
      filesCount: files.length,
    },
  }
}

/**
 * Write files to sandbox with error handling
 */
async function writeFilesToSandbox(sandbox: Sandbox, files: GeneratedFile[]): Promise<void> {
  const writePromises = files.map(async (file) => {
    try {
      await sandbox.writeFiles([{ path: file.path, content: Buffer.from(file.content, 'utf8') }])
      console.log(`✓ Generated: ${file.path}`)
    } catch (error) {
      console.error(`✗ Failed to write ${file.path}:`, error)
      throw new Error(`Failed to write file ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })

  await Promise.all(writePromises)
  console.log(`✅ Successfully generated ${files.length} files`)
}

// Types are already exported as interfaces above