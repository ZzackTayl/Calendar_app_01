import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  // Log auth errors but don't redirect immediately - let unverified user logic handle it
  if (error) {
    console.log('Auth middleware error:', error.code, error.message)
  }

  // CRITICAL SECURITY CHECK: Handle unverified users
  // This covers both cases:
  // 1. User object exists but email_confirmed_at is null
  // 2. getUser() failed with email_not_confirmed error (user may or may not exist)
  if ((user && !user.email_confirmed_at) || (error && error.code === 'email_not_confirmed')) {
    const userEmail = user?.email || ''
    console.warn('Security: Unverified user detected:', userEmail)
    
    const url = request.nextUrl.clone()
    
    // Allow access to confirmation page and auth callback
    if (url.pathname === '/auth/confirm-email' || url.pathname === '/auth/callback') {
      return response
    }
    
    // Block access to all other routes except auth routes
    if (!url.pathname.startsWith('/auth/')) {
      url.pathname = '/auth/confirm-email'
      if (userEmail) {
        url.searchParams.set('email', userEmail)
      }
      return NextResponse.redirect(url)
    }
    
    // If on other auth pages (signin, signup), redirect to confirmation page
    if (url.pathname !== '/auth/confirm-email' && url.pathname !== '/auth/callback') {
      url.pathname = '/auth/confirm-email'
      if (userEmail) {
        url.searchParams.set('email', userEmail)
      }
      return NextResponse.redirect(url)
    }
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

  const isAuthRoute = pathname.startsWith('/auth/')

  // Redirect unauthenticated users from protected routes
  // Only redirect if truly unauthenticated (no user and no email_not_confirmed error)
  if (isProtectedRoute && !user && !(error && error.code === 'email_not_confirmed')) {
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