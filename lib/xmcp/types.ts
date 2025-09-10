import { z } from 'zod'

// Base component prop definition
export const ComponentPropSchema = z.object({
  name: z.string(),
  type: z.string(), // TypeScript type as string (e.g., "'primary' | 'secondary'", "ReactNode")
  required: z.boolean(),
  default: z.any().optional(), // Default value if not required
  description: z.string().optional(),
})

export type ComponentProp = z.infer<typeof ComponentPropSchema>

// Component variant definition
export const ComponentVariantSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  props: z.record(z.any()), // Key-value pairs for prop overrides
})

export type ComponentVariant = z.infer<typeof ComponentVariantSchema>

// Component asset definition (for additional files like SCSS, images, etc.)
export const ComponentAssetSchema = z.object({
  path: z.string(), // Relative path within component directory
  contents: z.string(),
  type: z.enum(['scss', 'css', 'json', 'md', 'svg', 'png', 'jpg']).optional(),
})

export type ComponentAsset = z.infer<typeof ComponentAssetSchema>

// Style configuration
export const ComponentStyleSchema = z.object({
  type: z.enum(['scss', 'css', 'module']),
  entry: z.string(), // Entry file path
})

export type ComponentStyle = z.infer<typeof ComponentStyleSchema>

// Main normalized component specification
export const NormalizedComponentSpecSchema = z.object({
  name: z.string(),
  package: z.string(),
  version: z.string(),
  description: z.string(),
  language: z.enum(['tsx', 'jsx']),
  style: ComponentStyleSchema.optional(),
  props: z.array(ComponentPropSchema),
  variants: z.array(ComponentVariantSchema),
  code: z.string(), // TSX/JSX source code as template or complete implementation
  assets: z.array(ComponentAssetSchema),
  tags: z.array(z.string()).optional(), // For categorization and filtering
  dependencies: z.array(z.string()).optional(), // External dependencies required
})

export type NormalizedComponentSpec = z.infer<typeof NormalizedComponentSpecSchema>

// Component list item (lightweight version for listing)
export const ComponentListItemSchema = z.object({
  name: z.string(),
  description: z.string(),
  package: z.string(),
  version: z.string(),
  style: ComponentStyleSchema.optional(),
  tags: z.array(z.string()).optional(),
})

export type ComponentListItem = z.infer<typeof ComponentListItemSchema>

// API request/response types
export const ListComponentsRequestSchema = z.object({
  query: z.string().optional(), // Search/filter query
  tags: z.array(z.string()).optional(), // Filter by tags
  package: z.string().optional(), // Filter by package
})

export type ListComponentsRequest = z.infer<typeof ListComponentsRequestSchema>

export const ListComponentsResponseSchema = z.object({
  items: z.array(ComponentListItemSchema),
  total: z.number().optional(),
})

export type ListComponentsResponse = z.infer<typeof ListComponentsResponseSchema>

export const GetComponentRequestSchema = z.object({
  name: z.string(),
  variant: z.string().optional(), // Specific variant to fetch
})

export type GetComponentRequest = z.infer<typeof GetComponentRequestSchema>

export const GetComponentResponseSchema = z.object({
  component: NormalizedComponentSpecSchema,
})

export type GetComponentResponse = z.infer<typeof GetComponentResponseSchema>

// File generation result types
export const GeneratedFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  type: z.enum(['tsx', 'jsx', 'css', 'scss', 'json', 'md']),
})

export type GeneratedFile = z.infer<typeof GeneratedFileSchema>

export const FileGenerationResultSchema = z.object({
  files: z.array(GeneratedFileSchema),
  demoPath: z.string().optional(),
  componentPath: z.string(),
  metadata: z.object({
    name: z.string(),
    variant: z.string().optional(),
    generatedAt: z.string(),
    filesCount: z.number(),
  }),
})

export type FileGenerationResult = z.infer<typeof FileGenerationResultSchema>

// Error types
export const XMCPErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
})

export type XMCPError = z.infer<typeof XMCPErrorSchema>

// XMCP configuration
export const XMCPConfigSchema = z.object({
  baseUrl: z.string().url(),
  authToken: z.string().optional(),
  enabled: z.boolean().default(true),
  timeout: z.number().default(10000), // Request timeout in ms
})

export type XMCPConfig = z.infer<typeof XMCPConfigSchema>

// Utility type guards
export const isValidComponentSpec = (data: unknown): data is NormalizedComponentSpec => {
  return NormalizedComponentSpecSchema.safeParse(data).success
}

export const isValidComponentListItem = (data: unknown): data is ComponentListItem => {
  return ComponentListItemSchema.safeParse(data).success
}

// Constants
export const DEFAULT_XMCP_CONFIG: XMCPConfig = {
  baseUrl: process.env.MCP_BASE_URL || 'http://localhost:3000/api/xmcp',
  authToken: process.env.MCP_AUTH_TOKEN,
  enabled: process.env.MCP_ENABLED !== 'false',
  timeout: 10000,
}

export const SUPPORTED_COMPONENT_LANGUAGES = ['tsx', 'jsx'] as const
export const SUPPORTED_STYLE_TYPES = ['scss', 'css', 'module'] as const
export const SUPPORTED_FILE_TYPES = ['tsx', 'jsx', 'css', 'scss', 'json', 'md', 'svg', 'png', 'jpg'] as const
