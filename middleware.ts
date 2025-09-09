import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
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

export async function middleware(request: NextRequest) {
  // PRODUCTION DEBUG: Add detailed logging to trace the authentication flow
  const debugId = generateRequestId();
  console.log(`[MIDDLEWARE-${debugId}] Processing request: ${request.method} ${request.nextUrl.pathname}`);
  
  // Get production security configuration
  const securityConfig = getProductionSecurityConfig();
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // PRODUCTION TEST: Add header to prove middleware is running
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-middleware-route', request.nextUrl.pathname)
  response.headers.set('x-security-level', securityConfig.environment.enforceProduction ? 'production' : 'development')
  
  // Apply production security headers
  applySecurityHeaders(response.headers)

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

  // SECURITY: Comprehensive route classification and validation
  const { pathname } = request.nextUrl;
  const routeClassification: RouteClassification = classifyRoute(pathname);
  
  console.log(`[MIDDLEWARE-${debugId}] Route classification:`, {
    pathname,
    isProtected: routeClassification.isProtected,
    isPublic: routeClassification.isPublic,
    securityLevel: routeClassification.securityLevel,
    requiresEmailVerification: routeClassification.requiresEmailVerification
  });

  // Skip validation for static assets
  if (routeClassification.isStatic) {
    console.log(`[MIDDLEWARE-${debugId}] Allowing static asset: ${pathname}`);
    return response;
  }

  // DEVELOPMENT: Check for dev auth bypass
  const isDevMode = process.env.NODE_ENV === 'development';
  const devAuthBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
  
  console.log(`[MIDDLEWARE-${debugId}] Environment check:`, {
    isDevelopment: isDevMode,
    devAuthBypass,
    pathname
  });
  
  // SECURITY: Enhanced session validation for protected routes
  let authState;
  let sessionValidation;
  
  if (routeClassification.isProtected || routeClassification.isApi) {
    // DEVELOPMENT: Apply dev auth bypass if enabled
    if (isDevMode && devAuthBypass) {
      console.log(`[MIDDLEWARE-${debugId}] DEVELOPMENT: Auth bypass enabled - creating mock user`);
      
      // Create mock authenticated user for development
      const mockUser = {
        id: 'dev-user-mock-123',
        email: 'dev@polyharmony.test',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        aud: 'authenticated',
        role: 'authenticated'
      };
      
      authState = analyzeAuthState(mockUser as any, null);
      sessionValidation = {
        isValid: true,
        user: mockUser as any,
        error: null,
        securityAlerts: ['dev_bypass_active'],
        shouldTerminate: false
      };
      
      // Set dev bypass header
      response.headers.set('x-dev-auth-bypass', 'true');
      response.headers.set('x-dev-mode', 'true');
    } else {
      try {
        // Perform comprehensive session validation
        sessionValidation = await validateMiddlewareSession(request);
        authState = analyzeAuthState(sessionValidation.user, sessionValidation.error as any);
      
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
        
        // Log critical security event
        logAuthBypassAttempt({
          route: pathname,
          userId: sessionValidation.user?.id,
          reason: sessionValidation.error || 'Session validation failed',
          authState: authState
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
    }
  } else {
    // For public routes, still check auth state but don't enforce
    if (isDevMode && devAuthBypass) {
      console.log(`[MIDDLEWARE-${debugId}] DEVELOPMENT: Public route with dev bypass - creating mock user`);
      
      const mockUser = {
        id: 'dev-user-mock-123',
        email: 'dev@polyharmony.test',
        email_confirmed_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        aud: 'authenticated',
        role: 'authenticated'
      };
      
      authState = analyzeAuthState(mockUser as any, null);
      response.headers.set('x-dev-auth-bypass', 'true');
      response.headers.set('x-dev-mode', 'true');
    } else {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        authState = analyzeAuthState(user, error);
      } catch (error) {
        console.error(`[MIDDLEWARE-${debugId}] Error checking auth state for public route:`, error);
        authState = analyzeAuthState(null, error as any);
      }
    }
  }

  // SECURITY: Enforce comprehensive security policy
  const securityPolicy: SecurityPolicy = enforceSecurityPolicy(routeClassification, authState, pathname);
  
  console.log(`[MIDDLEWARE-${debugId}] Security policy decision:`, {
    allowAccess: securityPolicy.allowAccess,
    securityLevel: securityPolicy.securityLevel,
    reason: securityPolicy.reason,
    redirectTo: securityPolicy.redirectTo
  });

  // Handle security policy enforcement
  if (!securityPolicy.allowAccess && securityPolicy.redirectTo) {
    console.log(`[MIDDLEWARE-${debugId}] SECURITY: Redirecting due to policy: ${securityPolicy.reason}`);
    
    // Log middleware action
    logMiddlewareAction({
      route: pathname,
      action: 'redirected',
      reason: securityPolicy.reason,
      userId: authState.user?.id,
      securityLevel: securityPolicy.securityLevel
    });
    
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
    
    // Log unauthorized access attempt
    logUnauthorizedAccess({
      route: pathname,
      userId: authState.user?.id,
      reason: securityPolicy.reason,
      authRequired: routeClassification.isProtected
    });
    
    // Log middleware block action
    logMiddlewareAction({
      route: pathname,
      action: 'blocked',
      reason: securityPolicy.reason,
      userId: authState.user?.id,
      securityLevel: securityPolicy.securityLevel
    });
    
    return new NextResponse('Access Denied', { status: 403 });
  }

  // Add security headers for successful requests
  response.headers.set('x-security-policy', securityPolicy.securityLevel);
  response.headers.set('x-route-classification', routeClassification.securityLevel);

  console.log(`[MIDDLEWARE-${debugId}] Completed processing - allowing through to ${pathname}`);
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
     * - Static assets (svg, png, jpg, jpeg, gif, webp)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}