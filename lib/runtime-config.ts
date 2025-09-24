/**
 * Centralized Runtime Configuration System
 * Provides security profiles and performance optimizations for different environments
 * 
 * Security Profiles:
 * - production: Full enterprise-grade security (current behavior preserved)
 * - staging: Production security with enhanced diagnostics
 * - development: Lightweight security for fast development
 * - demo: Local/offline demo mode
 */

import { isBuildTime } from './runtime-flags'
import { validateCriticalEnvironment, getEnvironmentInfo } from './env-validation'

export type SecurityProfile = 'production' | 'staging' | 'development' | 'demo'
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'
export type CsrfMode = 'strict' | 'relaxed' | 'disabled'

/**
 * Rate limiting configuration per security profile
 */
export interface RateLimitConfig {
  auth: { windowMs: number; max: number }
  api: { windowMs: number; max: number }
  events: { windowMs: number; max: number }
  uploads: { windowMs: number; max: number }
}

/**
 * Session configuration per security profile
 */
export interface SessionConfig {
  ttlSeconds: number
  cacheTtlSeconds: number
  strictValidation: boolean
  requireDeviceFingerprinting: boolean
  maxConcurrentSessions: number
}

/**
 * Security feature toggles per profile
 */
export interface SecurityFeatures {
  enableDeviceFingerprinting: boolean
  enableGeoAnomalyChecks: boolean
  enableCaptcha: boolean
  enableDetailedAuditLogging: boolean
  enableBotDetection: boolean
  enableAdvancedThreatDetection: boolean
  enableSessionReplay: boolean
  enableRealTimeAlerts: boolean
}

/**
 * Performance optimization flags
 */
export interface PerformanceConfig {
  enableMiddlewareCache: boolean
  enableAggressiveCaching: boolean
  minimalLogging: boolean
  skipSecurityHeaders: boolean
  batchSecurityChecks: boolean
  useOptimizedValidation: boolean
  cacheValidationResults: boolean
}

/**
 * Complete runtime configuration
 */
export interface RuntimeConfig {
  profile: SecurityProfile
  environment: {
    nodeEnv: string
    isProd: boolean
    isStaging: boolean
    isDev: boolean
    isDemo: boolean
    isBuild: boolean
  }
  security: {
    csrfMode: CsrfMode
    rateLimits: RateLimitConfig
    session: SessionConfig
    features: SecurityFeatures
  }
  performance: PerformanceConfig
  logging: {
    level: LogLevel
    enableStructuredLogging: boolean
    enablePerformanceMetrics: boolean
    enableSecurityMetrics: boolean
  }
}

/**
 * Determine security profile from environment
 */
function determineSecurityProfile(): SecurityProfile {
  const explicitProfile = process.env.SECURITY_PROFILE as SecurityProfile | undefined
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  // Explicit profile takes precedence
  if (explicitProfile && ['production', 'staging', 'development', 'demo'].includes(explicitProfile)) {
    return explicitProfile
  }
  
  // Demo mode detection
  if (process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return 'demo'
  }
  
  // Environment-based defaults
  switch (nodeEnv) {
    case 'production':
      return 'production'
    case 'test':
      return 'development' // Use development profile for tests
    default:
      // Check for staging indicators
      if (process.env.VERCEL_ENV === 'preview' || process.env.STAGING === 'true') {
        return 'staging'
      }
      return 'development'
  }
}

/**
 * Get rate limiting configuration for profile
 */
function getRateLimitConfig(profile: SecurityProfile): RateLimitConfig {
  switch (profile) {
    case 'production':
      return {
        auth: { windowMs: 15 * 60 * 1000, max: 5 },     // 5 attempts per 15 min
        api: { windowMs: 60 * 1000, max: 100 },         // 100 requests per minute
        events: { windowMs: 60 * 1000, max: 30 },       // 30 events per minute
        uploads: { windowMs: 60 * 1000, max: 10 }       // 10 uploads per minute
      }
    case 'staging':
      return {
        auth: { windowMs: 10 * 60 * 1000, max: 10 },    // More lenient for testing
        api: { windowMs: 60 * 1000, max: 200 },
        events: { windowMs: 60 * 1000, max: 50 },
        uploads: { windowMs: 60 * 1000, max: 20 }
      }
    case 'development':
      return {
        auth: { windowMs: 5 * 60 * 1000, max: 20 },     // Very lenient for dev
        api: { windowMs: 60 * 1000, max: 500 },
        events: { windowMs: 60 * 1000, max: 200 },
        uploads: { windowMs: 60 * 1000, max: 50 }
      }
    case 'demo':
      return {
        auth: { windowMs: 60 * 1000, max: 100 },        // Very permissive for demo
        api: { windowMs: 60 * 1000, max: 1000 },
        events: { windowMs: 60 * 1000, max: 500 },
        uploads: { windowMs: 60 * 1000, max: 100 }
      }
  }
}

