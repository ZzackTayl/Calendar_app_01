import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // PRODUCTION DEBUG: Add detailed logging to trace the authentication flow
  const debugId = Math.random().toString(36).substr(2, 9);
  console.log(`[MIDDLEWARE-${debugId}] Processing request: ${request.method} ${request.nextUrl.pathname}`);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // PRODUCTION TEST: Add header to prove middleware is running
  response.headers.set('x-middleware-executed', 'true')
  response.headers.set('x-middleware-route', request.nextUrl.pathname)

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

  // Refresh session if expired - required for Server Components
  const { data: { user }, error } = await supabase.auth.getUser()
  
  // PRODUCTION DEBUG: Log authentication state
  console.log(`[MIDDLEWARE-${debugId}] Auth state:`, {
    hasUser: !!user,
    userEmail: user?.email,
    emailConfirmed: user?.email_confirmed_at,
    errorCode: error?.code,
    errorMessage: error?.message
  });

  // Log auth errors but don't redirect immediately - let unverified user logic handle it
  if (error) {
    console.log('Auth middleware error:', error.code, error.message)
  }

  // TEMPORARY BYPASS: Disable email verification for debugging
  // TODO: Remove this bypass after fixing the auth issue
  const BYPASS_EMAIL_VERIFICATION = true;
  
  // CRITICAL SECURITY CHECK: Handle unverified users
  // This covers both cases:
  // 1. User object exists but email_confirmed_at is null
  // 2. getUser() failed with email_not_confirmed error (user may or may not exist)  
  // 3. Email-related auth errors that indicate unverified state
  const isUnverifiedUser = !BYPASS_EMAIL_VERIFICATION && (
    (user && !user.email_confirmed_at) || 
    (error && error.code === 'email_not_confirmed') ||
    (error && error.message?.includes('email') && !user)
  )
  
  // PRODUCTION DEBUG: Log unverified user detection
  console.log(`[MIDDLEWARE-${debugId}] Unverified user check:`, {
    isUnverifiedUser,
    userExists: !!user,
    emailConfirmed: user?.email_confirmed_at,
    errorCode: error?.code
  });
  
  if (isUnverifiedUser) {
    const userEmail = user?.email || ''
    console.warn(`[MIDDLEWARE-${debugId}] Security: Unverified user detected:`, userEmail, 'on route:', request.nextUrl.pathname)
    
    const url = request.nextUrl.clone()
    
    // Allow access to confirmation page and auth callback only
    if (url.pathname === '/auth/confirm-email' || url.pathname === '/auth/callback') {
      console.log(`[MIDDLEWARE-${debugId}] Allowing access to ${url.pathname} for unverified user`);
      return response
    }
    
    // Block ALL other routes for unverified users - redirect to confirmation
    console.warn(`[MIDDLEWARE-${debugId}] Security: Redirecting unverified user from`, url.pathname, 'to confirmation page')
    url.pathname = '/auth/confirm-email'
    if (userEmail) {
      url.searchParams.set('email', userEmail)
    }
    return NextResponse.redirect(url)
  }

  // Handle protected routes
  const { pathname } = request.nextUrl
  const isProtectedRoute = [
    '/dashboard',
    '/calendar',
    '/contacts',
    '/events',
    '/groups',
    '/relationships',
    '/settings',
    '/sharing',
    '/templates'
  ].some(route => pathname.startsWith(route))

  // PRODUCTION DEBUG: Log route protection decision
  console.log(`[MIDDLEWARE-${debugId}] Route protection check:`, {
    pathname,
    isProtectedRoute,
    hasUser: !!user,
    hasError: !!error
  });

  const isAuthRoute = pathname.startsWith('/auth/')

  // Redirect truly unauthenticated users from protected routes
  // Only redirect if completely unauthenticated (no user, no email errors, no session)
  if (isProtectedRoute && !user && !error) {
    console.warn(`[MIDDLEWARE-${debugId}] Redirecting completely unauthenticated user from ${pathname} to signin`);
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth routes (except callback and confirm-email for unverified users)
  if (isAuthRoute && user && !pathname.includes('/auth/callback')) {
    // Allow unverified users to access confirm-email page
    if (pathname === '/auth/confirm-email' && !user.email_confirmed_at) {
      return response
    }
    
    // Redirect verified users away from auth routes
    if (user.email_confirmed_at) {
      const url = request.nextUrl.clone()
      const next = url.searchParams.get('next')
      
      // If there's a next parameter, redirect there
      if (next && next.startsWith('/')) {
        url.pathname = next
        url.search = ''
      } else {
        url.pathname = '/dashboard'
        url.search = ''
      }
      
      return NextResponse.redirect(url)
    }
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