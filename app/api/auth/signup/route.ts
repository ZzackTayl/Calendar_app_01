import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { 
  checkRateLimit, 
  getClientIP, 
  logRateLimitViolation,
  RATE_LIMITS 
} from '@/lib/rate-limiting'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler'

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
  const api = createApiResponse()
  const ip = getClientIP(request)
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    // Apply IP-based rate limiting for signup attempts (more restrictive)
    const rateLimitConfig = {
      ...RATE_LIMITS.AUTH_ATTEMPTS,
      maxRequests: 3, // Only 3 signups per 15 minutes per IP
      keyGenerator: (ip: string) => `signup:${ip}`
    }
    
    const rateLimitResult = checkRateLimit(ip, rateLimitConfig)
    
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
      
      return api.rateLimitExceeded(
        rateLimitResult.retryAfter || 60,
        {
          remaining: rateLimitResult.remaining,
          limit: rateLimitConfig.maxRequests,
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
    const validationResult = signUpSchema.safeParse(body)
    if (!validationResult.success) {
      return api.validationError(validationResult.error)
    }
    
    const { email, password, fullName } = validationResult.data
    
    // Create Supabase client
    const supabase = await createRouteHandlerClient()
    
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
        // Special handling for existing users
        return api.error(ErrorCode.ALREADY_EXISTS, {
          message: 'An account with this email already exists',
          details: {
            isExistingUser: true,
            needsEmailConfirmation: true,
            email: email.trim().toLowerCase(),
            helpMessage: 'If you haven\'t confirmed your email yet, you can resend the confirmation email below.'
          }
        })
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
      
      let errorCode = ErrorCode.VALIDATION_ERROR
      let errorMessage = 'Registration failed'
      
      if (error.message.includes('Password should be')) {
        errorMessage = 'Password does not meet security requirements'
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'Please provide a valid email address'
      }
      
      return api.error(errorCode, { message: errorMessage })
    }
    
    // Success response
    return api.success({
      message: 'Registration successful. Please check your email to confirm your account.',
      user: {
        id: data.user?.id,
        email: data.user?.email,
        user_metadata: data.user?.user_metadata
      },
      emailConfirmationRequired: true
    }, { status: 201 })
    
  } catch (error) {
    console.error('Unexpected error in auth/signup:', error)
    return api.handleError(error)
  }
}
