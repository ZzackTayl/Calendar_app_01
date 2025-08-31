'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'

interface RateLimitState {
  canResend: boolean
  waitTime: number
  attempts: number
  maxAttempts: number
}

export default function ConfirmEmailPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rateLimitState, setRateLimitState] = useState<RateLimitState>({
    canResend: true,
    waitTime: 0,
    attempts: 0,
    maxAttempts: 3
  })

  // Initialize rate limit state from localStorage
  useEffect(() => {
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
  }, [])

  // Countdown timer
  useEffect(() => {
    if (rateLimitState.waitTime > 0) {
      const timer = setInterval(() => {
        setRateLimitState(prev => {
          const newWaitTime = prev.waitTime - 1
          const newState = {
            ...prev,
            waitTime: newWaitTime,
            canResend: newWaitTime === 0 && prev.attempts < prev.maxAttempts
          }
          return newState
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [rateLimitState.waitTime])

  // Redirect authenticated users with verified emails
  useEffect(() => {
    if (user && user.email_confirmed_at) {
      router.push('/dashboard')
    }
  }, [user, router])

  const resendConfirmation = useCallback(async () => {
    if (!user?.email || !rateLimitState.canResend) return

    setIsResending(true)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setMessage({
            type: 'error',
            text: data.message || 'Too many requests. Please wait before trying again.'
          })
          
          // Update rate limit state from server response
          if (data.waitTime) {
            const newState = {
              canResend: false,
              waitTime: data.waitTime,
              attempts: data.attempts || rateLimitState.attempts + 1,
              maxAttempts: data.maxAttempts || 3
            }
            setRateLimitState(newState)
            
            // Store in localStorage
            localStorage.setItem('email_resend_state', JSON.stringify({
              ...newState,
              timestamp: Date.now(),
              nextAllowedAt: Date.now() + (data.waitTime * 1000)
            }))
          }
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
      const waitTime = Math.min(60 * Math.pow(2, newAttempts - 1), 300) // Exponential backoff, max 5 minutes
      
      const newState = {
        canResend: false,
        waitTime,
        attempts: newAttempts,
        maxAttempts: 3
      }
      setRateLimitState(newState)

      // Store in localStorage
      localStorage.setItem('email_resend_state', JSON.stringify({
        ...newState,
        timestamp: Date.now(),
        nextAllowedAt: Date.now() + (waitTime * 1000)
      }))

    } catch (error) {
      console.error('Error resending confirmation:', error)
      setMessage({
        type: 'error',
        text: 'Network error. Please check your connection and try again.'
      })
    } finally {
      setIsResending(false)
    }
  }, [user?.email, rateLimitState.canResend, rateLimitState.attempts])

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/signin')
  }

  if (!user) {
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

  const formatWaitTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`
    }
    return `${remainingSeconds}s`
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
            We&apos;ve sent a confirmation link to <strong>{user.email}</strong>
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
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Maximum resend attempts reached. Please wait 5 minutes before trying again or contact support if you continue having issues.
                </AlertDescription>
              </Alert>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                disabled={!rateLimitState.canResend || isResending}
                onClick={resendConfirmation}
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : rateLimitState.waitTime > 0 ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Resend in {formatWaitTime(rateLimitState.waitTime)}
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