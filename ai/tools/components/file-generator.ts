import type { Sandbox } from '@vercel/sandbox'
import type { NormalizedComponentSpec } from '@/lib/xmcp/types'

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
 * Enhanced file generation with better templates and error handling
 */
export async function generateComponentFiles({
  component,
  variant,
  sandbox,
  generateDemo = true,
}: {
  component: NormalizedComponentSpec
  variant?: string
  sandbox: Sandbox
  generateDemo?: boolean
}): Promise<FileGenerationResult> {
  const files: GeneratedFile[] = []
  const componentDir = `components/${component.name}`
  const componentPath = `${componentDir}/${component.name}.tsx`

  try {
    // 1. Generate main component TSX file with enhanced template
    const tsxContent = generateEnhancedTSXFile(component, variant)
    files.push({
      path: componentPath,
      content: tsxContent,
      type: 'tsx',
    })

    // 2. Generate CSS module (always create as fallback)
    const cssModuleContent = generateEnhancedCSSModule(component)
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
      if (scssAsset && scssAsset.contents) {
        files.push({
          path: `${componentDir}/${scssAsset.path}`,
          content: scssAsset.contents,
          type: 'scss',
        })
      }
    }

    // 4. Generate component metadata
    const metadataContent = generateEnhancedMetadata(component, variant)
    files.push({
      path: `${componentDir}/component.json`,
      content: metadataContent,
      type: 'json',
    })

    // 5. Generate TypeScript type definitions
    const typesContent = generateTypeDefinitions(component)
    files.push({
      path: `${componentDir}/types.ts`,
      content: typesContent,
      type: 'tsx',
    })

    // 6. Generate demo page if requested
    let demoPath: string | undefined
    if (generateDemo) {
      const demoContent = generateEnhancedDemoPage(component, variant)
      demoPath = `app/demo/${component.name.toLowerCase()}/page.tsx`
      files.push({
        path: demoPath,
        content: demoContent,
        type: 'tsx',
      })

      // Generate demo layout
      const demoLayoutContent = generateDemoLayout()
      files.push({
        path: `app/demo/layout.tsx`,
        content: demoLayoutContent,
        type: 'tsx',
      })
    }

    // 7. Generate README for the component
    const readmeContent = generateComponentReadme(component, variant)
    files.push({
      path: `${componentDir}/README.md`,
      content: readmeContent,
      type: 'md',
    })

    // 8. Write all files to sandbox
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
  } catch (error) {
    console.error('Error generating component files:', error)
    throw new Error(`Failed to generate files for ${component.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates enhanced TSX component with better structure
 */
function generateEnhancedTSXFile(component: NormalizedComponentSpec, variant?: string): string {
  // Use existing code if available and complete
  if (component.code && component.code.trim() && component.code.includes('export')) {
    return component.code
  }

  const propsInterface = generatePropsInterface(component)
  const componentImpl = generateEnhancedComponentImplementation(component, variant)
  const imports = generateImports(component)

  return `${imports}

${propsInterface}

${componentImpl}`
}

/**
 * Generates necessary imports for the component
 */
function generateImports(component: NormalizedComponentSpec): string {
  const imports = ['import React from \'react\'']
  
  // Add clsx if component has styling
  if (component.style || component.variants.length > 0) {
    imports.push('import { clsx } from \'clsx\'')
  }
  
  // Add CSS module import
  imports.push(`import styles from './${component.name}.module.css'`)
  
  // Add type imports
  imports.push(`import type { ${component.name}Props } from './types'`)
  
  return imports.join('\n')
}

/**
 * Enhanced props interface generation
 */
function generatePropsInterface(component: NormalizedComponentSpec): string {
  if (!component.props.length) {
    return `export interface ${component.name}Props {
  children?: React.ReactNode
  className?: string
}`
  }

  const propsLines = component.props.map(prop => {
    const optional = prop.required ? '' : '?'
    const description = prop.description ? `  /** ${prop.description} */\n` : ''
    
    return `${description}  ${prop.name}${optional}: ${prop.type}`
  }).join('\n')

  return `export interface ${component.name}Props {
${propsLines}
  children?: React.ReactNode
  className?: string
}`
}

/**
 * Enhanced component implementation with better patterns
 */
function generateEnhancedComponentImplementation(component: NormalizedComponentSpec, variant?: string): string {
  const defaultProps = component.props
    .filter(prop => !prop.required && prop.default !== undefined)
    .map(prop => `  ${prop.name} = ${JSON.stringify(prop.default)},`)
    .join('\n')

  const propDestructuring = component.props.map(prop => prop.name).join(',\n  ')
  const variantProps = variant ? 
    component.variants.find(v => v.name === variant)?.props || {} : {}

  // Generate component-specific implementation
  const componentBody = generateComponentBody(component, variant)

  return `export const ${component.name} = React.forwardRef<
  HTMLDivElement,
  ${component.name}Props
>(({
${propDestructuring ? `  ${propDestructuring},` : ''}
  children,
  className,
${defaultProps}
  ...props
}, ref) => {
${generateVariantLogic(component, variant)}

  return (
${componentBody}
  )
})

${component.name}.displayName = '${component.name}'`
}

/**
 * Generates component-specific body implementation
 */
function generateComponentBody(component: NormalizedComponentSpec, variant?: string): string {
  const className = component.name.toLowerCase()
  
  // Special implementations for specific component types
  switch (component.name.toLowerCase()) {
    case 'button':
      return `    <button
      ref={ref}
      className={clsx(
        styles.${className},
        variant && styles[\`\${className}--\${variant}\`],
        size && styles[\`\${className}--\${size}\`],
        {
          [styles[\`\${className}--disabled\`]]: disabled,
          [styles[\`\${className}--loading\`]]: loading,
        },
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <span className={styles.spinner}>
          <svg viewBox="0 0 24 24" className={styles.spinnerIcon}>
            <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2" />
          </svg>
        </span>
      ) : (
        children
      )}
    </button>`

    case 'input':
      return `    <div className={clsx(styles.inputGroup, className)}>
      {label && (
        <label className={clsx(styles.label, {
          [styles['label--required']]: required,
        })}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          styles.input,
          size && styles[\`input--\${size}\`],
          state && styles[\`input--\${state}\`],
          {
            [styles['input--disabled']]: disabled,
          }
        )}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        {...props}
      />
      {(error || helperText) && (
        <div className={clsx(styles.helperText, {
          [styles['helperText--error']]: error,
        })}>
          {error || helperText}
        </div>
      )}
    </div>`

    case 'card':
      return `    <div
      ref={ref}
      className={clsx(
        styles.${className},
        variant && styles[\`\${className}--\${variant}\`],
        padding && styles[\`\${className}--padding-\${padding}\`],
        {
          [styles[\`\${className}--clickable\`]]: clickable,
        },
        className
      )}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </div>`

    default:
      return `    <div
      ref={ref}
      className={clsx(
        styles.${className},
        className
      )}
      {...props}
    >
      {children}
    </div>`
  }
}

/**
 * Generates variant logic for components
 */
function generateVariantLogic(component: NormalizedComponentSpec, variant?: string): string {
  if (!component.variants.length) return ''
  
  return `  // Apply variant-specific defaults
  const appliedVariant = variant || '${variant || 'default'}'`
}

/**
 * Enhanced CSS module generation with comprehensive styles
 */
function generateEnhancedCSSModule(component: NormalizedComponentSpec): string {
  // Try to use existing CSS asset first
  const cssAsset = component.assets.find(asset => 
    asset.type === 'css' || asset.path.endsWith('.module.css')
  )
  
  if (cssAsset && cssAsset.contents) {
    return cssAsset.contents
  }

  // Generate enhanced CSS based on component type
  const className = component.name.toLowerCase()
  
  switch (component.name.toLowerCase()) {
    case 'button':
      return generateButtonCSS(className)
    case 'input':
      return generateInputCSS(className)
    case 'card':
      return generateCardCSS(className)
    case 'badge':
      return generateBadgeCSS(className)
    default:
      return generateDefaultCSS(className, component)
  }
}

/**
 * Generate Button-specific CSS
 */
function generateButtonCSS(className: string): string {
  return `.${className} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.${className}:focus {
  outline: 2px solid rgba(52, 131, 250, 0.2);
  outline-offset: 2px;
}

/* Variants */
.${className}--primary {
  background-color: #3483fa;
  color: white;
}

.${className}--primary:hover:not(.${className}--disabled) {
  background-color: #1c6dd0;
}

.${className}--secondary {
  background-color: transparent;
  color: #3483fa;
  border: 1px solid #3483fa;
}

.${className}--secondary:hover:not(.${className}--disabled) {
  background-color: rgba(52, 131, 250, 0.1);
}

/* Sizes */
.${className}--sm {
  padding: 6px 12px;
  font-size: 14px;
  min-height: 32px;
}

.${className}--md {
  padding: 8px 16px;
  font-size: 16px;
  min-height: 40px;
}

.${className}--lg {
  padding: 12px 24px;
  font-size: 18px;
  min-height: 48px;
}

/* States */
.${className}--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.${className}--loading {
  cursor: wait;
}

.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinnerIcon {
  width: 1em;
  height: 1em;
  stroke: currentColor;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`
}

/**
 * Generate Input-specific CSS
 */
function generateInputCSS(className: string): string {
  return `.inputGroup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.label--required::after {
  content: ' *';
  color: #dc3545;
}

.${className} {
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 16px;
  transition: all 0.2s ease;
  background-color: white;
}

.${className}:focus {
  outline: none;
  border-color: #3483fa;
  box-shadow: 0 0 0 3px rgba(52, 131, 250, 0.1);
}

.${className}--sm {
  padding: 6px 12px;
  font-size: 14px;
  min-height: 32px;
}

.${className}--md {
  padding: 8px 16px;
  font-size: 16px;
  min-height: 40px;
}

.${className}--lg {
  padding: 12px 20px;
  font-size: 18px;
  min-height: 48px;
}

.${className}--error {
  border-color: #dc3545;
}

.${className}--success {
  border-color: #28a745;
}

.helperText {
  font-size: 12px;
  margin-top: 4px;
}

.helperText--error {
  color: #dc3545;
}

.helperText--success {
  color: #28a745;
}`
}

/**
 * Generate Card-specific CSS
 */
function generateCardCSS(className: string): string {
  return `.${className} {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.${className}--outlined {
  border: 2px solid #e0e0e0;
}

.${className}--elevated {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.${className}--elevated:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.${className}--padding-sm {
  padding: 12px;
}

.${className}--padding-md {
  padding: 16px;
}

.${className}--padding-lg {
  padding: 24px;
}

.${className}--clickable {
  cursor: pointer;
}

.${className}--clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}`
}

/**
 * Generate Badge-specific CSS
 */
function generateBadgeCSS(className: string): string {
  return `.${className} {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 12px;
  white-space: nowrap;
}

.${className}--primary {
  background-color: #3483fa;
  color: white;
}

.${className}--secondary {
  background-color: #6c757d;
  color: white;
}

.${className}--success {
  background-color: #28a745;
  color: white;
}

.${className}--error {
  background-color: #dc3545;
  color: white;
}

.${className}--sm {
  padding: 2px 6px;
  font-size: 10px;
  min-height: 16px;
}

.${className}--md {
  padding: 4px 8px;
  font-size: 12px;
  min-height: 20px;
}

.${className}--lg {
  padding: 6px 12px;
  font-size: 14px;
  min-height: 24px;
}`
}

/**
 * Generate default CSS for unknown component types
 */
function generateDefaultCSS(className: string, component: NormalizedComponentSpec): string {
  return `.${className} {
  /* ${component.name} component styles */
  display: block;
}

/* Variants */
${component.variants.map(variant => 
  `.${className}--${variant.name} {\n  /* ${variant.description || variant.name} variant */\n}`
).join('\n\n')}

/* Add your custom styles here */`
}

/**
 * Enhanced metadata generation
 */
function generateEnhancedMetadata(component: NormalizedComponentSpec, variant?: string): string {
  const metadata = {
    name: component.name,
    package: component.package,
    version: component.version,
    description: component.description,
    variant: variant || 'default',
    generatedAt: new Date().toISOString(),
    language: component.language,
    style: component.style,
    props: component.props,
    variants: component.variants,
    tags: component.tags,
    dependencies: component.dependencies,
    files: {
      component: `${component.name}.tsx`,
      styles: `${component.name}.module.css`,
      types: 'types.ts',
      metadata: 'component.json',
      readme: 'README.md',
    },
    usage: {
      import: `import { ${component.name} } from '@/components/${component.name}'`,
      example: generateUsageExample(component, variant),
    },
  }

  return JSON.stringify(metadata, null, 2)
}

/**
 * Generate TypeScript type definitions
 */
function generateTypeDefinitions(component: NormalizedComponentSpec): string {
  const propsInterface = generatePropsInterface(component)
  
  // Generate variant types if available
  const variantTypes = component.variants.length > 0 ? `
export type ${component.name}Variant = ${component.variants.map(v => `'${v.name}'`).join(' | ')}

export interface ${component.name}VariantProps {
${component.variants.map(v => 
  `  ${v.name}: ${JSON.stringify(v.props, null, 2).replace(/\n/g, '\n  ')}`
).join('\n')}
}` : ''

  return `import type { ReactNode } from 'react'

${propsInterface}${variantTypes}

// Re-export for convenience
export type { ${component.name}Props }`
}

/**
 * Enhanced demo page generation
 */
function generateEnhancedDemoPage(component: NormalizedComponentSpec, variant?: string): string {
  const importPath = `@/components/${component.name}/${component.name}`
  const examples = generateMultipleExamples(component, variant)

  return `'use client'

import React, { useState } from 'react'
import { ${component.name} } from '${importPath}'

export default function ${component.name}Demo() {
  const [interactiveProps, setInteractiveProps] = useState<any>({})

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ${component.name} Component
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              ${component.description}
            </p>
            <div className="flex flex-wrap gap-2">
              ${component.tags?.map(tag => 
                `<span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">${tag}</span>`
              ).join('\n              ')}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  ${variant ? `${variant.charAt(0).toUpperCase() + variant.slice(1)} Variant` : 'Interactive Example'}
                </h2>
                <div className="border rounded-lg p-6 bg-gray-50">
                  ${generateInteractiveExample(component, variant)}
                </div>
              </section>

              ${generatePropsControls(component)}
            </div>

            <div className="space-y-6">
              ${examples}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}`
}

/**
 * Generate interactive example with controls
 */
function generateInteractiveExample(component: NormalizedComponentSpec, variant?: string): string {
  const usage = generateUsageExample(component, variant)
  return `{/* Interactive example will go here */}
                  ${usage}`
}

/**
 * Generate props controls for interactive demo
 */
function generatePropsControls(component: NormalizedComponentSpec): string {
  if (!component.props.length) return ''

  return `<section>
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  Props Controls
                </h3>
                <div className="space-y-4 p-4 bg-gray-100 rounded-lg">
                  {/* Props controls will be implemented here */}
                  <p className="text-sm text-gray-600">
                    Interactive controls for component props
                  </p>
                </div>
              </section>`
}

/**
 * Generate multiple examples showing different variants
 */
function generateMultipleExamples(component: NormalizedComponentSpec, variant?: string): string {
  if (!component.variants.length) {
    return `<section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Basic Usage
              </h3>
              <div className="border rounded p-4 bg-white">
                ${generateUsageExample(component, variant)}
              </div>
            </section>`
  }

  const examples = component.variants.slice(0, 4).map(v => {
    const usage = generateUsageExample(component, v.name)
    return `            <div>
              <h4 className="text-lg font-medium text-gray-700 mb-2">
                ${v.name.charAt(0).toUpperCase() + v.name.slice(1)}
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                ${v.description || `${v.name} variant of ${component.name}`}
              </p>
              <div className="border rounded p-4 bg-white">
                ${usage}
              </div>
            </div>`
  }).join('\n\n')

  return `<section>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Available Variants
              </h3>
              <div className="space-y-6">
${examples}
              </div>
            </section>`
}

/**
 * Generate usage example for component
 */
function generateUsageExample(component: NormalizedComponentSpec, variant?: string): string {
  const requiredProps = component.props.filter(prop => prop.required)
  const variantProps = variant ? 
    component.variants.find(v => v.name === variant)?.props || {} : {}

  const props = [
    ...requiredProps.map(prop => {
      if (variantProps[prop.name] !== undefined) {
        return `${prop.name}={${JSON.stringify(variantProps[prop.name])}}`
      }
      return `${prop.name}={${getExampleValue(prop.type)}}`
    }),
    ...Object.entries(variantProps)
      .filter(([key]) => !requiredProps.some(p => p.name === key))
      .map(([key, value]) => `${key}={${JSON.stringify(value)}}`)
  ]

  const propsString = props.length > 0 ? `\n                    ${props.join('\n                    ')}\n                  ` : ''

  return `<${component.name}${propsString}>
                    ${component.props.some(p => p.name === 'children') ? 'Example Content' : ''}
                  </${component.name}>`
}

/**
 * Generate demo layout
 */
function generateDemoLayout(): string {
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

/**
 * Generate component README
 */
function generateComponentReadme(component: NormalizedComponentSpec, variant?: string): string {
  return `# ${component.name}

${component.description}

## Package
\`${component.package}@${component.version}\`

## Usage

\`\`\`tsx
import { ${component.name} } from '@/components/${component.name}'

function Example() {
  return (
    ${generateUsageExample(component, variant)}
  )
}
\`\`\`

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
${component.props.map(prop => 
  `| \`${prop.name}\` | \`${prop.type}\` | ${prop.required ? 'Yes' : 'No'} | \`${prop.default || '-'}\` | ${prop.description || '-'} |`
).join('\n')}

${component.variants.length > 0 ? `## Variants

${component.variants.map(variant => 
  `### ${variant.name}\n${variant.description || `${variant.name} variant`}\n\n\`\`\`tsx\n${generateUsageExample(component, variant.name)}\n\`\`\``
).join('\n\n')}` : ''}

## Dependencies

${component.dependencies?.length ? component.dependencies.map(dep => `- \`${dep}\``).join('\n') : 'No external dependencies'}

## Tags

${component.tags?.map(tag => `\`${tag}\``).join(', ') || 'No tags'}
`
}

/**
 * Get example value for TypeScript types
 */
function getExampleValue(type: string): string {
  if (type.includes('string')) return '"example"'
  if (type.includes('number')) return '42'
  if (type.includes('boolean')) return 'true'
  if (type.includes('ReactNode')) return '"Example Content"'
  if (type.includes('() =>')) return '{() => {}}'
  return '"example"'
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