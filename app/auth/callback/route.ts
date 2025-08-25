import { createSupabaseClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  // Handle error cases
  if (error) {
    console.error('Auth callback error:', error, error_description)
    
    let errorMessage = 'Authentication failed'
    let redirectPath = '/auth/signin'
    
    switch (error) {
      case 'access_denied':
        errorMessage = 'You cancelled the authentication process'
        break
      case 'server_error':
        errorMessage = 'Server error occurred during authentication'
        break
      case 'invalid_request':
        errorMessage = 'Invalid authentication request'
        break
      case 'email_not_confirmed':
        errorMessage = 'Please check your email and click the confirmation link'
        redirectPath = '/auth/signin'
        break
      default:
        errorMessage = error_description || 'Authentication failed'
    }
    
    return NextResponse.redirect(
      `${origin}${redirectPath}?error=${encodeURIComponent(errorMessage)}`
    )
  }

  if (code) {
    const supabase = createSupabaseClient()
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(
          `${origin}/auth/signin?error=${encodeURIComponent('Failed to confirm email. Please try again.')}`
        )
      }

      if (data?.user) {
        console.log('Email confirmed successfully for user:', data.user.id)
        
        // Check if there's a pending invitation
        const pendingInvitation = request.cookies.get('pendingInvitation')?.value
        
        if (pendingInvitation) {
          try {
            const invitation = JSON.parse(pendingInvitation)
            
            // Clear the cookie
            const response = NextResponse.redirect(`${origin}${next}`)
            response.cookies.delete('pendingInvitation')
            
            // Redirect to invitation acceptance
            return NextResponse.redirect(
              `${origin}/invitations/accept/${invitation.token}?confirmed=true`
            )
          } catch (err) {
            console.error('Error parsing pending invitation:', err)
          }
        }

        // Redirect to the intended page
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(
        `${origin}/auth/signin?error=${encodeURIComponent('Authentication failed. Please try again.')}`
      )
    }
  }

  // If no code is provided, redirect to sign in
  return NextResponse.redirect(
    `${origin}/auth/signin?error=${encodeURIComponent('Invalid authentication request')}`
  )
}