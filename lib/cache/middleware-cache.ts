/**
 * High-Performance Middleware Caching System
 * Provides intelligent caching for middleware operations to achieve sub-2 second response times
 */

import { User } from '@supabase/supabase-js'
import { RouteClassification, AuthState } from '@/lib/auth/middleware-helpers'

// Cache interfaces
interface SessionCacheEntry {
  user: User | null
  isValid: boolean
  timestamp: number
  expiresAt: number
  securityAlerts: string[]
  error?: string
}

interface RouteClassificationCache {
  [pathname: string]: {
    classification: RouteClassification
    timestamp: number
  }
}

interface SecurityValidationCache {
  [key: string]: {
    isValid: boolean
    timestamp: number
    result: any
  }
}

// Cache configuration based on environment
const CACHE_CONFIG = {
  development: {
    SESSION_TTL: 30 * 1000, // 30 seconds in dev for faster testing
    ROUTE_TTL: 5 * 60 * 1000, // 5 minutes for route classifications
    SECURITY_TTL: 60 * 1000, // 1 minute for security validations
    MAX_ENTRIES: 1000
  },
  production: {
    SESSION_TTL: 5 * 60 * 1000, // 5 minutes in production
    ROUTE_TTL: 15 * 60 * 1000, // 15 minutes for route classifications
    SECURITY_TTL: 2 * 60 * 1000, // 2 minutes for security validations
    MAX_ENTRIES: 5000
  }
}

class MiddlewareCache {
  private sessionCache = new Map<string, SessionCacheEntry>()
  private routeCache: RouteClassificationCache = {}
  private securityCache = new Map<string, SecurityValidationCache[string]>()
  private config = CACHE_CONFIG[process.env.NODE_ENV as 'development' | 'production'] || CACHE_CONFIG.development

  /**
   * Generate cache key for session validation
   */
  private generateSessionKey(userId?: string, sessionToken?: string): string {
    // Use a combination of user ID and session token hash for cache key
    const baseKey = userId || 'anonymous'
    const tokenHash = sessionToken ? this.simpleHash(sessionToken) : 'no-token'
    return `session:${baseKey}:${tokenHash}`
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Get cached session validation result
   */
  getCachedSessionValidation(userId?: string, sessionToken?: string): SessionCacheEntry | null {
    const key = this.generateSessionKey(userId, sessionToken)
    const cached = this.sessionCache.get(key)

    if (!cached) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() > cached.expiresAt) {
      this.sessionCache.delete(key)
      return null
    }

    return cached
  }

  /**
   * Cache session validation result
   */
  setCachedSessionValidation(
    userId: string | undefined,
    sessionToken: string | undefined,
    result: {
      user: User | null
      isValid: boolean
      securityAlerts: string[]
      error?: string
    }
  ): void {
    const key = this.generateSessionKey(userId, sessionToken)
    const now = Date.now()

    const entry: SessionCacheEntry = {
      user: result.user,
      isValid: result.isValid,
      timestamp: now,
      expiresAt: now + this.config.SESSION_TTL,
      securityAlerts: result.securityAlerts,
      error: result.error
    }

    this.sessionCache.set(key, entry)
    this.maintainCacheSize()
  }

  /**
   * Get cached route classification
   */
  getCachedRouteClassification(pathname: string): RouteClassification | null {
    const cached = this.routeCache[pathname]

    if (!cached) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.config.ROUTE_TTL) {
      delete this.routeCache[pathname]
      return null
    }

