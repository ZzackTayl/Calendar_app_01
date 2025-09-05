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
  isUnverifiedUserAllowedRoute 
} from '@/lib/auth/middleware-helpers'

export async function middleware(request: NextRequest) {
  // PRODUCTION DEBUG: Add detailed logging to trace the authentication flow
  const debugId = generateRequestId();
  console.log(`[MIDDLEWARE-${debugId}] Processing request: ${request.method} ${request.nextUrl.pathname}`);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // PRODUCTION TEST: Add header to prove middleware is running
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-middleware-route', request.nextUrl.pathname)

  // SECURITY: Check for demo mode in production and clear if not explicitly configured
  const isDevelopment = process.env.NODE_ENV === 'development';
  const hasExplicitDemoConfig = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true';
  const hasDemoFlag = request.cookies.get('ph_demo_enabled')?.value === '1';
  
  if (!isDevelopment && !hasExplicitDemoConfig && hasDemoFlag) {
    console.warn(`[MIDDLEWARE-${debugId}] SECURITY: Clearing demo mode flag in production`);
    // Clear demo mode cookies
    response.cookies.set('ph_demo_enabled', '', { maxAge: 0 });
    response.cookies.set('ph_demo_version', '', { maxAge: 0 });
    response.cookies.set('ph_demo_events', '', { maxAge: 0 });
    response.cookies.set('ph_demo_relationships', '', { maxAge: 0 });
    response.cookies.set('ph_demo_contacts', '', { maxAge: 0 });
    response.cookies.set('ph_demo_groups', '', { maxAge: 0 });
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

  // Get user session for authentication checks
  let authState;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    authState = analyzeAuthState(user, error);
    console.log(`[MIDDLEWARE-${debugId}] Auth check:`, {
      hasUser: !!user,
      userEmail: user?.email,
      isAuthenticated: authState.isAuthenticated,
      isEmailVerified: authState.isEmailVerified,
      shouldRedirectToSignIn: authState.shouldRedirectToSignIn,
      shouldRedirectToConfirmEmail: authState.shouldRedirectToConfirmEmail
    });
  } catch (error) {
    console.error(`[MIDDLEWARE-${debugId}] Error checking auth state:`, error);
    authState = analyzeAuthState(null, error as any);
  }

  // Get route information
  const { pathname } = request.nextUrl
  const protectedRoute = isProtectedRoute(pathname)
  const authRoute = isAuthRoute(pathname)
  
  // Handle protected routes based on auth state
  if (protectedRoute && authState) {
    if (authState.shouldRedirectToSignIn) {
      console.log(`[MIDDLEWARE-${debugId}] Redirecting unauthenticated user from ${pathname} to signin`);
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    
    if (authState.shouldRedirectToConfirmEmail && !isUnverifiedUserAllowedRoute(pathname)) {
      console.log(`[MIDDLEWARE-${debugId}] Redirecting unverified user from ${pathname} to confirm email`);
      const url = request.nextUrl.clone()
      url.pathname = '/auth/confirm-email'
      return NextResponse.redirect(url)
    }
    
    if (authState.isAuthenticated) {
      console.log(`[MIDDLEWARE-${debugId}] Allowing authenticated user access to ${pathname}`);
    }
  }

  // SECURITY: Allow access to auth routes and public routes
  if (authRoute || pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/api/health')) {
    console.log(`[MIDDLEWARE-${debugId}] Allowing access to ${pathname}`);
    return response
  }

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