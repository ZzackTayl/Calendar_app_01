import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { runtimeConfig, getRuntimeConfig, isProductionLike } from '@/lib/runtime-config'
import {
  generateRequestId,
  extractMiddlewareAuthInfo,
  generateAuthDiagnosticReport
} from '@/lib/debug/auth-debug'
import {
  analyzeAuthState,
  logAuthState,
  isProtectedRoute,
  isAuthRoute,
  isUnverifiedUserAllowedRoute,
  classifyRoute,
  validateMiddlewareSession,
  enforceSecurityPolicy,
  type RouteClassification,
  type SecurityPolicy
} from '@/lib/auth/middleware-helpers'
import {
  logAuthBypassAttempt,
  logUnauthorizedAccess,
  logMiddlewareAction
} from '@/lib/security/event-logger'
import {
  getProductionSecurityConfig,
  applySecurityHeaders
} from '@/lib/security/production-config'

// PERFORMANCE OPTIMIZATION IMPORTS
import {
  validateSessionFast,
  analyzeAuthStateFast,
  enforceSecurityPolicyFast,
  logMiddlewarePerformance,
  generateRequestIdFast,
  shouldUseDevelopmentOptimizations
} from '@/lib/auth/middleware-performance'
import {
  classifyRoute as classifyRouteFast,
  isProtectedRoute as isProtectedRouteFast
} from '@/lib/cache/route-classifier'
import {
  logAuthBypassAttemptFast,
  logUnauthorizedAccessFast,
  logMiddlewareActionFast
} from '@/lib/security/performance-logger'
import { middlewareCache } from '@/lib/cache/middleware-cache'
import { recordMiddlewareRequest } from '@/lib/monitoring/middleware-monitor'

