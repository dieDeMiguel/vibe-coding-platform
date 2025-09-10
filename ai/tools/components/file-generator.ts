import type { Sandbox } from '@vercel/sandbox'
import type { NormalizedComponentSpec } from '@/lib/xmcp'

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
 * Generates component files in the sandbox from a component specification
 */
export async function generateComponentFiles({
  component,
  variant,
  sandbox,
  generateDemo = true,
  modelId: _modelId,
}: {
  component: NormalizedComponentSpec
  variant?: string
  sandbox: Sandbox
  generateDemo?: boolean
  modelId: string
}): Promise<FileGenerationResult> {
  const files: GeneratedFile[] = []
  const componentDir = `components/${component.name}`
  const componentPath = `${componentDir}/${component.name}.tsx`

  // 1. Generate main component TSX file
  const tsxContent = generateTSXFile(component, variant)
  files.push({
    path: componentPath,
    content: tsxContent,
    type: 'tsx',
  })

  // 2. Generate CSS module file (always create this as fallback)
  const cssModuleContent = generateCSSModule(component)
  files.push({
    path: `${componentDir}/${component.name}.module.css`,
    content: cssModuleContent,
    type: 'css',
  })

  // 3. Generate SCSS file if available
  if (component.style?.type === 'scss') {
    const scssAsset = component.assets.find(asset => 
      asset.type === 'scss' || asset.path.endsWith('.scss')
    )
    if (scssAsset) {
      files.push({
        path: `${componentDir}/${scssAsset.path}`,
        content: scssAsset.contents,
        type: 'scss',
      })
    }
  }

  // 4. Generate component metadata file
  const metadataContent = generateMetadata(component, variant)
  files.push({
    path: `${componentDir}/component.json`,
    content: metadataContent,
    type: 'json',
  })

  // 5. Generate demo page if requested
  let demoPath: string | undefined
  if (generateDemo) {
    const demoContent = generateDemoPage(component, variant)
    demoPath = `app/demo/${component.name.toLowerCase()}/page.tsx`
    files.push({
      path: demoPath,
      content: demoContent,
      type: 'tsx',
    })
  }

  // 6. Write all files to sandbox
  await writeFilesToSandbox(sandbox, files)

  return {
    files,
    demoPath,
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
 * Generates the main TSX component file
 */
function generateTSXFile(component: NormalizedComponentSpec, variant?: string): string {
  // Use the component's code if available, otherwise generate basic structure
  if (component.code && component.code.trim()) {
    return component.code
  }

  // Generate basic component structure
  const propsInterface = generatePropsInterface(component)
  const componentImpl = generateComponentImplementation(component, variant)

  return `import React from 'react';
import { clsx } from 'clsx';
import styles from './${component.name}.module.css';

${propsInterface}

${componentImpl}`
}

/**
 * Generates TypeScript props interface
 */
function generatePropsInterface(component: NormalizedComponentSpec): string {
  if (!component.props.length) {
    return `export interface ${component.name}Props {
  children?: React.ReactNode;
  className?: string;
}`
  }

  const propsLines = component.props.map(prop => {
    const optional = prop.required ? '' : '?'
    const defaultComment = prop.default !== undefined ? ` // default: ${JSON.stringify(prop.default)}` : ''
    const description = prop.description ? `  /** ${prop.description} */\n` : ''
    
    return `${description}  ${prop.name}${optional}: ${prop.type};${defaultComment}`
  }).join('\n')

  return `export interface ${component.name}Props {
${propsLines}
  className?: string;
}`
}

/**
 * Generates basic component implementation
 */
function generateComponentImplementation(component: NormalizedComponentSpec, _variant?: string): string {
  const defaultProps = component.props
    .filter(prop => !prop.required && prop.default !== undefined)
    .map(prop => `${prop.name} = ${JSON.stringify(prop.default)}`)
    .join(',\n  ')

  const propDestructuring = component.props.map(prop => prop.name).join(', ')
  const hasProps = component.props.length > 0

  return `export const ${component.name}: React.FC<${component.name}Props> = ({
  ${hasProps ? `${propDestructuring},` : ''}
  className,
  ${defaultProps ? `${defaultProps},` : ''}
  ...props
}) => {
  return (
    <div
      className={clsx(
        styles.${component.name.toLowerCase()},
        className
      )}
      {...props}
    >
      {/* Component implementation */}
      ${component.name} Component
    </div>
  );
};`
}

/**
 * Generates CSS module content
 */
function generateCSSModule(component: NormalizedComponentSpec): string {
  // Try to use existing CSS asset first
  const cssAsset = component.assets.find(asset => 
    asset.type === 'css' || asset.path.endsWith('.module.css')
  )
  
  if (cssAsset) {
    return cssAsset.contents
  }

  // Generate basic CSS module
  const className = component.name.toLowerCase()
  
  return `.${className} {
  /* ${component.name} component styles */
  display: block;
}

/* Add your custom styles here */`
}

/**
 * Generates component metadata JSON
 */
function generateMetadata(component: NormalizedComponentSpec, variant?: string): string {
  const metadata = {
    name: component.name,
    package: component.package,
    version: component.version,
    description: component.description,
    variant: variant || 'default',
    generatedAt: new Date().toISOString(),
    props: component.props,
    variants: component.variants,
    tags: component.tags,
    dependencies: component.dependencies,
  }

  return JSON.stringify(metadata, null, 2)
}

/**
 * Generates demo page content
 */
function generateDemoPage(component: NormalizedComponentSpec, variant?: string): string {
  const importPath = `@/components/${component.name}/${component.name}`
  const componentUsage = generateComponentUsage(component, variant)

  return `'use client'

import React, { useState } from 'react';
import { ${component.name} } from '${importPath}';

export default function ${component.name}Demo() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ${component.name} Component
          </h1>
          <p className="text-gray-600 mb-8">
            ${component.description}
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                ${variant ? `${variant.charAt(0).toUpperCase() + variant.slice(1)} Variant` : 'Default Usage'}
              </h2>
              <div className="border rounded-lg p-6 bg-gray-50">
                ${componentUsage}
              </div>
            </section>

            ${generateVariantExamples(component)}
          </div>
        </div>
      </div>
    </div>
  );
}`
}

/**
 * Generates component usage example
 */
function generateComponentUsage(component: NormalizedComponentSpec, variant?: string): string {
  const requiredProps = component.props.filter(prop => prop.required)
  const variantProps = variant ? 
    component.variants.find(v => v.name === variant)?.props || {} : {}

  const props = [
    ...requiredProps.map(prop => {
      if (variantProps[prop.name] !== undefined) {
        return `${prop.name}={${JSON.stringify(variantProps[prop.name])}}`
      }
      return prop.type.includes('ReactNode') ? 
        `${prop.name}="Example ${prop.name}"` :
        `${prop.name}={${JSON.stringify(prop.default || getExampleValue(prop.type))}}`
    }),
    ...Object.entries(variantProps).map(([key, value]) => 
      `${key}={${JSON.stringify(value)}}`
    )
  ].filter((prop, index, arr) => arr.indexOf(prop) === index) // Remove duplicates

  const propsString = props.length > 0 ? `\n          ${props.join('\n          ')}\n        ` : ''

  if (component.name === 'ProductCard') {
    return `<${component.name}${propsString}
          product={{
            id: '1',
            title: 'Example Product',
            price: 99.99,
            image: 'https://via.placeholder.com/300x200',
            rating: 4.5,
            reviews: 123
          }}
        />`
  }

  return `<${component.name}${propsString}>
          ${component.props.some(p => p.name === 'children') ? 'Example Content' : ''}
        </${component.name}>`
}

/**
 * Generates variant examples section
 */
function generateVariantExamples(component: NormalizedComponentSpec): string {
  if (!component.variants.length) return ''

  const examples = component.variants.slice(0, 3).map(variant => {
    const usage = generateComponentUsage(component, variant.name)
    return `            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                ${variant.name.charAt(0).toUpperCase() + variant.name.slice(1)}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                ${variant.description || `${variant.name} variant of ${component.name}`}
              </p>
              <div className="border rounded p-4 bg-white">
                ${usage}
              </div>
            </div>`
  }).join('\n\n')

  return `
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Available Variants
              </h2>
              <div className="space-y-6">
${examples}
              </div>
            </section>`
}

/**
 * Gets example value for a TypeScript type
 */
function getExampleValue(type: string): any {
  if (type.includes('string')) return 'example'
  if (type.includes('number')) return 42
  if (type.includes('boolean')) return true
  if (type.includes('ReactNode')) return 'Example Content'
  return 'example'
}

/**
 * Writes generated files to the sandbox
 */
async function writeFilesToSandbox(sandbox: Sandbox, files: GeneratedFile[]): Promise<void> {
  for (const file of files) {
    await sandbox.writeFile(file.path, file.content)
  }
}
