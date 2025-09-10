// Main XMCP module exports

// Types and schemas
export * from './types'

// Normalization utilities
export * from './normalizer'

// Client utilities
export * from './client'

// Configuration utilities
export * from './config'

// Fake server implementation
export * from './fake-server'

// Re-export commonly used items for convenience
export {
  type NormalizedComponentSpec,
  type ComponentListItem,
  type ListComponentsRequest,
  type GetComponentRequest,
  type XMCPConfig,
  DEFAULT_XMCP_CONFIG,
} from './types'

export {
  normalizeComponentSpec,
  normalizeComponentListItem,
  filterComponents,
} from './normalizer'

export {
  XMCPClient,
  XMCPClientError,
  createXMCPClient,
  getXMCPClient,
  updateXMCPConfig,
} from './client'

export {
  fakeListComponents,
  fakeGetComponent,
  getCatalogInfo,
  searchComponents,
  clearCatalogCache,
} from './fake-server'
