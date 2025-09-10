import { z } from 'zod'
import {
  type NormalizedComponentSpec,
  type ComponentListItem,
  type ComponentProp,
  type ComponentVariant,
  type ComponentAsset,
  type ComponentStyle,
  NormalizedComponentSpecSchema,
  ComponentListItemSchema,
} from './types'

// Generic schema for unknown MCP component data
const UnknownComponentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  package: z.string().optional(),
  version: z.string().optional(),
}).passthrough() // Allow additional unknown fields

/**
 * Normalizes component props from various possible formats
 */
function normalizeProps(props: unknown): ComponentProp[] {
  if (!props) return []
  
  try {
    // Handle array format
    if (Array.isArray(props)) {
      return props.map((prop) => normalizeProp(prop)).filter(Boolean) as ComponentProp[]
    }
    
    // Handle object format (key-value pairs)
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

/**
 * Normalizes a single prop from unknown format
 */
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

/**
 * Normalizes component variants from various formats
 */
function normalizeVariants(variants: unknown): ComponentVariant[] {
  if (!variants) return []
  
  try {
    if (Array.isArray(variants)) {
      return variants.map((variant) => normalizeVariant(variant)).filter(Boolean) as ComponentVariant[]
    }
    
    if (typeof variants === 'object' && variants !== null) {
      return Object.entries(variants).map(([name, config]) => 
        normalizeVariant({ name, ...(config as Record<string, unknown>) })
      ).filter(Boolean) as ComponentVariant[]
    }
    
    return []
  } catch (error) {
    console.warn('Failed to normalize variants:', error)
    return []
  }
}

/**
 * Normalizes a single variant from unknown format
 */
function normalizeVariant(variant: unknown): ComponentVariant | null {
  if (!variant || typeof variant !== 'object') return null
  
  const v = variant as Record<string, unknown>
  
  try {
    return {
      name: String(v.name || ''),
      description: v.description ? String(v.description) : undefined,
      props: (v.props || v.properties || {}) as Record<string, unknown>,
    }
  } catch (error) {
    console.warn('Failed to normalize variant:', error)
    return null
  }
}

/**
 * Normalizes component assets from various formats
 */
function normalizeAssets(assets: unknown): ComponentAsset[] {
  if (!assets) return []
  
  try {
    if (Array.isArray(assets)) {
      return assets.map((asset) => normalizeAsset(asset)).filter(Boolean) as ComponentAsset[]
    }
    
    return []
  } catch (error) {
    console.warn('Failed to normalize assets:', error)
    return []
  }
}

/**
 * Normalizes a single asset from unknown format
 */
function normalizeAsset(asset: unknown): ComponentAsset | null {
  if (!asset || typeof asset !== 'object') return null
  
  const a = asset as Record<string, unknown>
  
  try {
    return {
      path: String(a.path || a.file || ''),
      contents: String(a.contents || a.content || a.data || ''),
      type: a.type ? String(a.type) as 'scss' | 'css' | 'json' | 'md' | 'svg' | 'png' | 'jpg' : undefined,
    }
  } catch (error) {
    console.warn('Failed to normalize asset:', error)
    return null
  }
}

/**
 * Normalizes component style configuration
 */
function normalizeStyle(style: unknown): ComponentStyle | undefined {
  if (!style || typeof style !== 'object') return undefined
  
  const s = style as Record<string, unknown>
  
  try {
    const type = s.type || s.styleType || 'css'
    const entry = s.entry || s.entryPoint || s.main || 'styles.css'
    
    if (!['scss', 'css', 'module'].includes(String(type))) {
      return { type: 'css', entry: String(entry) }
    }
    
    return {
      type: String(type) as 'scss' | 'css' | 'module',
      entry: String(entry),
    }
  } catch (error) {
    console.warn('Failed to normalize style:', error)
    return undefined
  }
}

/**
 * Normalizes a full component specification from unknown MCP format
 */
export function normalizeComponentSpec(data: unknown): NormalizedComponentSpec {
  const parsed = UnknownComponentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`Invalid component data: ${parsed.error.message}`)
  }
  
  const component = parsed.data as Record<string, unknown>
  
  // Extract and normalize all fields with fallbacks
  const normalized: NormalizedComponentSpec = {
    name: component.name,
    package: String(component.package || component.pkg || '@unknown/components'),
    version: String(component.version || component.ver || '1.0.0'),
    description: String(component.description || component.desc || ''),
    language: (['tsx', 'jsx'].includes(String(component.language)) ? 
      String(component.language) : 'tsx') as 'tsx' | 'jsx',
    style: normalizeStyle(component.style || component.styles),
    props: normalizeProps(component.props || component.properties),
    variants: normalizeVariants(component.variants || component.variations),
    code: String(component.code || component.source || component.template || ''),
    assets: normalizeAssets(component.assets || component.files),
    tags: Array.isArray(component.tags) ? 
      component.tags.map(String) : 
      (component.category ? [String(component.category)] : []),
    dependencies: Array.isArray(component.dependencies) ? 
      component.dependencies.map(String) : [],
  }
  
  // Validate the normalized result
  const validation = NormalizedComponentSpecSchema.safeParse(normalized)
  if (!validation.success) {
    console.warn('Normalization resulted in invalid spec:', validation.error)
    // Try to fix common issues
    if (!normalized.name) normalized.name = 'UnknownComponent'
    if (!normalized.description) normalized.description = 'No description available'
  }
  
  return normalized
}

