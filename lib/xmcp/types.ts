import { z } from 'zod'

// Base component prop definition
export const ComponentPropSchema = z.object({
  name: z.string(),
  type: z.string(), // TypeScript type as string
  required: z.boolean(),
  default: z.any().optional(),
  description: z.string().optional(),
})

export type ComponentProp = z.infer<typeof ComponentPropSchema>

// Component variant definition
export const ComponentVariantSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  props: z.record(z.any()),
})

export type ComponentVariant = z.infer<typeof ComponentVariantSchema>

// Component asset definition
export const ComponentAssetSchema = z.object({
  path: z.string(),
  contents: z.string(),
  type: z.enum(['scss', 'css', 'json', 'md', 'svg', 'png', 'jpg']).optional(),
})

export type ComponentAsset = z.infer<typeof ComponentAssetSchema>

// Style configuration
export const ComponentStyleSchema = z.object({
  type: z.enum(['scss', 'css', 'module']),
  entry: z.string(),
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
  code: z.string(),
  assets: z.array(ComponentAssetSchema),
  tags: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
})

export type NormalizedComponentSpec = z.infer<typeof NormalizedComponentSpecSchema>

// Component list item
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
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  package: z.string().optional(),
})

export type ListComponentsRequest = z.infer<typeof ListComponentsRequestSchema>

export const ListComponentsResponseSchema = z.object({
  items: z.array(ComponentListItemSchema),
  total: z.number().optional(),
})

export type ListComponentsResponse = z.infer<typeof ListComponentsResponseSchema>

export const GetComponentRequestSchema = z.object({
  name: z.string(),
  variant: z.string().optional(),
})

export type GetComponentRequest = z.infer<typeof GetComponentRequestSchema>

export const GetComponentResponseSchema = z.object({
  component: NormalizedComponentSpecSchema,
})

export type GetComponentResponse = z.infer<typeof GetComponentResponseSchema>

// XMCP Configuration
export const XMCPConfigSchema = z.object({
  baseUrl: z.string(),
  authToken: z.string().optional(),
  timeout: z.number().default(30000),
  enabled: z.boolean().default(true),
})

export type XMCPConfig = z.infer<typeof XMCPConfigSchema>

// Default configuration
export const DEFAULT_XMCP_CONFIG: XMCPConfig = {
  baseUrl: 'http://localhost:3001/v1/xmcp',
  timeout: 30000,
  enabled: true,
}

// Error type
export interface XMCPError {
  code: string
  message: string
  details?: unknown
}