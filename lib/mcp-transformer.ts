import { registryItemSchema, type RegistryItem } from './registry-schema';

// MCP Response structure (based on actual MCP server response)
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
  };
}

/**
 * Transforms MCP component response to ShadCN-compatible registry item
 */
export function transformMCPToRegistryItem(mcpResponse: MCPComponentResponse): RegistryItem {
  const { component } = mcpResponse;
  
  // Create files array based on component structure
  const files = [];
  
  // 1. Main component TSX file
  if (component.code) {
    files.push({
      name: `${component.name}.tsx`,
      content: component.code,
    });
  } else {
    // Generate basic component structure if no code provided
    files.push({
      name: `${component.name}.tsx`,
      content: generateBasicComponent(component),
    });
  }
  
  // 2. Style files
  if (component.style?.type === 'scss') {
    const scssContent = component.style.entries
      .map(entry => `@import '${entry}';`)
      .join('\n');
    
    files.push({
      name: `${component.name}.scss`,
      content: scssContent,
    });
  }
  
  // 3. CSS module fallback
  files.push({
    name: `${component.name}.module.css`,
    content: generateBasicCSS(component.name),
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
    category: 'UI',
  };
  
  // Validate against schema
  return registryItemSchema.parse(registryItem);
}

/**
 * Generates a basic component structure when no code is provided
 */
function generateBasicComponent(component: MCPComponentResponse['component']): string {
  const propsInterface = generatePropsInterface(component);
  const componentImpl = generateComponentImplementation(component);
  
  return `import React from 'react';
import clsx from 'clsx';
import styles from './${component.name}.module.css';

${propsInterface}

${componentImpl}`;
}

/**
 * Generates TypeScript props interface
 */
function generatePropsInterface(component: MCPComponentResponse['component']): string {
  if (!component.props.length) {
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
 * Generates component implementation
 */
function generateComponentImplementation(component: MCPComponentResponse['component']): string {
  const propNames = component.props.map(prop => prop.name);
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
 * Generates basic CSS for component
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
  
  // Add any other standard dependencies that might be needed
  // Note: We avoid adding @andes/* or @mcp/* packages as they don't exist in npm
  
  return dependencies;
}
