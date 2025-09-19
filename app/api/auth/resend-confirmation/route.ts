import { createSupabaseClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { shouldAutoStartService } from '@/lib/runtime-flags'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 5 * 60 * 1000 // 5 minutes
const MAX_ATTEMPTS = 3
const MIN_DELAY_BETWEEN_REQUESTS = 60 * 1000 // 1 minute minimum

// In-memory rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, {
  attempts: number
  firstAttempt: number
  lastAttempt: number
  windowStart: number
}>()

// Clean up old entries periodically when not running build lifecycle
if (shouldAutoStartService()) {
  setInterval(() => {
    const now = Date.now()
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.windowStart > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(key)
      }
    }
  }, RATE_LIMIT_WINDOW)
}

function getRateLimitKey(email: string, ip: string): string {
  // Use both email and IP to prevent abuse
  return `resend:${email}:${ip}`
}

function calculateWaitTime(attempts: number, lastAttempt: number): number {
  const now = Date.now()
  const timeSinceLastAttempt = now - lastAttempt
  
  // Exponential backoff: 60s, 120s, 300s (5 minutes max)
  const baseDelay = Math.min(60 * Math.pow(2, attempts - 1), 300) * 1000
  const remainingDelay = Math.max(0, baseDelay - timeSinceLastAttempt)
  
  return Math.ceil(remainingDelay / 1000)
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();
  try {
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const clientIP = forwardedFor?.split(',')[0] || realIP || 'unknown'
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { email } = body

    // Validate email
    if (!email || typeof email !== 'string' || !validateEmail(email)) {
      return api.success(
        { 
          message: 'Valid email address is required',
          error: 'INVALID_EMAIL'
        },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.trim().toLowerCase()
    const rateLimitKey = getRateLimitKey(normalizedEmail, clientIP)
    
    // Check rate limiting
    const now = Date.now()
    const existingData = rateLimitStore.get(rateLimitKey)
    
    if (existingData) {
      const { attempts, windowStart, lastAttempt } = existingData
      
      // Reset if window has expired
      if (now - windowStart > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(rateLimitKey)
      } else {
        // Check if max attempts exceeded
        if (attempts >= MAX_ATTEMPTS) {
          const windowTimeLeft = Math.ceil((RATE_LIMIT_WINDOW - (now - windowStart)) / 1000)
          return api.success(
            {
              message: `Too many confirmation email requests. Please wait ${Math.ceil(windowTimeLeft / 60)} minutes before trying again.`,
              error: 'RATE_LIMIT_EXCEEDED',
              waitTime: windowTimeLeft,
              attempts,
              maxAttempts: MAX_ATTEMPTS
            },
            { status: 429 }
          )
        }
        
        // Check minimum delay between requests
        const waitTime = calculateWaitTime(attempts, lastAttempt)
        if (waitTime > 0) {
          return api.success(
            {
              message: `Please wait ${waitTime} seconds before requesting another confirmation email.`,
              error: 'RATE_LIMITED',
              waitTime,
              attempts,
              maxAttempts: MAX_ATTEMPTS
            },
            { status: 429 }
          )
        }
      }
    }

    // Verify user session (optional - allows both authenticated and unauthenticated requests)
    const supabase = createSupabaseClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // If user is authenticated, verify the email matches
    if (user && user.email !== normalizedEmail) {
      return api.success(
        { 
          message: 'Email does not match authenticated user',
          error: 'EMAIL_MISMATCH'
        },
        { status: 403 }
      )
    }
    
    // If user is authenticated and already verified, return early
    if (user && user.email_confirmed_at) {
      return api.success(
        { 
          message: 'Email is already verified',
          error: 'ALREADY_VERIFIED'
        },
        { status: 400 }
      )
    }

    // Attempt to resend confirmation email
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`
      }
    })

    if (resendError) {
      console.error('Supabase resend error:', resendError)
      
      // Handle specific Supabase errors
      if (resendError.message.includes('rate limit')) {
        return api.success(
          {
            message: 'Rate limit exceeded. Please wait before trying again.',
            error: 'SUPABASE_RATE_LIMITED'
          },
          { status: 429 }
        )
      }
      
      if (resendError.message.includes('not found') || resendError.message.includes('invalid')) {
        return api.success(
          {
            message: 'Email address not found. Please sign up first.',
            error: 'EMAIL_NOT_FOUND'
          },
          { status: 404 }
        )
      }
      
      return api.success(
        {
          message: 'Failed to send confirmation email. Please try again later.',
          error: 'RESEND_FAILED'
        },
        { status: 500 }
      )
    }

    // Update rate limiting data
    const currentData = rateLimitStore.get(rateLimitKey)
    const newAttempts = (currentData?.attempts || 0) + 1
    
    rateLimitStore.set(rateLimitKey, {
      attempts: newAttempts,
      firstAttempt: currentData?.firstAttempt || now,
      lastAttempt: now,
      windowStart: currentData?.windowStart || now
    })

    return api.success(
      {
        message: 'Confirmation email sent successfully. Please check your inbox and spam folder.',
        success: true,
        attempts: newAttempts,
        maxAttempts: MAX_ATTEMPTS
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error in resend-confirmation:', error)
    
    return api.success(
      {
        message: 'Internal server error. Please try again later.',
        error: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
export async function GET() {
  const api = createApiResponse();
  return api.error(ErrorCode.VALIDATION_ERROR, {
    message: 'Method not allowed. Use POST instead.'
  });
}

export async function PUT() {
  const api = createApiResponse();
  return api.error(ErrorCode.VALIDATION_ERROR, {
    message: 'Method not allowed. Use POST instead.'
  });
}

export async function DELETE() {
  const api = createApiResponse();
  return api.error(ErrorCode.VALIDATION_ERROR, {
    message: 'Method not allowed. Use POST instead.'
  });
}
