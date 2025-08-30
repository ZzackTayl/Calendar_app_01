import { NextRequest, NextResponse } from 'next/server'
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

// Password update validation schema
const passwordUpdateSchema = z.object({
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
}).refine((data) => {
  // Password strength validation
  const hasUpper = /[A-Z]/.test(data.password)
  const hasLower = /[a-z]/.test(data.password)
  const hasNumber = /\d/.test(data.password)
  const hasSpecial = /[!@#$%^&*(),.?\":{}|<>]/.test(data.password)
  
  return hasUpper && hasLower && hasNumber && hasSpecial
}, {
  message: 'Password must contain uppercase, lowercase, number, and special character',
  path: ['password']
})

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Apply rate limiting for password update attempts
    const rateLimitConfig = {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 password updates per hour per IP
      keyGenerator: (ip: string) => `password_update:${ip}`,
      adminBypass: false // No admin bypass for security
    }
    
    const rateLimitResult = checkRateLimit(ip, rateLimitConfig)
    
    // Create headers for all responses
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      rateLimitConfig.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, return error with headers
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        ip,
        'auth/update-password',
        'PASSWORD_UPDATE',
        {
          attempts: rateLimitConfig.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      return NextResponse.json(
        { 
          error: 'Too many password update attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
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
    const validationResult = passwordUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400, headers }
      )
    }
    
    const { password } = validationResult.data
    
    // Create Supabase client
    const supabase = createRouteHandlerClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers }
      )
    }
    
    // Update the user's password
    const { error } = await supabase.auth.updateUser({
      password
    })
    
    if (error) {
      console.error('Password update error:', error)
      
      // Log failed attempt
      logRateLimitViolation(
        ip,
        'auth/update-password',
        'FAILED_UPDATE',
        {
          attempts: rateLimitConfig.maxRequests - rateLimitResult.remaining + 1,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      let errorMessage = 'Failed to update password'
      if (error.message.includes('Password should be')) {
        errorMessage = 'Password does not meet security requirements'
      } else if (error.message.includes('Auth session missing')) {
        errorMessage = 'Session expired. Please try the password reset process again.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers }
      )
    }
    
    // Success - password updated
    return NextResponse.json(
      { 
        message: 'Password updated successfully',
        success: true
      },
      { status: 200, headers }
    )
    
  } catch (error) {
    console.error('Unexpected error in auth/update-password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}