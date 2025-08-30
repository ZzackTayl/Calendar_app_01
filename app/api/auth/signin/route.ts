import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  handleAuthFailure,
  clearAuthFailure,
  RATE_LIMITS 
} from '@/lib/rate-limiting'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Sign in validation schema
const signInSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Apply IP-based rate limiting for authentication attempts
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS.AUTH_ATTEMPTS)
    
    // Create headers for all responses
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.AUTH_ATTEMPTS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error with headers
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        ip,
        'auth/signin',
        'AUTH_ATTEMPTS',
        {
          attempts: RATE_LIMITS.AUTH_ATTEMPTS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      const message = rateLimitResult.blocked 
        ? 'Too many failed login attempts. Your IP has been temporarily blocked.'
        : 'Too many login attempts. Please try again later.'
      
      return NextResponse.json(
        { 
          error: message,
          retryAfter: rateLimitResult.retryAfter,
          blocked: rateLimitResult.blocked
        },
        { 
          status: 429,
          headers
        }
      )
    }
    
    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers }
      )
    }
    
    // Validate input data
    const validationResult = signInSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400, headers }
      )
    }
    
    const { email, password } = validationResult.data
    
    // Handle progressive delays for failed attempts
    const authFailure = handleAuthFailure(ip)
    if (authFailure.shouldDelay) {
      // Add progressive delay headers
      const delayHeaders = {
        ...headers,
        'X-Auth-Delay': authFailure.delaySeconds.toString(),
        'X-Auth-Attempts': authFailure.attempts.toString()
      }
      
      return NextResponse.json(
        { 
          error: `Too many failed attempts. Please wait ${authFailure.delaySeconds} seconds before trying again.`,
          delaySeconds: authFailure.delaySeconds,
          attempts: authFailure.attempts
        },
        { 
          status: 429,
          headers: delayHeaders
        }
      )
    }
    
    // Create Supabase client
    const supabase = createRouteHandlerClient()
    
    // Attempt authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    })
    
    if (error) {
      console.error('Authentication error:', error)
      
      // Log failed attempt
      logRateLimitViolation(
        ip,
        'auth/signin',
        'FAILED_AUTH',
        {
          attempts: authFailure.attempts + 1,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      // Handle specific error cases
      let errorMessage = 'Authentication failed'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link'
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please try again later.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401, headers }
      )
    }
    
    // Success - clear any failure records
    clearAuthFailure(ip)
    
    return NextResponse.json(
      { 
        message: 'Authentication successful',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          user_metadata: data.user?.user_metadata
        },
        session: {
          access_token: data.session?.access_token,
          refresh_token: data.session?.refresh_token,
          expires_at: data.session?.expires_at
        }
      },
      { status: 200, headers }
    )
    
  } catch (error) {
    console.error('Unexpected error in auth/signin:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}