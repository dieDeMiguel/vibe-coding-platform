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
import { normalizeComponentSpec } from './normalizer'

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

let catalogCache: {
  components: NormalizedComponentSpec[]
  listItems: ComponentListItem[]
  lastLoaded?: number
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function loadCatalog(): Promise<ComponentCatalog> {
  const catalogPath = path.join(process.cwd(), 'data', 'components-catalog.json')
  
  try {
    const fileContent = await fs.readFile(catalogPath, 'utf-8')
    return JSON.parse(fileContent) as ComponentCatalog
  } catch (error) {
    console.error('Failed to load component catalog:', error)
    return { components: [] }
  }
}

async function getCatalog(): Promise<typeof catalogCache> {
  const now = Date.now()
  
  if (catalogCache?.lastLoaded && (now - catalogCache.lastLoaded) < CACHE_TTL) {
    return catalogCache
  }
  
  const rawCatalog = await loadCatalog()
  
  try {
    const components: NormalizedComponentSpec[] = []
    const listItems: ComponentListItem[] = []
    
    for (const rawComponent of rawCatalog.components) {
      try {
        const normalized = normalizeComponentSpec(rawComponent)
        components.push(normalized)
        
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
    
    catalogCache = { components, listItems, lastLoaded: now }
    console.log(`Loaded ${components.length} components from catalog`)
    return catalogCache
  } catch (error) {
    console.error('Failed to process catalog:', error)
    return null
  }
}

export async function fakeListComponents(
  request: ListComponentsRequest = {}
): Promise<ListComponentsResponse> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    return { items: [], total: 0 }
  }
  
  let filtered = catalog.listItems
  
  if (request.query) {
    const query = request.query.toLowerCase()
    filtered = filtered.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.tags?.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  return { items: filtered, total: filtered.length }
}

export async function fakeGetComponent(
  request: GetComponentRequest
): Promise<GetComponentResponse> {
  const catalog = await getCatalog()
  
  if (!catalog) {
    throw new Error('Component catalog not available')
  }
  
  const component = catalog.components.find(
    c => c.name.toLowerCase() === request.name.toLowerCase()
  )
  
  if (!component) {
    throw new Error(`Component "${request.name}" not found`)
  }
  
  return { component }
}