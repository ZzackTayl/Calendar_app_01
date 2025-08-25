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

  // Auth error handling for unconfirmed emails
  if (error) {
    console.log('Auth middleware error:', error.code, error.message)
    
    // Handle email not confirmed
    if (error.code === 'email_not_confirmed') {
      const url = request.nextUrl.clone()
      
      // Don't redirect if already on auth pages
      if (!url.pathname.startsWith('/auth/')) {
        url.pathname = '/auth/signin'
        url.searchParams.set('error', 'Please confirm your email address before signing in')
        return NextResponse.redirect(url)
      }
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
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth routes (except callback)
  if (isAuthRoute && user && !pathname.includes('/auth/callback')) {
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