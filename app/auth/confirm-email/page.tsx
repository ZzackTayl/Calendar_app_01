'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter, useSearchParams } from 'next/navigation'

interface RateLimitState {
  canResend: boolean
  waitTime: number
  attempts: number
  maxAttempts: number
}

function ConfirmEmailContent() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    canResend: true,
    waitTime: 0,
    attempts: 0,
    maxAttempts: 3
  })
  const [autoResendEmail, setAutoResendEmail] = useState<string | null>(null)

  // Handle auto-resend on mount
  useEffect(() => {
    const isAuto = searchParams?.get('auto') === '1'
    const pendingEmail = localStorage.getItem('pendingEmailForVerification')
    const autoResendSuccess = localStorage.getItem('autoResendSuccess') === 'true'
    
    if (isAuto && pendingEmail) {
      setAutoResendEmail(pendingEmail)
      
      // Show success message if auto-resend worked
      if (autoResendSuccess) {
        setMessage({
          type: 'success',
          text: 'We\'ve resent your confirmation email. Please check your inbox and spam folder.'
        })
        localStorage.removeItem('autoResendSuccess')
      } else {
        setMessage({
          type: 'error',
          text: 'We tried to resend your confirmation email but it may have been too soon. Please try again shortly.'
        })
      }
      
      // Clear the stored email
      localStorage.removeItem('pendingEmailForVerification')
    }
    
    // Initialize rate limit state from localStorage
    const stored = localStorage.getItem('email_resend_state')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const now = Date.now()
        
        // Check if rate limit has expired (5 minutes)
        if (now - parsed.timestamp > 5 * 60 * 1000) {
          // Reset rate limit
          localStorage.removeItem('email_resend_state')
          setRateLimitState({
            canResend: true,
            waitTime: 0,
            attempts: 0,
            maxAttempts: 3
          })
        } else {
          const timeLeft = Math.max(0, Math.ceil((parsed.nextAllowedAt - now) / 1000))
          setRateLimitState({
            canResend: timeLeft === 0 && parsed.attempts < parsed.maxAttempts,
            waitTime: timeLeft,
            attempts: parsed.attempts,
            maxAttempts: parsed.maxAttempts
          })
        }
      } catch (error) {
        console.error('Error parsing stored rate limit state:', error)
        localStorage.removeItem('email_resend_state')
      }
    }
  }, [searchParams])

  // No countdown timer - just track if rate limited

  // Redirect authenticated users with verified emails
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      router.push('/dashboard')
    }
  }, [user, router])

  const resendConfirmation = useCallback(async () => {
    const emailToUse = autoResendEmail || user?.email
    if (!emailToUse || !rateLimitState.canResend) return

    setIsResending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setMessage({
            type: 'error',
            text: 'Please try again shortly. We limit how often you can resend to prevent abuse.'
          })
          
          // Update rate limit state - no countdown
          setRateLimitState({
            canResend: false,
            waitTime: 0,
            attempts: data.attempts || rateLimitState.attempts + 1,
            maxAttempts: data.maxAttempts || 3
          })
          
          // Store in localStorage for persistence
          localStorage.setItem('email_resend_state', JSON.stringify({
            canResend: false,
            attempts: data.attempts || rateLimitState.attempts + 1,
            maxAttempts: data.maxAttempts || 3,
            timestamp: Date.now(),
            nextAllowedAt: Date.now() + ((data.waitTime || 60) * 1000)
          }))
        } else {
          setMessage({
            type: 'error',
            text: data.message || 'Failed to resend confirmation email. Please try again.'
          })
        }
        return
      }

      // Success
      setMessage({
        type: 'success',
        text: 'Confirmation email sent! Please check your inbox and spam folder.'
      })

      // Update rate limit state
      const newAttempts = rateLimitState.attempts + 1
      
      setRateLimitState({
        canResend: false,
        waitTime: 0,
        attempts: newAttempts,
        maxAttempts: 3
      })

      // Store in localStorage
      const waitTime = Math.min(60 * Math.pow(2, newAttempts - 1), 300) // Exponential backoff for storage
      localStorage.setItem('email_resend_state', JSON.stringify({
        canResend: false,
        attempts: newAttempts,
        maxAttempts: 3,
        timestamp: Date.now(),
        nextAllowedAt: Date.now() + (waitTime * 1000)
      }))

      // After resend, clear auto-resend email if present
      if (autoResendEmail) {
        setAutoResendEmail(null)
      }

    } catch (error) {
      console.error('Error resending confirmation:', error)
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      })
    } finally {
      setIsResending(false)
    }
  }, [user?.email, autoResendEmail, rateLimitState.canResend, rateLimitState.attempts])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  if (!user && !autoResendEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Access Required
            </CardTitle>
            <CardDescription>
              Please sign in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push('/auth/signin')}
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Confirm Your Email</CardTitle>
          <CardDescription>
            We&apos;ve sent a confirmation link to <strong>{autoResendEmail || user?.email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Click the confirmation link in your email to verify your account and access all features.
            </AlertDescription>
          </Alert>

          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              Didn&apos;t receive the email? Check your spam folder or request a new one.
            </p>
            
            {rateLimitState.attempts >= rateLimitState.maxAttempts ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Maximum resend attempts reached. Please wait a few minutes before trying again or contact support if you continue having issues.
                </AlertDescription>
              </Alert>
            ) : !rateLimitState.canResend ? (
              !message && (
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Please try again shortly. We limit how often you can resend to prevent abuse.
                  </AlertDescription>
                </Alert>
              )
            ) : (
              <Button
                variant="outline"
                className="w-full"
                disabled={isResending}
                onClick={resendConfirmation}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Confirmation Email'
                )}
              </Button>
            )}
            
            {rateLimitState.attempts > 0 && (
              <p className="text-xs text-gray-500 text-center">
                Attempts: {rateLimitState.attempts}/{rateLimitState.maxAttempts}
              </p>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={handleSignOut}
            >
              Sign out and use different email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <ConfirmEmailContent />
    </Suspense>
  )
}
