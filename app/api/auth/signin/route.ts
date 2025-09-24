import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { 
  checkRateLimit, 
  getClientIP, 
  logRateLimitViolation,
  handleAuthFailure,
  clearAuthFailure,
  RATE_LIMITS 
} from '@/lib/rate-limiting'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Sign in validation schema
const signInSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required')
})

export async function POST(request: NextRequest) {
  const api = createApiResponse()
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // Apply IP-based rate limiting for authentication attempts
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS.AUTH_ATTEMPTS)
    
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
      
      return api.rateLimitExceeded(
        rateLimitResult.retryAfter || 60,
        {
          remaining: rateLimitResult.remaining,
          limit: RATE_LIMITS.AUTH_ATTEMPTS.maxRequests,
          reset: rateLimitResult.resetTime
        }
      )
    }
    
    // Parse and validate request body
    let body
    try {
      body = await request.json()
    } catch (error) {
      return api.error(ErrorCode.INVALID_INPUT, {
        message: 'Invalid JSON in request body'
      })
    }
    
    // Validate input data
    const validationResult = signInSchema.safeParse(body)
    if (!validationResult.success) {
      return api.validationError(validationResult.error)
    }
    
    const { email, password } = validationResult.data
    
    // Handle progressive delays for failed attempts
    const authFailure = handleAuthFailure(ip)
    if (authFailure.shouldDelay) {
      api.addHeaders({
        'X-Auth-Delay': authFailure.delaySeconds.toString(),
        'X-Auth-Attempts': authFailure.attempts.toString()
      })
      
      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: `Too many failed attempts. Please wait ${authFailure.delaySeconds} seconds before trying again.`,
        details: {
          delaySeconds: authFailure.delaySeconds,
          attempts: authFailure.attempts
        }
      })
    }
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient()
    
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
      
      // SECURITY: Use generic error message to prevent user enumeration
      // Do not reveal whether email exists or if it's confirmed
      let errorCode = ErrorCode.INVALID_CREDENTIALS
      let errorMessage = 'Invalid email or password. If you recently signed up, check your inbox to confirm your account.'
      
      // Only show specific messages for rate limiting (security information)
      if (error.message.includes('Too many requests')) {
        errorCode = ErrorCode.TOO_MANY_REQUESTS
        errorMessage = 'Too many login attempts. Please try again later.'
      }
      
      return api.error(errorCode, { message: errorMessage })
    }
    // CRITICAL SECURITY CHECK: Verify email confirmation status
    if (data.user && !data.user.email_confirmed_at) {
      console.warn('Security: Blocking sign-in for unverified user:', data.user.email)
      
      // Sign out the user immediately to clear any session
      await supabase.auth.signOut()
      
      // Log security event
      logRateLimitViolation(
        ip,
        'auth/signin',
        'UNVERIFIED_LOGIN_ATTEMPT',
        {
          attempts: 1,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      // Use generic message to prevent user enumeration
      return api.error(ErrorCode.EMAIL_NOT_VERIFIED, {
        message: 'Invalid email or password. If you recently signed up, check your inbox to confirm your account.'
      })
    }
    
    // Success - clear any failure records
    clearAuthFailure(ip)
    
    // SECURITY: Do not expose tokens in JSON response - rely on secure HttpOnly cookies only
    return api.success({
      message: 'Authentication successful',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        email_confirmed: !!data.user?.email_confirmed_at
      }
      // Tokens are handled via secure HttpOnly cookies by Supabase Auth
      // Never expose access_token or refresh_token in JSON response
    })
  } catch (error) {
    console.error('Unexpected error in auth/signin:', error)
    return api.handleError(error)
  }
}
