/**
 * High-Performance Middleware Optimizations
 * Development-optimized authentication and validation with production security
 */

import { NextRequest } from 'next/server'
import { User, AuthError } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { middlewareCache, cacheUtils } from '@/lib/cache/middleware-cache'
import { classifyRoute, isProtectedRoute } from '@/lib/cache/route-classifier'
import { AuthState, RouteClassification, SecurityPolicy } from './middleware-helpers'

// Development optimization flags
const DEV_OPTIMIZATIONS = {
  SKIP_TOKEN_VALIDATION: process.env.NODE_ENV === 'development',
  SKIP_PATTERN_DETECTION: process.env.NODE_ENV === 'development',
  MINIMAL_LOGGING: process.env.NODE_ENV === 'development' && process.env.MINIMAL_MIDDLEWARE_LOGS === 'true',
  CACHE_AGGRESSIVE: process.env.NODE_ENV === 'development',
  SKIP_SECURITY_HEADERS: process.env.NODE_ENV === 'development' && process.env.SKIP_DEV_SECURITY_HEADERS === 'true'
}

// Performance metrics
interface PerformanceMetrics {
  startTime: number
  authTime?: number
  classificationTime?: number
  validationTime?: number
  totalTime?: number
  cacheHit: boolean
}

/**
 * High-performance session validation with intelligent caching
 */
export async function validateSessionFast(
  request: NextRequest,
  metrics: PerformanceMetrics
): Promise<{
  isValid: boolean
  user: User | null
  error: string | null
  securityAlerts: string[]
  shouldTerminate: boolean
  fromCache: boolean
}> {
  const authStart = performance.now()

  // Extract session information for cache key
  const sessionToken = request.cookies.get('supabase-auth-token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined

  // Try cache first if enabled
  if (cacheUtils.shouldCache()) {
    const cached = middlewareCache.getCachedSessionValidation(undefined, sessionToken || bearerToken)
    if (cached) {
      metrics.authTime = performance.now() - authStart
      metrics.cacheHit = true

      // Quick validation of cached data
      if (cached.isValid && cached.user) {
        if (DEV_OPTIMIZATIONS.MINIMAL_LOGGING) {
          console.log(`[MIDDLEWARE-FAST] Cache hit for user: ${cached.user.email}`)
        }

        return {
          isValid: cached.isValid,
          user: cached.user,
          error: cached.error || null,
          securityAlerts: cached.securityAlerts,
          shouldTerminate: false,
          fromCache: true
        }
      }
    }
  }

  metrics.cacheHit = false

  // Perform actual validation
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {}, // No-op for read-only validation
          remove() {} // No-op for read-only validation
        },
      }
    )

    // Skip expensive token validation in development
    let tokenValidationAlerts: string[] = []
    if (!DEV_OPTIMIZATIONS.SKIP_TOKEN_VALIDATION && bearerToken) {
      try {
        // Simplified token validation for development
        const { validateToken } = await import('./enhanced-token-validation')
        const tokenResult = await validateToken(bearerToken, {
          validateSignature: false, // Skip in dev
          checkReplayAttacks: false, // Skip in dev
          validateIssuer: false,
          validateAudience: false,
          context: {
            maxAge: 24 * 60 * 60,
            allowedAlgorithms: ['HS256']
          }
        })

        if (!tokenResult.isValid && process.env.NODE_ENV === 'production') {
          tokenValidationAlerts.push('token_validation_failed')
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'production') {
          tokenValidationAlerts.push('token_validation_error')
        }
      }
    }

    // Get user session
    const { data: { user }, error } = await supabase.auth.getUser()

    metrics.authTime = performance.now() - authStart

    if (error) {
      const result = {
        isValid: false,
        user: null,
        error: error.message,
        securityAlerts: ['session_validation_error'],
        shouldTerminate: true,
        fromCache: false
      }

      // Cache negative results for shorter time in development
      if (cacheUtils.shouldCache()) {
        middlewareCache.setCachedSessionValidation(undefined, sessionToken || bearerToken, {
          user: null,
          isValid: false,
          securityAlerts: result.securityAlerts,
          error: result.error
        })
      }

      return result
    }

    if (!user) {
      return {
        isValid: false,
        user: null,
        error: 'No user session',
        securityAlerts: [],
        shouldTerminate: false,
        fromCache: false
      }
    }

    // Minimal security checks in development
    let securityAlerts = [...tokenValidationAlerts]

    if (process.env.NODE_ENV === 'production') {
      // Full security validation only in production
      if (!user.id || !user.email) {
        securityAlerts.push('incomplete_user_data')
      }

      const userAgent = request.headers.get('user-agent') || ''
      if (userAgent.toLowerCase().includes('bot')) {
        securityAlerts.push('suspicious_user_agent')
      }

      if (!sessionToken) {
        securityAlerts.push('missing_session_cookie')
      }
    }

    const result = {
      isValid: true,
      user,
      error: null,
      securityAlerts,
      shouldTerminate: false,
      fromCache: false
    }

    // Cache successful validation
    if (cacheUtils.shouldCache()) {
      middlewareCache.setCachedSessionValidation(user.id, sessionToken || bearerToken, {
        user,
        isValid: true,
        securityAlerts,
        error: undefined
      })
    }

    return result

  } catch (error: any) {
    metrics.authTime = performance.now() - authStart

    return {
      isValid: false,
      user: null,
      error: error.message || 'Session validation failed',
      securityAlerts: ['validation_exception'],
      shouldTerminate: process.env.NODE_ENV === 'production', // More forgiving in dev
      fromCache: false
    }
  }
}

