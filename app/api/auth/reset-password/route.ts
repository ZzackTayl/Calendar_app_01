import { NextRequest, NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  RATE_LIMITS 
} from '@/lib/rate-limiting'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Password reset validation schema
const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address').max(254)
})

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Apply IP-based rate limiting for password reset attempts
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS.PASSWORD_RESET)
    
    // Create headers for all responses
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.PASSWORD_RESET.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error with headers
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        ip,
        'auth/reset-password',
        'PASSWORD_RESET',
        {
          attempts: RATE_LIMITS.PASSWORD_RESET.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      const message = rateLimitResult.blocked 
        ? 'Too many password reset attempts. Your IP has been temporarily blocked.'
        : 'Too many password reset attempts. Please try again later.'
      
      return api.success(
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
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    // Validate input data
    const validationResult = passwordResetSchema.safeParse(body)
    if (!validationResult.success) {
      return api.error(ErrorCode.VALIDATION_ERROR)
    }
    
    const { email } = validationResult.data
    
    // Create Supabase client
    const supabase = createRouteHandlerClient()
    
    // Generate the redirect URL for password reset
    const resetUrl = new URL('/auth/update-password', request.url)
    
    // Attempt password reset
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: resetUrl.toString()
      }
    )
    
    if (error) {
      console.error('Password reset error:', error)
      
      // Log failed attempt
      logRateLimitViolation(
        ip,
        'auth/reset-password',
        'FAILED_RESET',
        {
          attempts: RATE_LIMITS.PASSWORD_RESET.maxRequests - rateLimitResult.remaining + 1,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      // Always return success message to prevent email enumeration
      // This is a security best practice
      return api.success(
        { 
          message: 'If an account with that email exists, we have sent a password reset link.',
          success: true
        },
        { status: 200, headers }
      )
    }
    
    // Always return success message to prevent email enumeration
    return api.success(
      { 
        message: 'If an account with that email exists, we have sent a password reset link.',
        success: true
      },
      { status: 200, headers }
    )
    
  } catch (error) {
    console.error('Unexpected error in auth/reset-password:', error)
    
    // Even on server error, don't reveal if email exists
    return api.success(
      { 
        message: 'If an account with that email exists, we have sent a password reset link.',
        success: true
      },
      { status: 200 }
    )
  }
}