import { NextRequest } from 'next/server'
import { User, AuthError } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

/**
 * Enhanced authentication state detection for middleware
 * Provides more granular control over auth state than simple boolean checks
 */
export interface AuthState {
  user: User | null
  error: AuthError | null
  isAuthenticated: boolean
  isEmailVerified: boolean
  isUnverifiedUser: boolean
  isCompletelyUnauthenticated: boolean
  shouldRedirectToConfirmEmail: boolean
  shouldRedirectToSignIn: boolean
}

/**
 * Analyze authentication state and determine appropriate redirects
 */
export function analyzeAuthState(user: User | null, error: AuthError | null): AuthState {
  // Basic states
  const hasUser = !!user
  const hasError = !!error
  const emailConfirmed = user?.email_confirmed_at
  
  // Derived states
  const isAuthenticated = hasUser && !!emailConfirmed
  const isEmailVerified = hasUser && !!emailConfirmed
  const isUnverifiedUser = hasUser && !emailConfirmed
  const isCompletelyUnauthenticated = !hasUser && (!hasError || error.code !== 'email_not_confirmed')
  
  // Special case: email_not_confirmed error without user object
  const hasEmailNotConfirmedError = hasError && error.code === 'email_not_confirmed'
  
  // Redirect logic
  const shouldRedirectToConfirmEmail = isUnverifiedUser || hasEmailNotConfirmedError
  const shouldRedirectToSignIn = isCompletelyUnauthenticated
  
  return {
    user,
    error,
    isAuthenticated,
    isEmailVerified,
    isUnverifiedUser,
    isCompletelyUnauthenticated,
    shouldRedirectToConfirmEmail,
    shouldRedirectToSignIn
  }
}

/**
 * Enhanced logging for production debugging
 */
export function logAuthState(debugId: string, pathname: string, authState: AuthState) {
  console.log(`[MIDDLEWARE-${debugId}] Enhanced auth analysis for ${pathname}:`, {
    hasUser: !!authState.user,
    userEmail: authState.user?.email,
    emailConfirmedAt: authState.user?.email_confirmed_at,
    errorCode: authState.error?.code,
    errorMessage: authState.error?.message,
    isAuthenticated: authState.isAuthenticated,
    isEmailVerified: authState.isEmailVerified,
    isUnverifiedUser: authState.isUnverifiedUser,
    isCompletelyUnauthenticated: authState.isCompletelyUnauthenticated,
    shouldRedirectToConfirmEmail: authState.shouldRedirectToConfirmEmail,
    shouldRedirectToSignIn: authState.shouldRedirectToSignIn
  })
}

/**
 * Comprehensive route classification system
 */
export interface RouteClassification {
  isProtected: boolean;
  isPublic: boolean;
  isAuth: boolean;
  isApi: boolean;
  isStatic: boolean;
  requiresEmailVerification: boolean;
  allowsUnverifiedUsers: boolean;
  securityLevel: 'public' | 'protected' | 'sensitive';
}

/**
 * Classify route with comprehensive security analysis
 */
export function classifyRoute(pathname: string): RouteClassification {
  // Static assets and system routes
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/favicon') ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)$/)) {
    return {
      isProtected: false,
      isPublic: true,
      isAuth: false,
      isApi: false,
      isStatic: true,
      requiresEmailVerification: false,
      allowsUnverifiedUsers: true,
      securityLevel: 'public'
    };
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    const isAuthApi = pathname.startsWith('/api/auth/');
    const isPublicApi = pathname.startsWith('/api/health') || 
                       pathname.startsWith('/api/webhooks') ||
                       isAuthApi;
    
    return {
      isProtected: !isPublicApi,
      isPublic: isPublicApi,
      isAuth: isAuthApi,
      isApi: true,
      isStatic: false,
      requiresEmailVerification: !isPublicApi,
      allowsUnverifiedUsers: isAuthApi,
      securityLevel: isPublicApi ? 'public' : 'protected'
    };
  }

  // Auth routes
  if (pathname.startsWith('/auth/')) {
    return {
      isProtected: false,
      isPublic: true,
      isAuth: true,
      isApi: false,
      isStatic: false,
      requiresEmailVerification: false,
      allowsUnverifiedUsers: true,
      securityLevel: 'public'
    };
  }

  // Public pages
  const publicRoutes = ['/', '/privacy', '/terms', '/support'];
  if (publicRoutes.includes(pathname)) {
    return {
      isProtected: false,
      isPublic: true,
      isAuth: false,
      isApi: false,
      isStatic: false,
      requiresEmailVerification: false,
      allowsUnverifiedUsers: true,
      securityLevel: 'public'
    };
  }

  // Sensitive protected routes (require full verification)
  const sensitiveRoutes = ['/settings', '/sharing'];
  const isSensitive = sensitiveRoutes.some(route => pathname.startsWith(route));

  // All other routes are protected
  return {
    isProtected: true,
    isPublic: false,
    isAuth: false,
    isApi: false,
    isStatic: false,
    requiresEmailVerification: true,
    allowsUnverifiedUsers: false,
    securityLevel: isSensitive ? 'sensitive' : 'protected'
  };
}