/**
 * Fast auth state analysis with caching
 */
export function analyzeAuthStateFast(user: User | null, error: AuthError | null): AuthState {
  // Simple cache for auth state analysis
  const cacheKey = `auth_state:${user?.id || 'null'}:${user?.email_confirmed_at || 'unconfirmed'}`

  if (cacheUtils.shouldCache()) {
    const cached = middlewareCache.getCachedSecurityValidation(cacheKey)
    if (cached) {
      return cached
    }
  }

  // Perform analysis
  const hasUser = !!user
  const hasError = !!error
  const emailConfirmed = user?.email_confirmed_at

  const isAuthenticated = hasUser && !!emailConfirmed
  const isEmailVerified = hasUser && !!emailConfirmed
  const isUnverifiedUser = hasUser && !emailConfirmed
  const isCompletelyUnauthenticated = !hasUser && (!hasError || error.code !== 'email_not_confirmed')

  const hasEmailNotConfirmedError = hasError && error.code === 'email_not_confirmed'

  const shouldRedirectToConfirmEmail = isUnverifiedUser || hasEmailNotConfirmedError
  const shouldRedirectToSignIn = isCompletelyUnauthenticated

  const authState: AuthState = {
    user,
    error,
    isAuthenticated,
    isEmailVerified,
    isUnverifiedUser,
    isCompletelyUnauthenticated,
    shouldRedirectToConfirmEmail,
    shouldRedirectToSignIn
  }

  // Cache the result
  if (cacheUtils.shouldCache()) {
    middlewareCache.setCachedSecurityValidation(cacheKey, authState)
  }

  return authState
}

/**
 * Fast security policy enforcement with development optimizations
 */