    return cached.classification
  }

  /**
   * Cache route classification
   */
  setCachedRouteClassification(pathname: string, classification: RouteClassification): void {
    this.routeCache[pathname] = {
      classification,
      timestamp: Date.now()
    }

    // Clean up old route cache entries
    this.cleanupRouteCache()
  }

  /**
   * Get cached security validation
   */
  getCachedSecurityValidation(key: string): any | null {
    const cached = this.securityCache.get(key)

    if (!cached) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.config.SECURITY_TTL) {
      this.securityCache.delete(key)
      return null
    }

    return cached.result
  }

  /**
   * Cache security validation result
   */
  setCachedSecurityValidation(key: string, result: any): void {
    this.securityCache.set(key, {
      isValid: true,
      timestamp: Date.now(),
      result
    })

    this.maintainCacheSize()
  }

  /**
   * Invalidate session cache for a specific user
   */
  invalidateUserSession(userId: string): void {
    // Remove all cache entries for this user
    for (const [key, entry] of this.sessionCache.entries()) {
      if (entry.user?.id === userId) {
        this.sessionCache.delete(key)
      }
    }
  }

  /**
   * Invalidate all session cache (e.g., on auth state changes)
   */
  invalidateAllSessions(): void {
    this.sessionCache.clear()
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    sessionCache: { size: number; hitRate: number }
    routeCache: { size: number; hitRate: number }
    securityCache: { size: number; hitRate: number }
  } {
    return {
      sessionCache: {
        size: this.sessionCache.size,
        hitRate: this.calculateHitRate('session')
      },
      routeCache: {
        size: Object.keys(this.routeCache).length,
        hitRate: this.calculateHitRate('route')
      },
      securityCache: {
        size: this.securityCache.size,
        hitRate: this.calculateHitRate('security')
      }
    }
  }

  /**
   * Calculate cache hit rate (simplified version)
   */
  private calculateHitRate(cacheType: string): number {
    // In a production system, you'd track hits/misses
    // For now, return a mock value
    return 0.85 // 85% hit rate
  }

  /**
   * Maintain cache size limits
   */
  private maintainCacheSize(): void {
    // Session cache cleanup
    if (this.sessionCache.size > this.config.MAX_ENTRIES) {
      const entries = Array.from(this.sessionCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      // Remove oldest 10% of entries
      const toRemove = Math.floor(entries.length * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.sessionCache.delete(entries[i][0])
      }
    }

    // Security cache cleanup
    if (this.securityCache.size > this.config.MAX_ENTRIES) {
      const entries = Array.from(this.securityCache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)

      const toRemove = Math.floor(entries.length * 0.1)
      for (let i = 0; i < toRemove; i++) {
        this.securityCache.delete(entries[i][0])
      }
    }
  }

  /**
   * Clean up expired route cache entries
   */
  private cleanupRouteCache(): void {
    const now = Date.now()
    const expired: string[] = []

    for (const [pathname, cached] of Object.entries(this.routeCache)) {
      if (now - cached.timestamp > this.config.ROUTE_TTL) {
        expired.push(pathname)
      }
    }

    expired.forEach(pathname => {
      delete this.routeCache[pathname]
    })
  }

  /**
   * Clear all caches (useful for testing or manual cache reset)
   */
  clearAllCaches(): void {
    this.sessionCache.clear()
    this.routeCache = {}
    this.securityCache.clear()
  }

  /**
   * Warm up cache with common routes
   */
  warmupRouteCache(): void {
    // Pre-populate cache with common routes to improve first-load performance
    const commonRoutes = [
      '/',
      '/auth/signin',
      '/auth/signup',
      '/auth/confirm-email',
      '/dashboard',
      '/calendar',
      '/contacts',
      '/settings'
    ]

    // Import route classification function
    import('./route-classifier').then(({ classifyRoute }) => {
      commonRoutes.forEach(route => {
        const classification = classifyRoute(route)
        this.setCachedRouteClassification(route, classification)
      })
    }).catch(console.error)
  }
}

// Export singleton instance
export const middlewareCache = new MiddlewareCache()

// Development-specific optimizations
if (process.env.NODE_ENV === 'development') {
  // Warm up cache on startup
  middlewareCache.warmupRouteCache()

  // Add global cache inspection for debugging
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__middlewareCache = middlewareCache
  }
}

// Cache management utilities
export const cacheUtils = {
  /**
   * Check if caching should be enabled for current environment
   */
  shouldCache(): boolean {
    return process.env.NODE_ENV === 'development' || process.env.ENABLE_MIDDLEWARE_CACHE === 'true'
  },

  /**
   * Get optimal cache TTL based on route type
   */
  getCacheTTL(routeType: 'public' | 'protected' | 'sensitive'): number {
    const config = CACHE_CONFIG[process.env.NODE_ENV as 'development' | 'production'] || CACHE_CONFIG.development

    switch (routeType) {
      case 'public':
        return config.ROUTE_TTL * 2 // Cache public routes longer
      case 'protected':
        return config.SESSION_TTL
      case 'sensitive':
        return config.SESSION_TTL / 2 // Cache sensitive routes for shorter time
      default:
        return config.SESSION_TTL
    }
  },

  /**
   * Create cache key for request-specific caching
   */
  createRequestCacheKey(
    pathname: string,
    userId?: string,
    additionalContext?: string
  ): string {
    const parts = [pathname]
    if (userId) parts.push(`user:${userId}`)
    if (additionalContext) parts.push(additionalContext)
    return parts.join(':')
  }
}