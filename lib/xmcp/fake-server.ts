import fs from 'fs/promises'
import path from 'path'
import type {
  NormalizedComponentSpec,
  ComponentListItem,
  ListComponentsRequest,
  ListComponentsResponse,
  GetComponentRequest,
  GetComponentResponse,
} from './types'
import { normalizeComponentSpec, filterComponents } from './normalizer'

/**
 * Raw catalog structure as stored in JSON file
 */
interface ComponentCatalog {
  components: unknown[]
  metadata?: {
    version?: string
    lastUpdated?: string
    totalComponents?: number
    packages?: string[]
    tags?: string[]
  }
}

/**
 * In-memory cache for the component catalog
 */
let catalogCache: {
  components: NormalizedComponentSpec[]
  listItems: ComponentListItem[]
  lastLoaded?: number
  metadata?: ComponentCatalog['metadata']
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes in development

/**
 * Loads the component catalog from the JSON file
 */
async function loadCatalog(): Promise<ComponentCatalog> {
  const catalogPath = path.join(process.cwd(), 'data', 'components-catalog.json')
  
  try {
    const fileContent = await fs.readFile(catalogPath, 'utf-8')
    const catalog = JSON.parse(fileContent) as ComponentCatalog
    
    if (!catalog.components || !Array.isArray(catalog.components)) {
      throw new Error('Invalid catalog format: components must be an array')
    }
    
    return catalog
  } catch (error) {
    console.error('Failed to load component catalog:', error)
    
    // Return empty catalog as fallback
    return {
      components: [],
      metadata: {
        version: '0.0.0',
        totalComponents: 0,
        packages: [],
        tags: [],
      },
    }
  }
}

/**
 * Gets the cached catalog or loads it from file
 */
async function getCatalog(): Promise<typeof catalogCache> {
  const now = Date.now()
  
  // Return cache if it's still valid
  if (catalogCache?.lastLoaded && (now - catalogCache.lastLoaded) < CACHE_TTL) {
    return catalogCache
  }
  
  // Load fresh catalog
  const rawCatalog = await loadCatalog()
  
  try {
    // Normalize all components
    const components: NormalizedComponentSpec[] = []
    const listItems: ComponentListItem[] = []
    
    for (const rawComponent of rawCatalog.components) {
      try {
        const normalized = normalizeComponentSpec(rawComponent)
        components.push(normalized)
        
        // Create list item from normalized component
        const listItem: ComponentListItem = {
          name: normalized.name,
          description: normalized.description,
          package: normalized.package,
          version: normalized.version,
          style: normalized.style,
          tags: normalized.tags,
        }
        listItems.push(listItem)
      } catch (error) {
        console.warn(`Failed to normalize component:`, error)
        continue
      }
    }
    
    catalogCache = {
      components,
      listItems,
      lastLoaded: now,
      metadata: rawCatalog.metadata,
    }
    
    console.log(`Loaded ${components.length} components from catalog`)
    return catalogCache
  } catch (error) {
    console.error('Failed to process catalog:', error)
    
    // Return empty cache as fallback
    catalogCache = {
      components: [],
      listItems: [],
      lastLoaded: now,
      metadata: rawCatalog.metadata,
    }
    
    return catalogCache
  }
}

/**
 * Clears the catalog cache (useful for development)
 */
export function clearCatalogCache(): void {
  catalogCache = null
  console.log('Component catalog cache cleared')
}

/**
 * Fake MCP server implementation for listing components
 */
export async function fakeListComponents(
  request: ListComponentsRequest = {}
): Promise<ListComponentsResponse> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    return { items: [], total: 0 }
  }
  
  // Apply filters
  const filtered = filterComponents(
    catalog.listItems,
    request.query,
    request.tags,
    request.package
  )
  
  return {
    items: filtered,
    total: filtered.length,
  }
}

/**
 * Fake MCP server implementation for getting a specific component
 */