/**
 * Check if a path is protected (requires authentication) - Legacy function
 */
export function isProtectedRoute(pathname: string): boolean {
  const classification = classifyRoute(pathname);
  return classification.isProtected;
}

/**
 * Check if a path is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth/')
}

/**
 * Check if unverified users should be allowed on this route
 */
export function isUnverifiedUserAllowedRoute(pathname: string): boolean {
  const classification = classifyRoute(pathname);
  return classification.allowsUnverifiedUsers;
}

/**
 * Validate session in middleware with comprehensive security checks
 */
export async function validateMiddlewareSession(request: NextRequest): Promise<{
  isValid: boolean;
  user: User | null;
  error: string | null;
  securityAlerts: string[];
  shouldTerminate: boolean;
}> {
  const securityAlerts: string[] = [];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {}, // No-op for read-only validation
          remove() {} // No-op for read-only validation
        },
      }
    );

    // Enhanced token validation for security-critical middleware operations
    const authHeader = request.headers.get('authorization');
    let tokenValidationResult: any = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        // Import enhanced token validation dynamically
        const { validateToken } = await import('./enhanced-token-validation');

        tokenValidationResult = await validateToken(token, {
          validateSignature: false, // Skip signature validation for performance in middleware
          checkReplayAttacks: true,
          validateIssuer: false, // Skip for now, can be enabled when issuer is configured
          validateAudience: false, // Skip for now, can be enabled when audience is configured
          context: {
            maxAge: 24 * 60 * 60, // 24 hours
            allowedAlgorithms: ['HS256', 'RS256', 'ES256']
          }
        });

        // Add token validation alerts to security alerts
        if (tokenValidationResult.securityAlerts.length > 0) {
          const criticalTokenAlerts = tokenValidationResult.securityAlerts
            .filter((alert: any) => alert.severity === 'critical' || alert.severity === 'high')
            .map((alert: any) => `token_${alert.type}`);

          securityAlerts.push(...criticalTokenAlerts);

          // Terminate on critical token security issues
          if (tokenValidationResult.securityAlerts.some((alert: any) => alert.severity === 'critical')) {
            return {
              isValid: false,
              user: null,
              error: 'Critical token security violation detected',
              securityAlerts: [...securityAlerts, 'token_security_violation'],
              shouldTerminate: true
            };
          }
        }

        // If token validation failed, log but continue with session-based validation
        if (!tokenValidationResult.isValid) {
          console.warn('MiddlewareValidation: Token validation failed, falling back to session validation');
          securityAlerts.push('token_validation_failed');
        }
      } catch (tokenError) {
        console.error('MiddlewareValidation: Token validation error:', tokenError);
        securityAlerts.push('token_validation_error');
      }
    }

    // Get user session (primary validation method)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('MiddlewareValidation: Session validation error:', error.message);
      return {
        isValid: false,
        user: null,
        error: error.message,
        securityAlerts: ['session_validation_error'],
        shouldTerminate: true
      };
    }

    if (!user) {
      return {
        isValid: false,
        user: null,
        error: 'No user session',
        securityAlerts: [],
        shouldTerminate: false
      };
    }

    // Cross-validate token and session user if both are available
    if (tokenValidationResult && tokenValidationResult.isValid && tokenValidationResult.user && user) {
      if (tokenValidationResult.user.id !== user.id) {
        console.error('MiddlewareValidation: SECURITY ALERT - Token and session user ID mismatch');
        return {
          isValid: false,
          user: null,
          error: 'Token and session user mismatch - potential security breach',
          securityAlerts: [...securityAlerts, 'user_id_mismatch', 'potential_session_hijack'],
          shouldTerminate: true
        };
      }

      if (tokenValidationResult.user.email !== user.email) {
        console.warn('MiddlewareValidation: Token and session email mismatch');
        securityAlerts.push('email_mismatch');
      }
    }

    // Validate user object integrity
    if (!user.id || !user.email) {
      securityAlerts.push('incomplete_user_data');
      console.warn('MiddlewareValidation: Incomplete user data detected');
    }

    // Check for suspicious patterns
    const userAgent = request.headers.get('user-agent') || '';
    if (userAgent.toLowerCase().includes('bot')) {
      securityAlerts.push('suspicious_user_agent');
    }

    // Validate session freshness (basic check)
    const sessionCookie = request.cookies.get('supabase-auth-token');
    if (!sessionCookie) {
      securityAlerts.push('missing_session_cookie');
    }

    console.log('MiddlewareValidation: Session validation completed', {
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      securityAlerts: securityAlerts.length,
      userAgent: userAgent.substring(0, 100) // Truncate for logging
    });

    return {
      isValid: true,
      user,
      error: null,
      securityAlerts,
      shouldTerminate: false
    };

  } catch (error: any) {
    console.error('MiddlewareValidation: Unexpected error:', error);
    return {
      isValid: false,
      user: null,
      error: error.message || 'Session validation failed',
      securityAlerts: ['validation_exception'],
      shouldTerminate: true
    };
  }
}

