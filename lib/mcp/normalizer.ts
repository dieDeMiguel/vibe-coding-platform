import { registryItemSchema, registryIndexSchema, type RegistryItem, type RegistryIndex } from '@/lib/schema/registry';

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
      default?: any;
      description?: string;
    }>;
    variants: Array<{
      name: string;
      description?: string;
      props: Record<string, any>;
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
 * Transforms MCP component response to ShadCN-compatible registry item
 */
export function normalizeComponentToRegistryItem(mcpResponse: MCPComponentResponse): RegistryItem {
  const { component } = mcpResponse;
  
  // Create files array based on component structure
  const files = [];
  
  // 1. Main component TSX file - always generate self-contained version
  files.push({
    name: `${component.name}.tsx`,
    content: generateSelfContainedComponent(component),
  });
  
  // 2. Style files
  if (component.style?.type === 'scss' && component.style.entries.length > 0) {
    const scssContent = component.style.entries
      .map(entry => `@import '${entry}';`)
      .join('\n');
    
    files.push({
      name: `${component.name}.scss`,
      content: scssContent,
    });
  }
  
  // 3. CSS module with enhanced styles
  files.push({
    name: `${component.name}.module.css`,
    content: generateEnhancedCSS(component.name),
  });
  
  // Create registry item
  const registryItem = {
    name: component.name.toLowerCase(),
    type: 'component' as const,
    title: component.name,
    description: component.description,
    registryDependencies: [], // No internal registry dependencies for MCP components
    dependencies: extractDependencies(component),
    files,
    category: determineCategory(component),
  };
  
  // Validate against schema
  return registryItemSchema.parse(registryItem);
}

/**
 * Transforms MCP list response to registry index
 */
export function normalizeListToRegistryIndex(mcpResponse: MCPListResponse): RegistryIndex {
  const indexItems = mcpResponse.items.map(item => ({
    name: item.name.toLowerCase(),
    title: item.name,
    description: item.description,
    category: determineCategory(item),
  }));
  
  // Validate against schema
  return registryIndexSchema.parse(indexItems);
}

/**
 * Generates a self-contained component without external package dependencies
 */
function generateSelfContainedComponent(component: MCPComponentResponse['component']): string {
  const propsInterface = generatePropsInterface(component);
  const componentImpl = generateEnhancedComponentImplementation(component);
  
  return `import React from 'react';
import clsx from 'clsx';
import styles from './${component.name}.module.css';

${propsInterface}

${componentImpl}`;
}

/**
 * Generates a basic component structure when no code is provided (legacy)
 */
function generateBasicComponent(component: MCPComponentResponse['component']): string {
  return generateSelfContainedComponent(component);
}

/**
 * Generates TypeScript props interface
 */
function generatePropsInterface(component: MCPComponentResponse['component']): string {
  if (!component.props || component.props.length === 0) {
    return `export interface ${component.name}Props {
  children?: React.ReactNode;
  className?: string;
}`;
  }
  
  const propsLines = component.props.map(prop => {
    const optional = prop.required ? '' : '?';
    const description = prop.description ? `  /** ${prop.description} */\n` : '';
    return `${description}  ${prop.name}${optional}: ${prop.type};`;
  }).join('\n');
  
  return `export interface ${component.name}Props {
${propsLines}
  children?: React.ReactNode;
  className?: string;
}`;
}

/**
 * Generates enhanced component implementation with specific behavior per component type
 */
function generateEnhancedComponentImplementation(component: MCPComponentResponse['component']): string {
  const componentName = component.name;
  const componentType = componentName.toLowerCase();
  
  // Generate component-specific implementation
  switch (componentType) {
    case 'button':
      return generateButtonComponent(component);
    case 'badge':
      return generateBadgeComponent(component);
    default:
      return generateGenericComponent(component);
  }
}

/**
 * Generates Button component implementation
 */
function generateButtonComponent(component: MCPComponentResponse['component']): string {
  return `export const Button = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ hierarchy = 'loud', size = 'large', disabled = false, loading = false, children, className, onClick, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={clsx(
        styles.button,
        styles[\`button--\${hierarchy}\`],
        styles[\`button--\${size}\`],
        disabled && styles['button--disabled'],
        loading && styles['button--loading'],
        className
      )}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;`;
}

/**
 * Generates Badge component implementation  
 */
function generateBadgeComponent(component: MCPComponentResponse['component']): string {
  return `export const Badge = React.forwardRef<
  HTMLSpanElement,
  BadgeProps
>(({ variant = 'default', size = 'medium', children, className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={clsx(
        styles.badge,
        styles[\`badge--\${variant}\`],
        styles[\`badge--\${size}\`],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

export default Badge;`;
}

/**
 * Generates generic component implementation
 */
function generateGenericComponent(component: MCPComponentResponse['component']): string {
  const propNames = component.props?.map(prop => prop.name) || [];
  const destructuring = propNames.length > 0 ? `${propNames.join(', ')}, ` : '';
  
  return `export const ${component.name} = React.forwardRef<
  HTMLDivElement,
  ${component.name}Props
>(({ ${destructuring}children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={clsx(styles.${component.name.toLowerCase()}, className)}
      {...props}
    >
      {children}
    </div>
  );
});

${component.name}.displayName = '${component.name}';

export default ${component.name};`;
}

/**
 * Generates component implementation (legacy)
 */
function generateComponentImplementation(component: MCPComponentResponse['component']): string {
  return generateEnhancedComponentImplementation(component);
}

/**
 * Generates enhanced CSS with component-specific styles
 */
function generateEnhancedCSS(componentName: string): string {
  const componentType = componentName.toLowerCase();
  
  switch (componentType) {
    case 'button':
      return generateButtonCSS();
    case 'badge':
      return generateBadgeCSS();
    default:
      return generateBasicCSS(componentName);
  }
}

/**
 * Generates Button CSS styles
 */
function generateButtonCSS(): string {
  return `.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.875rem;
  line-height: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
}

.button--loud {
  background-color: #3b82f6;
  color: white;
}

.button--loud:hover {
  background-color: #2563eb;
}

.button--quiet {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.button--quiet:hover {
  background-color: #e5e7eb;
}

.button--mute {
  background-color: transparent;
  color: #6b7280;
}

.button--mute:hover {
  background-color: #f9fafb;
}

.button--transparent {
  background-color: transparent;
  color: #3b82f6;
}

.button--transparent:hover {
  background-color: #eff6ff;
}

.button--small {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.button--medium {
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
}

.button--large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.button--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button--loading {
  cursor: wait;
}

.spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}`;
}

/**
 * Generates Badge CSS styles
 */
function generateBadgeCSS(): string {
  return `.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1rem;
  white-space: nowrap;
}

.badge--default {
  background-color: #f3f4f6;
  color: #374151;
}

.badge--success {
  background-color: #dcfce7;
  color: #166534;
}

.badge--error {
  background-color: #fee2e2;
  color: #dc2626;
}

.badge--warning {
  background-color: #fef3c7;
  color: #d97706;
}

.badge--info {
  background-color: #dbeafe;
  color: #2563eb;
}

.badge--small {
  padding: 0.125rem 0.5rem;
  font-size: 0.625rem;
}

.badge--medium {
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
}

.badge--large {
  padding: 0.375rem 1rem;
  font-size: 0.875rem;
}`;
}

/**
 * Generates basic CSS for component (fallback)
 */
function generateBasicCSS(componentName: string): string {
  const className = componentName.toLowerCase();
  return `.${className} {
  /* ${componentName} component styles */
  display: block;
}`;
}

/**
 * Extracts npm dependencies from component
 */
function extractDependencies(component: MCPComponentResponse['component']): string[] {
  const dependencies = ['clsx']; // Always include clsx for styling
  
  // Add React if not already included
  if (!dependencies.includes('react')) {
    dependencies.push('react');
  }
  
  // Note: We avoid adding @andes/* or @mcp/* packages as they don't exist in npm
  
  return dependencies;
}

/**
 * Determines component category based on name and properties
 */
function determineCategory(component: { name: string; tags?: string[] }): string {
  if (component.tags?.length) {
    return component.tags[0];
  }
  
  const name = component.name.toLowerCase();
  
  // Common UI component categories
  if (['button', 'input', 'select', 'textarea', 'checkbox', 'radio'].includes(name)) {
    return 'Form';
  }
  
  if (['card', 'modal', 'dialog', 'drawer', 'sheet'].includes(name)) {
    return 'Layout';
  }
  
  if (['alert', 'toast', 'notification', 'badge'].includes(name)) {
    return 'Feedback';
  }
  
  return 'UI';
}
