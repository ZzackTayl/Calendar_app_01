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

// Sign up validation schema
const signUpSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  password: z.string().min(12, 'Password must be at least 12 characters').max(128),
  confirmPassword: z.string(),
  fullName: z.string().min(1, 'Full name is required').max(100)
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
    
    // Apply IP-based rate limiting for signup attempts (more restrictive)
    const rateLimitConfig = {
      ...RATE_LIMITS.AUTH_ATTEMPTS,
      maxRequests: 3, // Only 3 signups per 15 minutes per IP
      keyGenerator: (ip: string) => `signup:${ip}`
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
        'auth/signup',
        'SIGNUP_ATTEMPTS',
        {
          attempts: rateLimitConfig.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      const message = rateLimitResult.blocked 
        ? 'Too many signup attempts. Your IP has been temporarily blocked.'
        : 'Too many signup attempts. Please try again later.'
      
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
    const validationResult = signUpSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.issues
        },
        { status: 400, headers }
      )
    }
    
    const { email, password, fullName } = validationResult.data
    
    // Create Supabase client
    const supabase = createRouteHandlerClient()
    
    // Note: We cannot check if user exists beforehand as auth.users is not accessible
    // Supabase will handle duplicate email validation
    
    // Attempt user registration
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim()
        },
        emailRedirectTo: `${request.nextUrl.origin}/auth/callback`
      }
    })
    
    if (error) {
      console.error('Signup error:', error)
      
      // Handle specific error cases
      if (error.message.includes('User already registered') || error.message.includes('already exists')) {
        // Special handling for existing users - check if they're unconfirmed
        // Since we can't directly check user status, provide helpful guidance
        return NextResponse.json(
          { 
            error: 'EXISTING_USER',
            message: 'An account with this email already exists',
            isExistingUser: true,
            needsEmailConfirmation: true,
            email: email.trim().toLowerCase(),
            helpMessage: 'If you haven\'t confirmed your email yet, you can resend the confirmation email below.'
          },
          { status: 409, headers } // Use 409 Conflict for existing user
        )
      }
      
      // Log failed attempt for other errors
      logRateLimitViolation(
        ip,
        'auth/signup',
        'FAILED_SIGNUP',
        {
          attempts: rateLimitConfig.maxRequests - rateLimitResult.remaining + 1,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      let errorMessage = 'Registration failed'
      if (error.message.includes('Password should be')) {
        errorMessage = 'Password does not meet security requirements'
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please provide a valid email address'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400, headers }
      )
    }
    
    // Success response
    return NextResponse.json(
      { 
        message: 'Registration successful. Please check your email to confirm your account.',
        user: {
          id: data.user?.id,
          email: data.user?.email,
          user_metadata: data.user?.user_metadata
        },
        emailConfirmationRequired: true
      },
      { status: 201, headers }
    )
    
  } catch (error) {
    console.error('Unexpected error in auth/signup:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}