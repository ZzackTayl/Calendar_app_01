'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

/**
 * Custom hook to handle email verification status and redirection
 * 
 * This hook will:
 * 1. Check if the user is authenticated but email is not verified
 * 2. Redirect to the confirm-email page if trying to access protected routes
 * 3. Allow access to auth routes and public routes without redirection
 */
export function useEmailVerification() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  
  useEffect(() => {
    // Skip during loading or if no user
    if (loading || !user) return
    
    // User is verified, no action needed
    if (user.email_confirmed_at) return
    
    // Allow auth routes (signin, signup, confirm-email, etc.)
    if (pathname.startsWith('/auth/')) return
    
    // Allow public routes
    const publicRoutes = ['/', '/privacy', '/terms', '/support']
    if (publicRoutes.includes(pathname)) return
    
    // Allow API routes (handled by middleware)
    if (pathname.startsWith('/api/')) return
    
    // User is unverified and trying to access a protected route
    console.log('Unverified user detected, redirecting to email confirmation page')
    router.push('/auth/confirm-email')
  }, [user, loading, pathname, router])
  
  return {
    isEmailVerified: user ? !!user.email_confirmed_at : false,
    isLoading: loading,
    needsEmailVerification: user && !user.email_confirmed_at
  }
}

/**
 * Get the redirect URL after email verification based on stored state
 */
export function getPostVerificationRedirect(): string {
  // Check for stored invitation
  const pendingInvitation = localStorage.getItem('pendingInvitation')
  if (pendingInvitation) {
    try {
      const invitation = JSON.parse(pendingInvitation)
      localStorage.removeItem('pendingInvitation')
      
      // Redirect to accept invitation flow
      return `/invitations/accept?token=${invitation.token}`
    } catch (error) {
      console.error('Error parsing pending invitation:', error)
    }
  }
  
  // Check for stored redirect URL
  const redirectUrl = localStorage.getItem('redirectAfterVerification')
  if (redirectUrl) {
    localStorage.removeItem('redirectAfterVerification')
    return redirectUrl
  }
  
  // Default redirect to dashboard
  return '/dashboard'
}