export async function middleware(request: NextRequest) {
  // Get runtime configuration
  const config = getRuntimeConfig()
  
  // DEVELOPMENT FAST-PATH: Skip heavy processing for static assets early
  const { pathname } = request.nextUrl
  if (config.environment.isDev && 
      (pathname.startsWith('/_next/') || 
       pathname.includes('.') && 
       /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp)$/.test(pathname))) {
    return NextResponse.next()
  }

  // PERFORMANCE OPTIMIZATION: Start performance tracking
  const performanceMetrics = {
    startTime: performance.now(),
    cacheHit: false,
    classificationTime: 0,
    validationTime: 0,
    totalTime: 0
  }

  // Use optimized request ID generation based on config
  const debugId = config.performance.useOptimizedValidation ?
    generateRequestIdFast() :
    generateRequestId()

  // Logging based on runtime configuration
  if (!config.performance.minimalLogging) {
    console.log(`[MIDDLEWARE-${debugId}] Processing request: ${request.method} ${pathname} [Profile: ${config.profile}]`)
  }

  // Get production security configuration (only in production-like environments)
  const securityConfig = isProductionLike() ? getProductionSecurityConfig() : null
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add headers to indicate middleware execution and security profile
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-middleware-route', pathname)
  response.headers.set('x-security-profile', config.profile)
  response.headers.set('x-security-level', isProductionLike() ? 'production' : config.profile)
  
  // Apply security headers conditionally based on configuration
  if (securityConfig) {
    applySecurityHeaders(response.headers)
  } else if (config.environment.isDev && !securityConfig && !config.performance.minimalLogging) {
    console.log(`[MIDDLEWARE-${debugId}] Skipping security headers in development mode`)
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // PERFORMANCE: Fast route classification with caching based on config
  const classificationStart = performance.now()

  const routeClassification: RouteClassification = config.performance.enableMiddlewareCache ?
    classifyRouteFast(pathname) :
    classifyRoute(pathname)

  performanceMetrics.classificationTime = performance.now() - classificationStart

  if (!config.performance.minimalLogging) {
    console.log(`[MIDDLEWARE-${debugId}] Route classification:`, {
      pathname,
      isProtected: routeClassification.isProtected,
      isPublic: routeClassification.isPublic,
      securityLevel: routeClassification.securityLevel,
      requiresEmailVerification: routeClassification.requiresEmailVerification,
      cached: performanceMetrics.cacheHit,
      profile: config.profile
    })
  }

  // Skip validation for static assets
  if (routeClassification.isStatic) {
    if (!config.performance.minimalLogging) {
      console.log(`[MIDDLEWARE-${debugId}] Allowing static asset: ${pathname}`)
    }
    return response
  }

  // DEVELOPMENT FAST-PATH: Allow public routes to skip heavy validation
  if (config.environment.isDev && routeClassification.isPublic && !routeClassification.requiresEmailVerification) {
    if (!config.performance.minimalLogging) {
      console.log(`[MIDDLEWARE-${debugId}] Fast-path for public route in development: ${pathname}`)
    }
    return response
  }

  // SECURITY: Validate environment and block production bypass attempts
  const devAuthBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true'

  // CRITICAL SECURITY: Prevent authentication bypass in production
  if (devAuthBypass && isProductionLike()) {
    console.error(`[MIDDLEWARE-${debugId}] SECURITY VIOLATION: Authentication bypass attempted in production-like environment`)

    // Use fast logging for critical security events based on config
    if (config.performance.useOptimizedValidation) {
      logAuthBypassAttemptFast({
        route: pathname,
        userId: undefined,
        reason: 'Authentication bypass attempted in production environment',
        authState: { isAuthenticated: false, isEmailVerified: false, user: null }
      })
    } else {
      logAuthBypassAttempt({
        route: pathname,
        userId: undefined,
        reason: 'Authentication bypass attempted in production environment',
        authState: { isAuthenticated: false, isEmailVerified: false, user: null }
      })
    }

    return new NextResponse('Access Denied - Security Violation', { status: 403 })
  }

  if (!config.performance.minimalLogging) {
    console.log(`[MIDDLEWARE-${debugId}] Environment check:`, {
      profile: config.profile,
      devAuthBypass: devAuthBypass && config.environment.isDev, // Only show bypass if dev mode
      pathname
    })
  }

  // PERFORMANCE: Enhanced session validation with caching
  let authState;
  let sessionValidation;

  if (routeClassification.isProtected || routeClassification.isApi) {
    try {
      // Use optimized session validation based on runtime configuration
      if (config.performance.useOptimizedValidation) {
        sessionValidation = await validateSessionFast(request, performanceMetrics)
        authState = analyzeAuthStateFast(sessionValidation.user, sessionValidation.error as any)
      } else {
        // Use standard validation for production-like environments
        sessionValidation = await validateMiddlewareSession(request)
        authState = analyzeAuthState(sessionValidation.user, sessionValidation.error as any)
      }
      
      console.log(`[MIDDLEWARE-${debugId}] Enhanced auth validation:`, {
        hasUser: !!sessionValidation.user,
        userEmail: sessionValidation.user?.email,
        isValid: sessionValidation.isValid,
        securityAlerts: sessionValidation.securityAlerts.length,
        shouldTerminate: sessionValidation.shouldTerminate,
        isAuthenticated: authState.isAuthenticated,
        isEmailVerified: authState.isEmailVerified
      });

      // Handle security termination
      if (sessionValidation.shouldTerminate) {
        console.error(`[MIDDLEWARE-${debugId}] SECURITY: Session terminated due to security concerns`);
        
        // Log critical security event with optimized logging based on config
        if (config.performance.useOptimizedValidation) {
          logAuthBypassAttemptFast({
            route: pathname,
            userId: sessionValidation.user?.id,
            reason: sessionValidation.error || 'Session validation failed',
            authState: authState
          })
        } else {
          logAuthBypassAttempt({
            route: pathname,
            userId: sessionValidation.user?.id,
            reason: sessionValidation.error || 'Session validation failed',
            authState: authState
          })
        }
        
        console.log(`[MIDDLEWARE-DEBUG] Redirecting to signin due to security validation failure`, {
          pathname,
          error: 'security_validation_failed',
          timestamp: new Date().toISOString()
        });
        const url = request.nextUrl.clone();
        url.pathname = '/auth/signin';
        url.searchParams.set('error', 'security_validation_failed');
        return NextResponse.redirect(url);
      }

      // Log security alerts
      if (sessionValidation.securityAlerts.length > 0) {
        console.warn(`[MIDDLEWARE-${debugId}] SECURITY: Security alerts detected:`, sessionValidation.securityAlerts);
        response.headers.set('x-security-alerts', sessionValidation.securityAlerts.join(','));
      }

    } catch (error) {
      console.error(`[MIDDLEWARE-${debugId}] SECURITY: Error during session validation:`, error);
      authState = analyzeAuthState(null, error as any);
      sessionValidation = {
        isValid: false,
        user: null,
        error: 'Validation failed',
        securityAlerts: ['validation_exception'],
        shouldTerminate: true
      };
    }
  } else {
    // For public routes, still check auth state but don't enforce
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      authState = config.performance.useOptimizedValidation ?
        analyzeAuthStateFast(user, error) :
        analyzeAuthState(user, error)

      // Add development mode indicator for debugging
      if (config.environment.isDev) {
        response.headers.set('x-dev-mode', 'true')
        response.headers.set('x-security-profile', config.profile)
      }
    } catch (error) {
      console.error(`[MIDDLEWARE-${debugId}] Error checking auth state for public route:`, error)
      authState = analyzeAuthState(null, error as any)
    }
  }

  // PERFORMANCE: Enforce security policy with caching based on config
  const validationStart = performance.now()

  const securityPolicy: SecurityPolicy = config.performance.useOptimizedValidation ?
    enforceSecurityPolicyFast(routeClassification, authState, pathname) :
    enforceSecurityPolicy(routeClassification, authState, pathname)

  performanceMetrics.validationTime = performance.now() - validationStart
  
  console.log(`[MIDDLEWARE-${debugId}] Security policy decision:`, {
    allowAccess: securityPolicy.allowAccess,
    securityLevel: securityPolicy.securityLevel,
    reason: securityPolicy.reason,
    redirectTo: securityPolicy.redirectTo
  });

  // Handle security policy enforcement
  if (!securityPolicy.allowAccess && securityPolicy.redirectTo) {
    console.log(`[MIDDLEWARE-${debugId}] SECURITY: Redirecting due to policy: ${securityPolicy.reason}`);
    
    // Log middleware action with optimized logging based on config
    if (config.performance.useOptimizedValidation) {
      logMiddlewareActionFast({
        route: pathname,
        action: 'redirected',
        reason: securityPolicy.reason,
        userId: authState.user?.id,
        securityLevel: securityPolicy.securityLevel
      })
    } else {
      logMiddlewareAction({
        route: pathname,
        action: 'redirected',
        reason: securityPolicy.reason,
        userId: authState.user?.id,
        securityLevel: securityPolicy.securityLevel
      })
    }
    
    const url = request.nextUrl.clone();
    url.pathname = securityPolicy.redirectTo.split('?')[0];
    
    // Preserve query parameters from redirect URL
    const redirectUrl = new URL(securityPolicy.redirectTo, request.url);
    redirectUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value);
    });
    
    return NextResponse.redirect(url);
  }

  if (!securityPolicy.allowAccess) {
    console.error(`[MIDDLEWARE-${debugId}] SECURITY: Access blocked: ${securityPolicy.reason}`);
    
    // Log unauthorized access attempt with optimized logging based on config
    if (config.performance.useOptimizedValidation) {
      logUnauthorizedAccessFast({
        route: pathname,
        userId: authState.user?.id,
        reason: securityPolicy.reason,
        authRequired: routeClassification.isProtected
      })

      logMiddlewareActionFast({
        route: pathname,
        action: 'blocked',
        reason: securityPolicy.reason,
        userId: authState.user?.id,
        securityLevel: securityPolicy.securityLevel
      })
    } else {
      logUnauthorizedAccess({
        route: pathname,
        userId: authState.user?.id,
        reason: securityPolicy.reason,
        authRequired: routeClassification.isProtected
      })

      logMiddlewareAction({
        route: pathname,
        action: 'blocked',
        reason: securityPolicy.reason,
        userId: authState.user?.id,
        securityLevel: securityPolicy.securityLevel
      })
    }
    
    return new NextResponse('Access Denied', { status: 403 });
  }

  // Add security headers for successful requests
  response.headers.set('x-security-policy', securityPolicy.securityLevel);
  response.headers.set('x-route-classification', routeClassification.securityLevel);

  // PERFORMANCE: Log performance metrics and record request based on config
  performanceMetrics.totalTime = performance.now() - performanceMetrics.startTime

  if (config.logging.enablePerformanceMetrics) {
    if (config.performance.useOptimizedValidation) {
      logMiddlewarePerformance(debugId, pathname, performanceMetrics, authState)
      recordMiddlewareRequest(pathname, performanceMetrics.totalTime, performanceMetrics.cacheHit)
    } else if (!config.performance.minimalLogging) {
      console.log(`[MIDDLEWARE-${debugId}] Completed processing - allowing through to ${pathname} (${performanceMetrics.totalTime.toFixed(1)}ms)`)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static assets (svg, png, jpg, jpeg, gif, webp, json)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json)$).*)',
  ],
}