/**
 * Get session configuration for profile
 */
function getSessionConfig(profile: SecurityProfile): SessionConfig {
  switch (profile) {
    case 'production':
      return {
        ttlSeconds: 60 * 60,                 // 1 hour session
        cacheTtlSeconds: 5,                  // 5 second cache
        strictValidation: true,
        requireDeviceFingerprinting: true,
        maxConcurrentSessions: 3
      }
    case 'staging':
      return {
        ttlSeconds: 2 * 60 * 60,             // 2 hour session
        cacheTtlSeconds: 10,                 // 10 second cache
        strictValidation: true,
        requireDeviceFingerprinting: false,  // Disabled for easier testing
        maxConcurrentSessions: 5
      }
    case 'development':
      return {
        ttlSeconds: 4 * 60 * 60,             // 4 hour session
        cacheTtlSeconds: 60,                 // 1 minute cache for performance
        strictValidation: false,             // More permissive validation
        requireDeviceFingerprinting: false,
        maxConcurrentSessions: 10
      }
    case 'demo':
      return {
        ttlSeconds: 24 * 60 * 60,            // 24 hour session
        cacheTtlSeconds: 300,                // 5 minute cache
        strictValidation: false,
        requireDeviceFingerprinting: false,
        maxConcurrentSessions: 50
      }
  }
}

/**
 * Get security features configuration for profile
 */
function getSecurityFeatures(profile: SecurityProfile): SecurityFeatures {
  switch (profile) {
    case 'production':
      return {
        enableDeviceFingerprinting: true,
        enableGeoAnomalyChecks: true,
        enableCaptcha: true,
        enableDetailedAuditLogging: true,
        enableBotDetection: true,
        enableAdvancedThreatDetection: true,
        enableSessionReplay: true,
        enableRealTimeAlerts: true
      }
    case 'staging':
      return {
        enableDeviceFingerprinting: false,   // Easier testing
        enableGeoAnomalyChecks: false,
        enableCaptcha: false,
        enableDetailedAuditLogging: true,    // Keep logging for debugging
        enableBotDetection: true,
        enableAdvancedThreatDetection: false,
        enableSessionReplay: false,
        enableRealTimeAlerts: true
      }
    case 'development':
      return {
        enableDeviceFingerprinting: false,   // All heavy features disabled
        enableGeoAnomalyChecks: false,
        enableCaptcha: false,
        enableDetailedAuditLogging: false,   // Minimal logging
        enableBotDetection: false,
        enableAdvancedThreatDetection: false,
        enableSessionReplay: false,
        enableRealTimeAlerts: false
      }
    case 'demo':
      return {
        enableDeviceFingerprinting: false,   // All features disabled for demo
        enableGeoAnomalyChecks: false,
        enableCaptcha: false,
        enableDetailedAuditLogging: false,
        enableBotDetection: false,
        enableAdvancedThreatDetection: false,
        enableSessionReplay: false,
        enableRealTimeAlerts: false
      }
  }
}

/**
 * Get performance configuration for profile
 */
function getPerformanceConfig(profile: SecurityProfile): PerformanceConfig {
  const isDev = profile === 'development'
  const isDemo = profile === 'demo'
  
  return {
    enableMiddlewareCache: isDev || isDemo,
    enableAggressiveCaching: isDev || isDemo,
    minimalLogging: isDev && process.env.MINIMAL_MIDDLEWARE_LOGS === 'true',
    skipSecurityHeaders: isDev && process.env.SKIP_DEV_SECURITY_HEADERS === 'true',
    batchSecurityChecks: isDev || isDemo,
    useOptimizedValidation: isDev || isDemo,
    cacheValidationResults: true // Always enabled for performance
  }
}

/**
 * Get CSRF mode for profile
 */
function getCsrfMode(profile: SecurityProfile): CsrfMode {
  switch (profile) {
    case 'production':
      return 'strict'
    case 'staging':
      return 'strict'
    case 'development':
      return process.env.CSRF_MODE as CsrfMode || 'relaxed'
    case 'demo':
      return 'disabled'
  }
}

