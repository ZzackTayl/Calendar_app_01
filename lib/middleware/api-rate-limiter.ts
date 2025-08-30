/**
 * API Rate Limiting Middleware
 * Provides comprehensive rate limiting for all API endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS,
  RateLimitOptions 
} from '../rate-limiting'

// Define endpoint-specific rate limit configurations
const ENDPOINT_RATE_LIMITS: Record<string, RateLimitOptions> = {
  // Authentication endpoints (IP-based)
  '/api/auth/signin': RATE_LIMITS.AUTH_ATTEMPTS,
  '/api/auth/signup': {
    ...RATE_LIMITS.AUTH_ATTEMPTS,
    maxRequests: 3, // More restrictive for signup
    keyGenerator: (ip: string) => `signup:${ip}`
  },
  '/api/auth/reset-password': RATE_LIMITS.PASSWORD_RESET,
  '/api/auth/update-password': {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    keyGenerator: (id: string) => `password_update:${id}`,
    adminBypass: false
  },
  
  // Event operations (user-based)
  '/api/events': RATE_LIMITS.EVENT_OPERATIONS,
  '/api/events/parse-natural': {
    ...RATE_LIMITS.EVENT_OPERATIONS,
    maxRequests: 20, // More restrictive for AI parsing
  },
  
  // Account operations (very strict)
  '/api/account/delete': RATE_LIMITS.ACCOUNT_DELETION,
  
  // Calendar integrations (moderate)
  '/api/calendar/google': RATE_LIMITS.API_CALLS,
  '/api/calendar/apple': RATE_LIMITS.API_CALLS,
  
  // General API (user-based)
  '/api/contacts': RATE_LIMITS.API_CALLS,
  '/api/groups': RATE_LIMITS.API_CALLS,
  '/api/templates': RATE_LIMITS.API_CALLS,
  '/api/sharing': RATE_LIMITS.API_CALLS,
  '/api/invitations': RATE_LIMITS.API_CALLS,
}

/**
 * Apply rate limiting to API requests
 * @param request - The incoming request
 * @param pathname - The API endpoint pathname
 * @returns Response if rate limited, null if request should continue
 */
export async function applyAPIRateLimit(
  request: NextRequest, 
  pathname: string
): Promise<NextResponse | null> {
  try {
    // Skip rate limiting for non-API routes
    if (!pathname.startsWith('/api/')) {
      return null
    }
    
    // Skip health check and monitoring endpoints
    if (pathname.includes('/health') || pathname.includes('/monitoring')) {
      return null
    }
    
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Find the most specific rate limit configuration
    let rateLimitConfig: RateLimitOptions | null = null
    let matchedEndpoint = ''
    
    // Check for exact endpoint matches first
    for (const [endpoint, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
      if (pathname === endpoint || pathname.startsWith(endpoint + '/')) {
        rateLimitConfig = config
        matchedEndpoint = endpoint
        break
      }
    }
    
    // Fallback to general API rate limiting if no specific config found
    if (!rateLimitConfig) {
      rateLimitConfig = RATE_LIMITS.API_CALLS_IP // Use IP-based for unauthenticated
      matchedEndpoint = 'general-api'
    }
    
    // Try to get user information for user-based rate limiting
    let user: any = null
    let isAdmin = false
    
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set() {}, // No-op for read-only middleware
            remove() {} // No-op for read-only middleware
          },
        }
      )
      
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        user = authUser
        isAdmin = await isAdminUser(user.id)
      }
    } catch (error) {
      // Continue with IP-based limiting if auth check fails
      console.warn('Failed to check user auth for rate limiting:', error)
    }
    
    // Determine identifier for rate limiting
    const identifier = user?.id || ip
    
    // Apply rate limiting
    const rateLimitResult = checkRateLimit(identifier, rateLimitConfig, isAdmin)
    
    // Create headers
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      rateLimitConfig.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // If rate limited, log and return error
    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        identifier,
        matchedEndpoint,
        'MIDDLEWARE_RATE_LIMIT',
        {
          attempts: rateLimitConfig.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent,
          timestamp: Date.now()
        }
      )
      
      let message = 'Too many requests. Please try again later.'
      if (rateLimitResult.blocked) {
        message = 'Too many violations. Your access has been temporarily blocked.'
      }
      
      return NextResponse.json(
        { 
          error: message,
          retryAfter: rateLimitResult.retryAfter,
          blocked: rateLimitResult.blocked,
          endpoint: matchedEndpoint
        },
        { 
          status: 429,
          headers
        }
      )
    }
    
    // Request is not rate limited, continue processing
    return null
    
  } catch (error) {
    console.error('Rate limiting middleware error:', error)
    // Don't block requests if rate limiting fails
    return null
  }
}

/**
 * Enhanced middleware function that can be used in Next.js middleware
 * This integrates with the existing auth middleware
 */
export function withAPIRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { pathname } = request.nextUrl
    
    // Apply rate limiting
    const rateLimitResponse = await applyAPIRateLimit(request, pathname)
    
    // If rate limited, return the rate limit response
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Otherwise, continue with the original handler
    return handler(request)
  }
}

/**
 * Rate limiting configuration for specific HTTP methods
 */
export const METHOD_RATE_LIMITS: Record<string, Partial<RateLimitOptions>> = {
  'POST': {
    // More restrictive for state-changing operations
    maxRequests: 30 // 30 POST requests per minute
  },
  'PUT': {
    maxRequests: 30
  },
  'PATCH': {
    maxRequests: 30
  },
  'DELETE': {
    maxRequests: 10 // Very restrictive for deletions
  },
  'GET': {
    maxRequests: 100 // More lenient for reads
  }
}