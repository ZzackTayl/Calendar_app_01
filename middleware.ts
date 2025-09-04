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

  // SECURITY: Enhanced session validation and refresh
  // Refresh session if expired and validate authentication state
  let sessionRefreshAttempted = false
  let authData
  
  try {
    authData = await supabase.auth.getUser()
  } catch (sessionError) {
    console.error(`[MIDDLEWARE-${debugId}] Session retrieval failed:`, sessionError)
    // Try to refresh session once
    if (!sessionRefreshAttempted) {
      sessionRefreshAttempted = true
      try {
        const { data: session } = await supabase.auth.getSession()
        if (session?.session) {
          authData = await supabase.auth.getUser()
        }
      } catch (refreshError) {
        console.error(`[MIDDLEWARE-${debugId}] Session refresh failed:`, refreshError)
      }
    }
  }

  const { data: { user }, error } = authData || { data: { user: null }, error: null }
  
  // ENHANCED AUTH STATE ANALYSIS: Use helper function for comprehensive state detection
  const authState = analyzeAuthState(user, error)
  logAuthState(debugId, request.nextUrl.pathname, authState)
  
  // ENHANCED DEBUG: Generate comprehensive auth diagnostic report
  const authDebugInfo = extractMiddlewareAuthInfo(request, user, error, debugId);
  generateAuthDiagnosticReport(authDebugInfo);

  // Get route information
  const { pathname } = request.nextUrl
  const protectedRoute = isProtectedRoute(pathname)
  const authRoute = isAuthRoute(pathname)
  
  // SECURITY: Session consistency validation
  if (user) {
    // Validate user object integrity
    if (!user.id || !user.email) {
      console.error(`[MIDDLEWARE-${debugId}] SECURITY: Invalid user object detected`, {
        hasId: !!user.id,
        hasEmail: !!user.email,
        route: pathname
      })
      // Clear potentially corrupted session
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/auth/signin'
      url.searchParams.set('error', 'session_invalid')
      return NextResponse.redirect(url)
    }

    // Log successful authentication context for audit
    console.log(`[MIDDLEWARE-${debugId}] AUTH AUDIT: User authenticated`, {
      userId: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
      route: pathname,
      timestamp: new Date().toISOString()
    })
  }

  // CRITICAL SECURITY CHECK: Handle unverified users
  if (authState.shouldRedirectToConfirmEmail) {
    const userEmail = user?.email || ''
    console.warn(`[MIDDLEWARE-${debugId}] SECURITY: Unverified user detected:`, userEmail, 'on route:', pathname)
    
    // Allow access to confirmation page and auth callback only
    if (isUnverifiedUserAllowedRoute(pathname)) {
      console.log(`[MIDDLEWARE-${debugId}] Allowing access to ${pathname} for unverified user`);
      return response
    }
    
    // Block ALL other routes for unverified users - redirect to confirmation
    console.warn(`[MIDDLEWARE-${debugId}] SECURITY: Redirecting unverified user from`, pathname, 'to confirmation page')
    const url = request.nextUrl.clone()
    url.pathname = '/auth/confirm-email'
    if (userEmail) {
      url.searchParams.set('email', userEmail)
    }
    return NextResponse.redirect(url)
  }

  // SECURITY: Protect routes requiring authentication
  if (protectedRoute && authState.shouldRedirectToSignIn) {
    console.warn(`[MIDDLEWARE-${debugId}] SECURITY: Redirecting unauthenticated user from ${pathname} to signin`);
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // SECURITY: Redirect authenticated users away from auth routes
  if (authRoute && authState.isAuthenticated && !pathname.includes('/auth/callback')) {
    console.log(`[MIDDLEWARE-${debugId}] Redirecting authenticated user from auth route ${pathname}`)
    const url = request.nextUrl.clone()
    const next = url.searchParams.get('next')
    
    // If there's a next parameter, redirect there (with security validation)
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      url.pathname = next
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    
    return NextResponse.redirect(url)
  }

  // SECURITY: Allow unverified users to access confirm-email page
  if (authRoute && pathname === '/auth/confirm-email' && authState.isUnverifiedUser) {
    return response
  }

  console.log(`[MIDDLEWARE-${debugId}] Completed processing - allowing through to ${pathname}`);
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}