/**
 * Optimized Route Classification with Caching
 * Provides fast route classification with intelligent caching
 */

import { RouteClassification } from '@/lib/auth/middleware-helpers'
import { middlewareCache } from './middleware-cache'

// Pre-computed route patterns for performance
const STATIC_PATTERNS = [
  /^\/_next/,
  /^\/favicon/,
  /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|json)$/
]

const API_PATTERNS = {
  auth: /^\/api\/auth\//,
  public: /^\/api\/(health|webhooks)/,
  protected: /^\/api\//
}

const AUTH_ROUTES = /^\/auth\//

const PUBLIC_ROUTES = new Set(['/', '/privacy', '/terms', '/support'])

const SENSITIVE_ROUTES = ['/settings', '/sharing']

/**
 * Fast route classification with caching
 */
export function classifyRoute(pathname: string): RouteClassification {
  // Check cache first
  const cached = middlewareCache.getCachedRouteClassification(pathname)
  if (cached) {
    return cached
  }

  // Perform classification
  const classification = performRouteClassification(pathname)

  // Cache the result
  middlewareCache.setCachedRouteClassification(pathname, classification)

  return classification
}

/**
 * Core route classification logic (without caching)
 */
function performRouteClassification(pathname: string): RouteClassification {
  // Static assets (highest priority for performance)
  for (const pattern of STATIC_PATTERNS) {
    if (pattern.test(pathname)) {
      return {
        isProtected: false,
        isPublic: true,
        isAuth: false,
        isApi: false,
        isStatic: true,
        requiresEmailVerification: false,
        allowsUnverifiedUsers: true,
        securityLevel: 'public'
      }
    }
  }

  // API routes
  if (API_PATTERNS.protected.test(pathname)) {
    const isAuthApi = API_PATTERNS.auth.test(pathname)
    const isPublicApi = API_PATTERNS.public.test(pathname) || isAuthApi

    return {
      isProtected: !isPublicApi,
      isPublic: isPublicApi,
      isAuth: isAuthApi,
      isApi: true,
      isStatic: false,
      requiresEmailVerification: !isPublicApi,
      allowsUnverifiedUsers: isAuthApi,
      securityLevel: isPublicApi ? 'public' : 'protected'
    }
  }

  // Auth routes
  if (AUTH_ROUTES.test(pathname)) {
    return {
      isProtected: false,
      isPublic: true,
      isAuth: true,
      isApi: false,
      isStatic: false,
      requiresEmailVerification: false,
      allowsUnverifiedUsers: true,
      securityLevel: 'public'
    }
  }

  // Public pages
  if (PUBLIC_ROUTES.has(pathname)) {
    return {
      isProtected: false,
      isPublic: true,
      isAuth: false,
      isApi: false,
      isStatic: false,
      requiresEmailVerification: false,
      allowsUnverifiedUsers: true,
      securityLevel: 'public'
    }
  }

  // Check for sensitive routes
  const isSensitive = SENSITIVE_ROUTES.some(route => pathname.startsWith(route))

  // Default to protected
  return {
    isProtected: true,
    isPublic: false,
    isAuth: false,
    isApi: false,
    isStatic: false,
    requiresEmailVerification: true,
    allowsUnverifiedUsers: false,
    securityLevel: isSensitive ? 'sensitive' : 'protected'
  }
}

/**
 * Batch classify multiple routes for warmup
 */
export function batchClassifyRoutes(pathnames: string[]): Map<string, RouteClassification> {
  const results = new Map<string, RouteClassification>()

  for (const pathname of pathnames) {
    results.set(pathname, classifyRoute(pathname))
  }

  return results
}

/**
 * Get route security level quickly
 */
export function getRouteSecurityLevel(pathname: string): 'public' | 'protected' | 'sensitive' {
  // Fast path for common routes
  if (pathname === '/' || pathname.startsWith('/auth/')) {
    return 'public'
  }

  if (pathname.startsWith('/settings') || pathname.startsWith('/sharing')) {
    return 'sensitive'
  }

  // Use full classification for other routes
  const classification = classifyRoute(pathname)
  return classification.securityLevel
}

/**
 * Check if route requires authentication (fast path)
 */
export function isProtectedRoute(pathname: string): boolean {
  // Fast checks for common cases
  if (pathname === '/' ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/_next') ||
      PUBLIC_ROUTES.has(pathname)) {
    return false
  }

  if (pathname.startsWith('/api/')) {
    return !API_PATTERNS.public.test(pathname) && !API_PATTERNS.auth.test(pathname)
  }

  return true
}

/**
 * Check if route allows unverified users (fast path)
 */
export function allowsUnverifiedUsers(pathname: string): boolean {
  const classification = classifyRoute(pathname)
  return classification.allowsUnverifiedUsers
}