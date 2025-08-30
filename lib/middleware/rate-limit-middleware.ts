/**
 * Rate limiting middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  checkRateLimit, 
  createRateLimitHeaders, 
  getClientIP, 
  logRateLimitViolation,
  isAdminUser,
  RateLimitOptions 
} from '../rate-limiting'

export interface RateLimitMiddlewareOptions extends RateLimitOptions {
  message?: string // Custom error message
  skipOnSuccess?: boolean // Skip rate limiting on successful operations
  identifierType?: 'ip' | 'user' | 'both' // How to identify clients
  endpoint?: string // Endpoint name for logging
}

/**
 * Create a rate limiting middleware function
 * @param options - Rate limiting configuration
 * @returns Middleware function that can be used in API routes
 */
export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    context: { 
      user?: { id: string, role?: string }, 
      ip?: string 
    } = {}
  ): Promise<NextResponse | null> {
    try {
      const ip = context.ip || getClientIP(request)
      const userId = context.user?.id
      const userRole = context.user?.role
      
      // Determine identifier based on configuration
      let identifier: string
      switch (options.identifierType || 'user') {
        case 'ip':
          identifier = ip
          break
        case 'user':
          identifier = userId || ip // Fallback to IP if no user
          break
        case 'both':
          identifier = userId ? `${userId}:${ip}` : ip
          break
        default:
          identifier = userId || ip
      }
      
      // Check if user is admin (for bypass)
      const isAdmin = userId ? await isAdminUser(userId) : false
      
      // Check rate limit
      const rateLimitResult = checkRateLimit(identifier, options, isAdmin)
      
      // Create headers for response
      const headers = createRateLimitHeaders(
        rateLimitResult.remaining,
        rateLimitResult.resetTime,
        options.maxRequests,
        rateLimitResult.retryAfter,
        rateLimitResult.blocked
      )
      
      // If rate limited, log violation and return error
      if (rateLimitResult.isLimited) {
        logRateLimitViolation(
          identifier,
          options.endpoint || 'unknown',
          'standard',
          {
            attempts: rateLimitResult.remaining === 0 ? options.maxRequests + 1 : options.maxRequests,
            blocked: rateLimitResult.blocked,
            userAgent: request.headers.get('user-agent') || undefined,
            timestamp: Date.now()
          }
        )
        
        const errorMessage = options.message || 'Too many requests. Please try again later.'
        const statusCode = rateLimitResult.blocked ? 429 : 429 // Use 429 for both
        
        return NextResponse.json(
          { 
            error: errorMessage,
            retryAfter: rateLimitResult.retryAfter,
            blocked: rateLimitResult.blocked
          },
          { 
            status: statusCode,
            headers
          }
        )
      }
      
      // Rate limit passed - return null to continue processing
      // The calling function should add the headers to the response
      return null
    } catch (error) {
      console.error('Rate limit middleware error:', error)
      // Don't block requests if rate limiting fails
      return null
    }
  }
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * @param handler - Original API route handler
 * @param options - Rate limiting options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  options: RateLimitMiddlewareOptions
) {
  return async function wrappedHandler(
    request: NextRequest, 
    ...args: T
  ): Promise<NextResponse> {
    // Create the middleware
    const middleware = createRateLimitMiddleware(options)
    
    // Extract user info if available (this would typically come from auth middleware)
    let context: { user?: { id: string, role?: string }, ip?: string } = {
      ip: getClientIP(request)
    }
    
    // Try to get user from auth header or context
    try {
      // This would typically be done by auth middleware
      // For now, we'll check if there's user info in the request
      const authHeader = request.headers.get('authorization')
      if (authHeader) {
        // Extract user info from auth context
        // This is a placeholder - implement based on your auth system
      }
    } catch (error) {
      // Continue without user context
    }
    
    // Run rate limiting
    const rateLimitResponse = await middleware(request, context)
    
    // If rate limited, return the rate limit response
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    // Otherwise, run the original handler
    const response = await handler(request, ...args)
    
    // Add rate limit headers to successful responses
    const rateLimitResult = checkRateLimit(
      context.user?.id || context.ip!,
      options,
      context.user ? await isAdminUser(context.user.id) : false
    )
    
    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      options.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    )
    
    // Add headers to response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

/**
 * Authentication-specific rate limiting middleware
 * Includes progressive delays and IP-based tracking
 */
export function createAuthRateLimitMiddleware(
  endpoint: string,
  options: Partial<RateLimitMiddlewareOptions> = {}
) {
  const defaultOptions: RateLimitMiddlewareOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
    identifierType: 'ip', // Use IP for auth attempts
    endpoint,
    message: 'Too many authentication attempts. Please try again later.',
    enableProgressive: true,
    blockDuration: 30 * 60 * 1000, // 30 minute progressive blocks
    ...options
  }
  
  return createRateLimitMiddleware(defaultOptions)
}

/**
 * API-specific rate limiting middleware
 * User-based with higher limits
 */
export function createAPIRateLimitMiddleware(
  endpoint: string,
  options: Partial<RateLimitMiddlewareOptions> = {}
) {
  const defaultOptions: RateLimitMiddlewareOptions = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    identifierType: 'user', // Use user ID for API calls
    endpoint,
    message: 'API rate limit exceeded. Please slow down your requests.',
    adminBypass: true,
    ...options
  }
  
  return createRateLimitMiddleware(defaultOptions)
}

/**
 * Event operation specific rate limiting
 * Moderate limits for event creation/modification
 */
export function createEventRateLimitMiddleware(
  options: Partial<RateLimitMiddlewareOptions> = {}
) {
  const defaultOptions: RateLimitMiddlewareOptions = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 events per minute
    identifierType: 'user',
    endpoint: 'events',
    message: 'Too many event operations. Please slow down.',
    adminBypass: true,
    ...options
  }
  
  return createRateLimitMiddleware(defaultOptions)
}