import type { XMCPConfig } from './types'

/**
 * XMCP configuration management utilities
 */

/**
 * Environment-based configuration loader
 */
export function loadXMCPConfigFromEnv(): Partial<XMCPConfig> {
  return {
    baseUrl: process.env.MCP_BASE_URL || process.env.NEXT_PUBLIC_MCP_BASE_URL,
    authToken: process.env.MCP_AUTH_TOKEN,
    enabled: process.env.MCP_ENABLED !== 'false',
    timeout: process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT, 10) : undefined,
  }
}

/**
 * Validates XMCP configuration
 */
export function validateXMCPConfig(config: Partial<XMCPConfig>): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // Validate base URL
  if (!config.baseUrl) {
    errors.push('Base URL is required')
  } else {
    try {
      new URL(config.baseUrl)
    } catch {
      errors.push('Base URL must be a valid URL')
    }
  }

  // Validate timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      errors.push('Timeout must be a positive number')
    } else if (config.timeout < 1000) {
      warnings.push('Timeout is very low (< 1 second), this may cause issues')
    } else if (config.timeout > 60000) {
      warnings.push('Timeout is very high (> 1 minute), this may cause poor UX')
    }
  }

  // Check auth token format (basic validation)
  if (config.authToken && config.authToken.length < 10) {
    warnings.push('Auth token seems unusually short')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Creates a development-friendly configuration
 */
export function createDevelopmentConfig(): XMCPConfig {
  return {
    baseUrl: 'http://localhost:3000/api/xmcp',
    enabled: true,
    timeout: 10000,
    // No auth token for development
  }
}

/**
 * Creates a production-ready configuration
 */
export function createProductionConfig(
  baseUrl: string,
  authToken?: string
): XMCPConfig {
  return {
    baseUrl,
    authToken,
    enabled: true,
    timeout: 15000, // Slightly higher timeout for production
  }
}

/**
 * Merges multiple configuration sources with precedence
 */
export function mergeXMCPConfigs(
  ...configs: Partial<XMCPConfig>[]
): XMCPConfig {
  const merged = configs.reduce((acc, config) => {
    return Object.assign(acc, config)
  }, {} as Partial<XMCPConfig>)
  
  // Ensure required fields have defaults
  return {
    baseUrl: merged.baseUrl || 'http://localhost:3000/api/xmcp',
    enabled: merged.enabled ?? true,
    timeout: merged.timeout ?? 10000,
    authToken: merged.authToken,
  }
}

/**
 * Configuration presets for common scenarios
 */
export const XMCP_CONFIG_PRESETS = {
  development: createDevelopmentConfig(),
  
  staging: {
    baseUrl: process.env.MCP_STAGING_URL || 'https://staging-mcp.example.com',
    authToken: process.env.MCP_STAGING_TOKEN,
    enabled: true,
    timeout: 12000,
  } as XMCPConfig,
  
  production: {
    baseUrl: process.env.MCP_PRODUCTION_URL || 'https://mcp.example.com',
    authToken: process.env.MCP_PRODUCTION_TOKEN,
    enabled: true,
    timeout: 15000,
  } as XMCPConfig,
} as const

/**
 * Gets configuration for current environment
 */
export function getEnvironmentConfig(): XMCPConfig {
  const env = process.env.NODE_ENV || 'development'
  const envConfig = loadXMCPConfigFromEnv()
  
  if (env === 'production') {
    return mergeXMCPConfigs(XMCP_CONFIG_PRESETS.production, envConfig)
  } else if (env === 'test') {
    return mergeXMCPConfigs(XMCP_CONFIG_PRESETS.staging, envConfig)
  } else {
    return mergeXMCPConfigs(XMCP_CONFIG_PRESETS.development, envConfig)
  }
}