/**
 * Normalizes a component list item from unknown MCP format
 */
export function normalizeComponentListItem(data: unknown): ComponentListItem {
  const parsed = UnknownComponentSchema.safeParse(data)
  if (!parsed.success) {
    throw new Error(`Invalid component list item: ${parsed.error.message}`)
  }
  
  const item = parsed.data as Record<string, unknown>
  
  const normalized: ComponentListItem = {
    name: item.name,
    description: String(item.description || item.desc || ''),
    package: String(item.package || item.pkg || '@unknown/components'),
    version: String(item.version || item.ver || '1.0.0'),
    style: normalizeStyle(item.style || item.styles),
    tags: Array.isArray(item.tags) ? 
      item.tags.map(String) : 
      (item.category ? [String(item.category)] : []),
  }
  
  const validation = ComponentListItemSchema.safeParse(normalized)
  if (!validation.success) {
    console.warn('List item normalization failed:', validation.error)
    if (!normalized.name) normalized.name = 'UnknownComponent'
    if (!normalized.description) normalized.description = 'No description available'
  }
  
  return normalized
}

/**
 * Batch normalize an array of component list items
 */
export function normalizeComponentList(data: unknown[]): ComponentListItem[] {
  return data
    .map((item) => {
      try {
        return normalizeComponentListItem(item)
      } catch (error) {
        console.warn('Failed to normalize list item:', error)
        return null
      }
    })
    .filter((item): item is ComponentListItem => item !== null)
}

/**
 * Validates if data can be normalized as a component spec
 */
export function canNormalizeComponentSpec(data: unknown): boolean {
  try {
    normalizeComponentSpec(data)
    return true
  } catch {
    return false
  }
}

/**
 * Extracts searchable text from a component for filtering
 */
export function getSearchableText(component: ComponentListItem | NormalizedComponentSpec): string {
  const parts = [
    component.name,
    component.description,
    component.package,
    ...(component.tags || []),
  ]
  
  if ('props' in component) {
    parts.push(...component.props.map(p => p.name))
  }
  
  return parts.join(' ').toLowerCase()
}

/**
 * Filters components based on search query
 */
export function filterComponents(
  components: ComponentListItem[],
  query?: string,
  tags?: string[],
  packageFilter?: string
): ComponentListItem[] {
  let filtered = components
  
  // Filter by package
  if (packageFilter) {
    filtered = filtered.filter(c => c.package.includes(packageFilter))
  }
  
  // Filter by tags
  if (tags && tags.length > 0) {
    filtered = filtered.filter(c => 
      tags.some(tag => c.tags?.includes(tag))
    )
  }
  
  // Filter by search query
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim()
    filtered = filtered.filter(c => 
      getSearchableText(c).includes(searchTerm)
    )
  }
  
  return filtered
}
