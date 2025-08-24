/**
 * Rate limiting utilities for API endpoints
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (identifier: string) => string // Custom key generator
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param options - Rate limiting configuration
 * @returns Object with isLimited flag and remaining info
 */
export function checkRateLimit(
  identifier: string, 
  options: RateLimitOptions
): {
  isLimited: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
} {
  const key = options.keyGenerator ? options.keyGenerator(identifier) : identifier
  const now = Date.now()
  
  // Clean up expired entries
  for (const [entryKey, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(entryKey)
    }
  }
  
  let entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + options.windowMs
    }
    rateLimitStore.set(key, entry)
    
    return {
      isLimited: false,
      remaining: options.maxRequests - 1,
      resetTime: entry.resetTime
    }
  }
  
  if (entry.count >= options.maxRequests) {
    // Rate limit exceeded
    return {
      isLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000) // seconds
    }
  }
  
  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    isLimited: false,
    remaining: options.maxRequests - entry.count,
    resetTime: entry.resetTime
  }
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const RATE_LIMITS = {
  // Very strict - for sensitive operations like account deletion
  ACCOUNT_DELETION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // Only 3 attempts per hour
    keyGenerator: (userId: string) => `account_deletion:${userId}`
  } as RateLimitOptions,
  
  // Strict - for authentication attempts
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (identifier: string) => `auth:${identifier}`
  } as RateLimitOptions,
  
  // Moderate - for API calls
  API_CALLS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (userId: string) => `api:${userId}`
  } as RateLimitOptions,
  
  // Lenient - for general operations
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 requests per minute
    keyGenerator: (identifier: string) => `general:${identifier}`
  } as RateLimitOptions
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  maxRequests: number,
  retryAfter?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  }
  
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString()
  }
  
  return headers
}