export async function fakeGetComponent(
  request: GetComponentRequest
): Promise<GetComponentResponse> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    throw new Error('Component catalog not available')
  }
  
  // Find component by name (case-insensitive)
  const component = catalog.components.find(
    c => c.name.toLowerCase() === request.name.toLowerCase()
  )
  
  if (!component) {
    // Try to find similar components for helpful error message
    const similar = catalog.listItems
      .filter(c => 
        c.name.toLowerCase().includes(request.name.toLowerCase()) ||
        request.name.toLowerCase().includes(c.name.toLowerCase())
      )
      .slice(0, 3)
    
    const suggestions = similar.length > 0 
      ? ` Did you mean: ${similar.map(c => c.name).join(', ')}?`
      : ''
    
    throw new Error(`Component "${request.name}" not found.${suggestions}`)
  }
  
  // Apply variant-specific modifications if requested
  let finalComponent = { ...component }
  
  if (request.variant) {
    const variant = component.variants.find(
      v => v.name.toLowerCase() === request.variant?.toLowerCase()
    )
    
    if (variant) {
      // Apply variant prop overrides to the component's default props
      finalComponent = {
        ...component,
        // Update the code template with variant-specific defaults
        code: component.code.replace(
          /defaultValue\s*=\s*['"`]([^'"`]+)['"`]/g,
          (match) => {
            // Find if this prop has a variant override
            for (const [propName, propValue] of Object.entries(variant.props)) {
              if (match.includes(propName)) {
                return `defaultValue="${propValue}"`
              }
            }
            return match
          }
        ),
      }
    } else {
      console.warn(`Variant "${request.variant}" not found for component "${request.name}"`)
    }
  }
  
  return {
    component: finalComponent,
  }
}

/**
 * Gets catalog metadata and statistics
 */
export async function getCatalogInfo(): Promise<{
  metadata?: ComponentCatalog['metadata']
  stats: {
    totalComponents: number
    packages: string[]
    tags: string[]
    languages: string[]
    hasCache: boolean
    lastLoaded?: number
  }
}> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    return {
      stats: {
        totalComponents: 0,
        packages: [],
        tags: [],
        languages: [],
        hasCache: false,
      },
    }
  }
  
  // Extract statistics from loaded components
  const packages = [...new Set(catalog.components.map(c => c.package))]
  const tags = [...new Set(catalog.components.flatMap(c => c.tags || []))]
  const languages = [...new Set(catalog.components.map(c => c.language))]
  
  return {
    metadata: catalog.metadata,
    stats: {
      totalComponents: catalog.components.length,
      packages,
      tags,
      languages,
      hasCache: !!catalogCache,
      lastLoaded: catalog.lastLoaded,
    },
  }
}

/**
 * Searches components with advanced filtering
 */
export async function searchComponents(options: {
  query?: string
  tags?: string[]
  packages?: string[]
  languages?: string[]
  limit?: number
  offset?: number
}): Promise<{
  items: ComponentListItem[]
  total: number
  hasMore: boolean
}> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    return { items: [], total: 0, hasMore: false }
  }
  
  let filtered = catalog.listItems
  
  // Apply filters
  if (options.query) {
    filtered = filterComponents(filtered, options.query)
  }
  
  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter(c => 
      options.tags?.some(tag => c.tags?.includes(tag))
    )
  }
  
  if (options.packages && options.packages.length > 0) {
    filtered = filtered.filter(c => 
      options.packages?.includes(c.package)
    )
  }
  
  if (options.languages && options.languages.length > 0) {
    const components = catalog.components.filter(c =>
      options.languages?.includes(c.language)
    )
    const languageNames = new Set(components.map(c => c.name))
    filtered = filtered.filter(c => languageNames.has(c.name))
  }
  
  // Apply pagination
  const total = filtered.length
  const offset = options.offset || 0
  const limit = options.limit || 50
  const items = filtered.slice(offset, offset + limit)
  const hasMore = offset + limit < total
  
  return {
    items,
    total,
    hasMore,
  }
}

/**
 * Development utilities
 */
export const dev = {
  /**
   * Reloads the catalog from file (development only)
   */
  async reloadCatalog() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Catalog reload is not available in production')
    }
    
    clearCatalogCache()
    const catalog = await getCatalog()
    return catalog
  },
  
  /**
   * Validates all components in the catalog
   */
  async validateCatalog() {
    const rawCatalog = await loadCatalog()
    const results = {
      total: rawCatalog.components.length,
      valid: 0,
      invalid: 0,
      errors: [] as string[],
    }
    
    for (let i = 0; i < rawCatalog.components.length; i++) {
      try {
        normalizeComponentSpec(rawCatalog.components[i])
        results.valid++
      } catch (error) {
        results.invalid++
        results.errors.push(`Component ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
    
    return results
  },
  
  /**
   * Gets raw catalog data for debugging
   */
  async getRawCatalog() {
    return loadCatalog()
  },
}