export function enforceSecurityPolicyFast(
  classification: RouteClassification,
  authState: AuthState,
  pathname: string
): SecurityPolicy {
  // Development bypass for faster iteration
  if (DEV_OPTIMIZATIONS.CACHE_AGGRESSIVE && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
    // Still respect route types but be more permissive
    if (classification.isPublic || classification.isAuth) {
      return {
        allowAccess: true,
        reason: 'Public route access allowed (dev mode)',
        securityLevel: 'allow'
      }
    }

    // Allow protected routes in dev mode with warning
    if (classification.isProtected && process.env.NODE_ENV === 'development') {
      if (!DEV_OPTIMIZATIONS.MINIMAL_LOGGING) {
        console.warn(`[MIDDLEWARE-DEV] Allowing protected route in dev mode: ${pathname}`)
      }
      return {
        allowAccess: true,
        reason: 'Protected route allowed in development mode',
        securityLevel: 'allow'
      }
    }
  }

  // Standard security policy (same as original but cached)
  const cacheKey = `security_policy:${classification.securityLevel}:${authState.isAuthenticated}:${authState.isEmailVerified}`

  if (cacheUtils.shouldCache()) {
    const cached = middlewareCache.getCachedSecurityValidation(cacheKey)
    if (cached) {
      // Adjust redirect URL for current pathname
      if (cached.redirectTo && cached.redirectTo.includes('next=')) {
        cached.redirectTo = cached.redirectTo.replace(/next=[^&]*/, `next=${encodeURIComponent(pathname)}`)
      }
      return cached
    }
  }

  // Policy determination (original logic)
  let policy: SecurityPolicy

  if (classification.isPublic) {
    policy = {
      allowAccess: true,
      reason: 'Public route access allowed',
      securityLevel: 'allow'
    }
  } else if (classification.isProtected && authState.shouldRedirectToSignIn) {
    policy = {
      allowAccess: false,
      redirectTo: `/auth/signin?next=${encodeURIComponent(pathname)}`,
      reason: 'Authentication required for protected route',
      securityLevel: 'redirect'
    }
  } else if (classification.isProtected && authState.shouldRedirectToConfirmEmail) {
    if (classification.allowsUnverifiedUsers) {
      policy = {
        allowAccess: true,
        reason: 'Unverified user allowed on this route',
        securityLevel: 'allow'
      }
    } else {
      policy = {
        allowAccess: false,
        redirectTo: '/auth/confirm-email',
        reason: 'Email verification required for this route',
        securityLevel: 'redirect'
      }
    }
  } else if (classification.securityLevel === 'sensitive' && !authState.isEmailVerified) {
    policy = {
      allowAccess: false,
      redirectTo: '/auth/confirm-email',
      reason: 'Full verification required for sensitive route',
      securityLevel: 'redirect'
    }
  } else if (authState.isAuthenticated) {
    policy = {
      allowAccess: true,
      reason: 'Authenticated user access granted',
      securityLevel: 'allow'
    }
  } else {
    policy = {
      allowAccess: false,
      redirectTo: '/auth/signin',
      reason: 'Access denied - default security policy',
      securityLevel: 'block'
    }
  }

  // Cache the policy template (without pathname-specific redirects)
  if (cacheUtils.shouldCache() && !policy.redirectTo?.includes(pathname)) {
    middlewareCache.setCachedSecurityValidation(cacheKey, policy)
  }

  return policy
}

/**
 * Performance-optimized logging for development
 */
export function logMiddlewarePerformance(
  debugId: string,
  pathname: string,
  metrics: PerformanceMetrics,
  authState?: AuthState
): void {
  metrics.totalTime = performance.now() - metrics.startTime

  if (DEV_OPTIMIZATIONS.MINIMAL_LOGGING) {
    // Minimal logging for development
    if (metrics.totalTime > 100) { // Only log if slow
      console.log(`[MIDDLEWARE-PERF] ${pathname}: ${metrics.totalTime.toFixed(1)}ms${metrics.cacheHit ? ' (cached)' : ''}`)
    }
    return
  }

  // Detailed logging
  const logData = {
    pathname,
    totalTime: `${metrics.totalTime.toFixed(1)}ms`,
    authTime: metrics.authTime ? `${metrics.authTime.toFixed(1)}ms` : 'N/A',
    classificationTime: metrics.classificationTime ? `${metrics.classificationTime.toFixed(1)}ms` : 'N/A',
    validationTime: metrics.validationTime ? `${metrics.validationTime.toFixed(1)}ms` : 'N/A',
    cacheHit: metrics.cacheHit,
    isAuthenticated: authState?.isAuthenticated || false
  }

  if (metrics.totalTime > 200) {
    console.warn(`[MIDDLEWARE-SLOW-${debugId}] Slow middleware execution:`, logData)
  } else if (!DEV_OPTIMIZATIONS.MINIMAL_LOGGING) {
    console.log(`[MIDDLEWARE-PERF-${debugId}] Performance metrics:`, logData)
  }
}

/**
 * Development-optimized request ID generation
 */
export function generateRequestIdFast(): string {
  if (DEV_OPTIMIZATIONS.MINIMAL_LOGGING) {
    // Simple counter for development
    return Math.random().toString(36).substr(2, 4)
  }

  // Full ID for production
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Check if development optimizations are enabled
 */
export function shouldUseDevelopmentOptimizations(): boolean {
  return process.env.NODE_ENV === 'development' &&
         (process.env.ENABLE_MIDDLEWARE_OPTIMIZATIONS === 'true' ||
          process.env.ENABLE_MIDDLEWARE_OPTIMIZATIONS !== 'false')
}

/**
 * Get current performance configuration
 */
export function getPerformanceConfig() {
  return {
    environment: process.env.NODE_ENV,
    optimizations: DEV_OPTIMIZATIONS,
    caching: cacheUtils.shouldCache(),
    cacheStats: middlewareCache.getCacheStats()
  }
}