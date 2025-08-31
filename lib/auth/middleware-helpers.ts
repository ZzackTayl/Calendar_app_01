import { NextRequest } from 'next/server'
import { User, AuthError } from '@supabase/supabase-js'

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
 * Check if a path is protected (requires authentication)
 */
export function isProtectedRoute(pathname: string): boolean {
  const protectedPaths = [
    '/dashboard',
    '/calendar',
    '/contacts',
    '/events',
    '/groups',
    '/relationships',
    '/settings',
    '/sharing',
    '/templates'
  ]
  
  return protectedPaths.some(path => pathname.startsWith(path))
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
  const allowedPaths = [
    '/auth/confirm-email',
    '/auth/callback'
  ]
  
  return allowedPaths.includes(pathname)
}