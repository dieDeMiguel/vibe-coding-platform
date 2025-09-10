import {
  type XMCPConfig,
  type ListComponentsRequest,
  type ListComponentsResponse,
  type GetComponentRequest,
  type GetComponentResponse,
  type XMCPError,
  DEFAULT_XMCP_CONFIG,
  ListComponentsRequestSchema,
  ListComponentsResponseSchema,
  GetComponentRequestSchema,
  GetComponentResponseSchema,
} from './types'
import { normalizeComponentList, normalizeComponentSpec } from './normalizer'

/**
 * XMCP Client for interacting with MCP endpoints
 */
export class XMCPClient {
  private config: XMCPConfig

  constructor(config: Partial<XMCPConfig> = {}) {
    this.config = { ...DEFAULT_XMCP_CONFIG, ...config }
  }

  /**
   * Updates the client configuration
   */
  updateConfig(config: Partial<XMCPConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Gets the current configuration
   */
  getConfig(): XMCPConfig {
    return { ...this.config }
  }

  /**
   * Makes an authenticated request to the MCP server
   */
  private async makeRequest<T>(
    endpoint: string,
    data: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.config.enabled) {
      throw new XMCPClientError('DISABLED', 'XMCP client is disabled')
    }

    const url = `${this.config.baseUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    }

    // Add authentication if token is provided
    if (this.config.authToken) {
      headers.Authorization = `Bearer ${this.config.authToken}`
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
        ...options,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorData = await response.json() as { error?: string }
          if (errorData.error) {
            errorMessage = errorData.error
          }
        } catch {
          // Ignore JSON parsing errors for error responses
        }

        throw new XMCPClientError(
          response.status === 404 ? 'NOT_FOUND' : 'REQUEST_FAILED',
          errorMessage,
          { status: response.status, statusText: response.statusText }
        )
      }

      const result = await response.json()
      return result as T
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof XMCPClientError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new XMCPClientError('TIMEOUT', `Request timeout after ${this.config.timeout}ms`)
        }
        
        throw new XMCPClientError('NETWORK_ERROR', error.message, { originalError: error })
      }
      
      throw new XMCPClientError('UNKNOWN_ERROR', 'An unknown error occurred', { error })
    }
  }

  /**
   * Lists available components from the MCP server
   */
  async listComponents(request: ListComponentsRequest = {}): Promise<ListComponentsResponse> {
    // Validate request
    const validatedRequest = ListComponentsRequestSchema.parse(request)
    
    try {
      const response = await this.makeRequest<unknown>(
        'tools/list_components',
        validatedRequest
      )
      
      // Validate and normalize response
      const parsed = ListComponentsResponseSchema.safeParse(response)
      if (!parsed.success) {
        // Try to normalize the response if it doesn't match expected schema
        const rawResponse = response as Record<string, unknown>
        
        if (Array.isArray(rawResponse)) {
          // Handle direct array response
          return {
            items: normalizeComponentList(rawResponse),
            total: rawResponse.length,
          }
        }
        
        if (rawResponse.components || rawResponse.items) {
          // Handle wrapped array response
          const items = rawResponse.components || rawResponse.items
          const itemsArray = Array.isArray(items) ? items : []
          return {
            items: normalizeComponentList(itemsArray),
            total: itemsArray.length,
          }
        }
        
        throw new XMCPClientError(
          'INVALID_RESPONSE',
          `Invalid response format: ${parsed.error.message}`,
          { response, validationError: parsed.error }
        )
      }
      
      return parsed.data
    } catch (error) {
      if (error instanceof XMCPClientError) {
        throw error
      }
      
      throw new XMCPClientError(
        'REQUEST_FAILED',
        `Failed to list components: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      )
    }
  }

  /**
   * Gets a specific component from the MCP server
   */
  async getComponent(request: GetComponentRequest): Promise<GetComponentResponse> {
    // Validate request
    const validatedRequest = GetComponentRequestSchema.parse(request)
    
    try {
      const response = await this.makeRequest<unknown>(
        'tools/get_component',
        validatedRequest
      )
      
      // Validate and normalize response
      const parsed = GetComponentResponseSchema.safeParse(response)
      if (!parsed.success) {
        // Try to normalize the response if it doesn't match expected schema
        const rawResponse = response as Record<string, unknown>
        
        if (rawResponse.component || rawResponse.data) {
          // Handle wrapped component response
          const componentData = rawResponse.component || rawResponse.data
          return {
            component: normalizeComponentSpec(componentData),
          }
        }
        
        if (rawResponse.name) {
          // Handle direct component response
          return {
            component: normalizeComponentSpec(rawResponse),
          }
        }
        
        throw new XMCPClientError(
          'INVALID_RESPONSE',
          `Invalid response format: ${parsed.error.message}`,
          { response, validationError: parsed.error }
        )
      }
      
      return parsed.data
    } catch (error) {
      if (error instanceof XMCPClientError) {
        throw error
      }
      
      throw new XMCPClientError(
        'REQUEST_FAILED',
        `Failed to get component: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      )
    }
  }

  /**
   * Tests the connection to the MCP server
   */
  async testConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = Date.now()
    
    try {
      await this.listComponents({ query: '__test__' })
      const latency = Date.now() - startTime
      
      return {
        success: true,
        message: 'Connection successful',
        latency,
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof XMCPClientError ? error.message : 'Connection failed',
      }
    }
  }

  /**
   * Gets health status of the MCP server
   */
  async getHealth(): Promise<{ status: 'healthy' | 'unhealthy'; details?: unknown }> {
    try {
      const result = await this.testConnection()
      return {
        status: result.success ? 'healthy' : 'unhealthy',
        details: result,
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      }
    }
  }
}

/**
 * Custom error class for XMCP client errors
 */
export class XMCPClientError extends Error implements XMCPError {
  public readonly code: string
  public readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'XMCPClientError'
    this.code = code
    this.details = details
  }

  toJSON(): XMCPError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * Creates a default XMCP client instance
 */
export function createXMCPClient(config?: Partial<XMCPConfig>): XMCPClient {
  return new XMCPClient(config)
}

/**
 * Singleton XMCP client instance
 */
let defaultClient: XMCPClient | null = null

/**
 * Gets the default XMCP client instance
 */
export function getXMCPClient(): XMCPClient {
  if (!defaultClient) {
    defaultClient = createXMCPClient()
  }
  return defaultClient
}

/**
 * Updates the default XMCP client configuration
 */
export function updateXMCPConfig(config: Partial<XMCPConfig>): void {
  if (!defaultClient) {
    defaultClient = createXMCPClient(config)
  } else {
    defaultClient.updateConfig(config)
  }
}

/**
 * Utility function to safely handle XMCP operations with error handling
 */
export async function withXMCPErrorHandling<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    console.error('XMCP operation failed:', error)
    
    if (fallback !== undefined) {
      return fallback
    }
    
    return null
  }
}