/**
 * Enhanced security policy enforcement
 */
export interface SecurityPolicy {
  allowAccess: boolean;
  redirectTo?: string;
  reason: string;
  securityLevel: 'allow' | 'redirect' | 'block';
}

/**
 * Enforce security policy based on route classification and auth state
 */
export function enforceSecurityPolicy(
  classification: RouteClassification,
  authState: AuthState,
  pathname: string
): SecurityPolicy {
  // Allow public routes
  if (classification.isPublic) {
    return {
      allowAccess: true,
      reason: 'Public route access allowed',
      securityLevel: 'allow'
    };
  }

  // Block protected routes for unauthenticated users
  if (classification.isProtected && authState.shouldRedirectToSignIn) {
    return {
      allowAccess: false,
      redirectTo: `/auth/signin?next=${encodeURIComponent(pathname)}`,
      reason: 'Authentication required for protected route',
      securityLevel: 'redirect'
    };
  }

  // Handle unverified users
  if (classification.isProtected && authState.shouldRedirectToConfirmEmail) {
    if (classification.allowsUnverifiedUsers) {
      return {
        allowAccess: true,
        reason: 'Unverified user allowed on this route',
        securityLevel: 'allow'
      };
    } else {
      return {
        allowAccess: false,
        redirectTo: '/auth/confirm-email',
        reason: 'Email verification required for this route',
        securityLevel: 'redirect'
      };
    }
  }

  // Sensitive routes require full verification
  if (classification.securityLevel === 'sensitive' && !authState.isEmailVerified) {
    return {
      allowAccess: false,
      redirectTo: '/auth/confirm-email',
      reason: 'Full verification required for sensitive route',
      securityLevel: 'redirect'
    };
  }

  // Allow authenticated and verified users
  if (authState.isAuthenticated) {
    return {
      allowAccess: true,
      reason: 'Authenticated user access granted',
      securityLevel: 'allow'
    };
  }

  // Default deny
  return {
    allowAccess: false,
    redirectTo: '/auth/signin',
    reason: 'Access denied - default security policy',
    securityLevel: 'block'
  };
}