/**
 * Get logging configuration for profile
 */
function getLoggingConfig(profile: SecurityProfile): RuntimeConfig['logging'] {
  switch (profile) {
    case 'production':
      return {
        level: 'warn',
        enableStructuredLogging: true,
        enablePerformanceMetrics: true,
        enableSecurityMetrics: true
      }
    case 'staging':
      return {
        level: 'info',
        enableStructuredLogging: true,
        enablePerformanceMetrics: true,
        enableSecurityMetrics: true
      }
    case 'development':
      return {
        level: process.env.LOG_LEVEL as LogLevel || 'debug',
        enableStructuredLogging: false,
        enablePerformanceMetrics: true,
        enableSecurityMetrics: false
      }
    case 'demo':
      return {
        level: 'error',
        enableStructuredLogging: false,
        enablePerformanceMetrics: false,
        enableSecurityMetrics: false
      }
  }
}

/**
 * Build complete runtime configuration
 */
function buildRuntimeConfig(): RuntimeConfig {
  // Validate critical environment variables early
  if (!isBuildTime()) {
    try {
      validateCriticalEnvironment()
    } catch (error) {
      console.error('[RUNTIME-CONFIG] Environment validation failed:', error)
      // In development, log but don't crash; in production, crash
      if (process.env.NODE_ENV === 'production') {
        throw error
      }
    }
  }

  const profile = determineSecurityProfile()
  const nodeEnv = process.env.NODE_ENV || 'development'
  
  return {
    profile,
    environment: {
      nodeEnv,
      isProd: profile === 'production',
      isStaging: profile === 'staging',
      isDev: profile === 'development',
      isDemo: profile === 'demo',
      isBuild: isBuildTime()
    },
    security: {
      csrfMode: getCsrfMode(profile),
      rateLimits: getRateLimitConfig(profile),
      session: getSessionConfig(profile),
      features: getSecurityFeatures(profile)
    },
    performance: getPerformanceConfig(profile),
    logging: getLoggingConfig(profile)
  }
}

// Create and cache the runtime configuration
let _runtimeConfig: RuntimeConfig | null = null

/**
 * Get the current runtime configuration (singleton)
 */
export function getRuntimeConfig(): RuntimeConfig {
  if (!_runtimeConfig) {
    _runtimeConfig = buildRuntimeConfig()
    
    // Log configuration in development
    if (_runtimeConfig.environment.isDev && !_runtimeConfig.performance.minimalLogging) {
      console.log('[RUNTIME-CONFIG] Initialized with profile:', _runtimeConfig.profile)
      console.log('[RUNTIME-CONFIG] Environment info:', getEnvironmentInfo())
      console.log('[RUNTIME-CONFIG] Performance optimizations:', {
        caching: _runtimeConfig.performance.enableMiddlewareCache,
        minimalLogging: _runtimeConfig.performance.minimalLogging,
        optimizedValidation: _runtimeConfig.performance.useOptimizedValidation
      })
    }
  }
  
  return _runtimeConfig
}

/**
 * Reset runtime configuration (for testing)
 */
export function resetRuntimeConfig(): void {
  _runtimeConfig = null
}

/**
 * Check if current environment is production-like
 */
export function isProductionLike(): boolean {
  const config = getRuntimeConfig()
  return config.profile === 'production' || config.profile === 'staging'
}

/**
 * Check if current environment supports performance optimizations
 */
export function supportsOptimizations(): boolean {
  const config = getRuntimeConfig()
  return config.performance.enableMiddlewareCache || config.performance.enableAggressiveCaching
}

/**
 * Get environment-specific configuration value
 * @param key - Configuration key path (e.g., 'security.features.enableCaptcha')
 * @param fallback - Fallback value if key not found
 */
export function getConfigValue<T>(key: string, fallback: T): T {
  const config = getRuntimeConfig()
  const keys = key.split('.')
  
  let value: any = config
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      return fallback
    }
  }
  
  return value !== undefined ? value : fallback
}

/**
 * Export the default runtime configuration instance
 */
export const runtimeConfig = getRuntimeConfig()

// Legacy compatibility exports
export const {
  profile,
  environment: {
    isProd,
    isDev,
    isStaging,
    isDemo,
    nodeEnv
  },
  security: {
    csrfMode,
    rateLimits,
    session: sessionConfig,
    features: securityFeatures
  },
  performance: performanceConfig,
  logging: loggingConfig
} = getRuntimeConfig()