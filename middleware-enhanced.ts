import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { 
  analyzeAuthState, 
  logAuthState, 
  isProtectedRoute, 
  isAuthRoute,
  isUnverifiedUserAllowedRoute 
} from '@/lib/auth/middleware-helpers'

export async function middleware(request: NextRequest) {
  // Generate unique debug ID for request tracing
  const debugId = Math.random().toString(36).substr(2, 9);
  const { pathname } = request.nextUrl
  
  console.log(`[MIDDLEWARE-${debugId}] Processing: ${request.method} ${pathname}`);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Initialize Supabase client with cookie handling
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

  // Get user authentication state
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // Analyze authentication state with enhanced logic
  const authState = analyzeAuthState(user, error)
  
  // Log comprehensive auth state for debugging
  logAuthState(debugId, pathname, authState)
  
  // Handle unverified users - redirect to email confirmation
  if (authState.shouldRedirectToConfirmEmail) {
    // Allow access to confirmation page and auth callback
    if (isUnverifiedUserAllowedRoute(pathname)) {
      console.log(`[MIDDLEWARE-${debugId}] Allowing unverified user access to ${pathname}`);
      return response
    }
    
    // Redirect all other routes to confirmation
    console.warn(`[MIDDLEWARE-${debugId}] Redirecting unverified user from ${pathname} to confirmation`);
    const url = request.nextUrl.clone()
    url.pathname = '/auth/confirm-email'
    if (user?.email) {
      url.searchParams.set('email', user.email)
    }
    return NextResponse.redirect(url)
  }

  // Handle protected routes for unauthenticated users
  if (isProtectedRoute(pathname) && authState.shouldRedirectToSignIn) {
    console.warn(`[MIDDLEWARE-${debugId}] Redirecting unauthenticated user from ${pathname} to signin`);
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Handle verified users accessing auth routes (except callback)
  if (isAuthRoute(pathname) && authState.isAuthenticated && !pathname.includes('/auth/callback')) {
    console.log(`[MIDDLEWARE-${debugId}] Redirecting verified user away from ${pathname}`);
    const url = request.nextUrl.clone()
    const next = url.searchParams.get('next')
    
    // Redirect to intended page or dashboard
    if (next && next.startsWith('/')) {
      url.pathname = next
      url.search = ''
    } else {
      url.pathname = '/dashboard'
      url.search = ''
    }
    
    return NextResponse.redirect(url)
  }

  // Allow verified users to access confirm-email page (edge case handling)
  if (pathname === '/auth/confirm-email' && authState.isEmailVerified) {
    console.log(`[MIDDLEWARE-${debugId}] Redirecting verified user away from confirm-email page`);
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  console.log(`[MIDDLEWARE-${debugId}] Allowing request through to ${pathname}`);
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