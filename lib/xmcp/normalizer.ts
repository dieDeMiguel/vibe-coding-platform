import { z } from 'zod'
import {
  type NormalizedComponentSpec,
  type ComponentListItem,
  type ComponentProp,
  type ComponentVariant,
  type ComponentAsset,
  type ComponentStyle,
} from './types'

// Generic schema for unknown MCP component data
const UnknownComponentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  package: z.string().optional(),
  version: z.string().optional(),
}).passthrough()

function normalizeProps(props: unknown): ComponentProp[] {
  if (!props) return []
  
  try {
    if (Array.isArray(props)) {
      return props.map((prop) => normalizeProp(prop)).filter(Boolean) as ComponentProp[]
    }
    
    if (typeof props === 'object' && props !== null) {
      return Object.entries(props).map(([name, config]) => 
        normalizeProp({ name, ...(config as Record<string, unknown>) })
      ).filter(Boolean) as ComponentProp[]
    }
    
    return []
  } catch (error) {
    console.warn('Failed to normalize props:', error)
    return []
  }
}

function normalizeProp(prop: unknown): ComponentProp | null {
  if (!prop || typeof prop !== 'object') return null
  
  const p = prop as Record<string, unknown>
  
  try {
    return {
      name: String(p.name || ''),
      type: String(p.type || p.propType || 'any'),
      required: Boolean(p.required ?? p.isRequired ?? true),
      default: p.default ?? p.defaultValue,
      description: p.description ? String(p.description) : undefined,
    }
  } catch (error) {
    console.warn('Failed to normalize prop:', error)
    return null
  }
}

export function normalizeComponentSpec(data: unknown): NormalizedComponentSpec {
  const parsed = UnknownComponentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`Invalid component data: ${parsed.error.message}`)
  }
  
  const component = parsed.data as Record<string, unknown>
  
  const normalized: NormalizedComponentSpec = {
    name: String(component.name),
    package: String(component.package || '@unknown/components'),
    version: String(component.version || '1.0.0'),
    description: String(component.description || ''),
    language: (['tsx', 'jsx'].includes(String(component.language)) ? 
      String(component.language) : 'tsx') as 'tsx' | 'jsx',
    style: normalizeStyle(component.style),
    props: normalizeProps(component.props),
    variants: normalizeVariants(component.variants),
    code: String(component.code || ''),
    assets: normalizeAssets(component.assets),
    tags: Array.isArray(component.tags) ? component.tags.map(String) : [],
    dependencies: Array.isArray(component.dependencies) ? component.dependencies.map(String) : [],
  }
  
  return normalized
}

function normalizeStyle(style: unknown): ComponentStyle | undefined {
  if (!style || typeof style !== 'object') return undefined
  
  const s = style as Record<string, unknown>
  const type = s.type || 'css'
  const entry = s.entry || 'styles.css'
  
  return {
    type: String(type) as 'scss' | 'css' | 'module',
    entry: String(entry),
  }
}

function normalizeVariants(variants: unknown): ComponentVariant[] {
  if (!variants || !Array.isArray(variants)) return []
  
  return variants.map(v => ({
    name: String(v.name || ''),
    description: v.description ? String(v.description) : undefined,
    props: (v.props || {}) as Record<string, unknown>,
  }))
}

function normalizeAssets(assets: unknown): ComponentAsset[] {
  if (!assets || !Array.isArray(assets)) return []
  
  return assets.map(a => ({
    path: String(a.path || ''),
    contents: String(a.contents || ''),
    type: a.type ? String(a.type) as 'scss' | 'css' | 'json' | 'md' | 'svg' | 'png' | 'jpg' : undefined,
  }))
}

export function normalizeComponentList(components: unknown[]): ComponentListItem[] {
  if (!Array.isArray(components)) return []
  
  return components.map(component => normalizeComponentListItem(component)).filter(Boolean) as ComponentListItem[]
}

export function normalizeComponentListItem(data: unknown): ComponentListItem | null {
  try {
    const component = normalizeComponentSpec(data)
    
    return {
      name: component.name,
      description: component.description,
      package: component.package,
      version: component.version,
      style: component.style,
      tags: component.tags,
    }
  } catch (error) {
    console.warn('Failed to normalize component list item:', error)
    return null
  }
}

export function filterComponents(
  components: ComponentListItem[],
  query?: string,
  tags?: string[],
  packageName?: string
): ComponentListItem[] {
  let filtered = [...components]
  
  if (query) {
    const searchQuery = query.toLowerCase()
    filtered = filtered.filter(component => 
      component.name.toLowerCase().includes(searchQuery) ||
      component.description.toLowerCase().includes(searchQuery) ||
      component.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
    )
  }
  
  if (tags && tags.length > 0) {
    filtered = filtered.filter(component =>
      component.tags?.some(tag => tags.includes(tag))
    )
  }
  
  if (packageName) {
    filtered = filtered.filter(component => 
      component.package === packageName
    )
  }
  
  return filtered
}