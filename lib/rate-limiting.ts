/**
 * Rate limiting utilities for API endpoints with enhanced features
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  violations: number // Track consecutive violations
  lastViolation?: number // Track last violation time
  blocked?: boolean // Indicates if IP/user is temporarily blocked
  blockUntil?: number // When the block expires
}

interface ProgressiveDelay {
  attempts: number
  delay: number // delay in seconds
}

// In-memory store for rate limiting (in production, use Redis or similar)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Store for tracking failed authentication attempts with progressive delays
const authFailureStore = new Map<string, ProgressiveDelay>()

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (identifier: string) => string // Custom key generator
  enableProgressive?: boolean // Enable progressive delays for auth failures
  blockDuration?: number // Duration to block after repeated violations (ms)
  skipSuccessfulAuth?: boolean // Skip rate limiting for successful auth
  adminBypass?: boolean // Allow admin bypass
}

/**
 * Check if a request should be rate limited with enhanced features
 * @param identifier - Unique identifier (usually user ID or IP)
 * @param options - Rate limiting configuration
 * @param isAdmin - Whether the user has admin privileges
 * @returns Object with isLimited flag and remaining info
 */
export function checkRateLimit(
  identifier: string, 
  options: RateLimitOptions,
  isAdmin: boolean = false
): {
  isLimited: boolean
  remaining: number
  resetTime: number
  retryAfter?: number
  blocked?: boolean
  progressiveDelay?: number
} {
  // Admin bypass
  if (isAdmin && options.adminBypass) {
    return {
      isLimited: false,
      remaining: options.maxRequests,
      resetTime: Date.now() + options.windowMs
    }
  }

  const key = options.keyGenerator ? options.keyGenerator(identifier) : identifier
  const now = Date.now()
  
  // Clean up expired entries
  cleanupExpiredEntries()
  
  let entry = rateLimitStore.get(key)
  
  // Check if currently blocked
  if (entry?.blocked && entry.blockUntil && now < entry.blockUntil) {
    return {
      isLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
      blocked: true
    }
  }
  
  // Clear block if expired
  if (entry?.blocked && entry.blockUntil && now >= entry.blockUntil) {
    entry.blocked = false
    entry.blockUntil = undefined
    entry.violations = 0
    rateLimitStore.set(key, entry)
  }
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    entry = {
      count: 1,
      resetTime: now + options.windowMs,
      violations: entry?.violations || 0
    }
    rateLimitStore.set(key, entry)
    
    return {
      isLimited: false,
      remaining: options.maxRequests - 1,
      resetTime: entry.resetTime
    }
  }
  
  if (entry.count >= options.maxRequests) {
    // Rate limit exceeded - increase violation count
    entry.violations = (entry.violations || 0) + 1
    entry.lastViolation = now
    
    // Progressive blocking for repeated violations
    if (options.blockDuration && entry.violations >= 3) {
      const blockMultiplier = Math.min(entry.violations - 2, 5) // Max 5x multiplier
      entry.blocked = true
      entry.blockUntil = now + (options.blockDuration * blockMultiplier)
      rateLimitStore.set(key, entry)
      
      return {
        isLimited: true,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockUntil - now) / 1000),
        blocked: true
      }
    }
    
    rateLimitStore.set(key, entry)
    
    return {
      isLimited: true,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
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
 * Handle authentication failure with progressive delays
 * @param identifier - Unique identifier (IP or user)
 * @param maxAttempts - Maximum attempts before progressive delay kicks in
 * @returns Object with delay information
 */
export function handleAuthFailure(
  identifier: string,
  maxAttempts: number = 3
): {
  shouldDelay: boolean
  delaySeconds: number
  attempts: number
} {
  const now = Date.now()
  const key = `auth_failure:${identifier}`
  
  let failure = authFailureStore.get(key)
  
  if (!failure) {
    failure = { attempts: 1, delay: 0 }
  } else {
    failure.attempts++
  }
  
  // Progressive delay calculation: 2^(attempts-maxAttempts) seconds, max 300s (5 min)
  if (failure.attempts > maxAttempts) {
    const exponent = Math.min(failure.attempts - maxAttempts, 8) // Max 2^8 = 256 seconds
    failure.delay = Math.min(Math.pow(2, exponent), 300)
  }
  
  authFailureStore.set(key, failure)
  
  // Clean up after 1 hour
  setTimeout(() => {
    authFailureStore.delete(key)
  }, 60 * 60 * 1000)
  
  return {
    shouldDelay: failure.delay > 0,
    delaySeconds: failure.delay,
    attempts: failure.attempts
  }
}

/**
 * Clear authentication failure record (call on successful auth)
 * @param identifier - Unique identifier to clear
 */
export function clearAuthFailure(identifier: string): void {
  const key = `auth_failure:${identifier}`
  authFailureStore.delete(key)
  
  // Also reset violations in rate limit store
  const rateLimitKey = `auth:${identifier}`
  const entry = rateLimitStore.get(rateLimitKey)
  if (entry) {
    entry.violations = 0
    entry.lastViolation = undefined
    rateLimitStore.set(rateLimitKey, entry)
  }
}

/**
 * Clean up expired entries from stores
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime && (!entry.blockUntil || now > entry.blockUntil)) {
      rateLimitStore.delete(key)
    }
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
    keyGenerator: (userId: string) => `account_deletion:${userId}`,
    blockDuration: 60 * 60 * 1000, // 1 hour block
    adminBypass: true
  } as RateLimitOptions,
  
  // Strict - for authentication attempts (login/signup)
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (identifier: string) => `auth:${identifier}`,
    enableProgressive: true,
    blockDuration: 30 * 60 * 1000, // 30 min progressive block
    skipSuccessfulAuth: true,
    adminBypass: false // No admin bypass for security
  } as RateLimitOptions,
  
  // For password reset attempts (IP-based)
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3, // 3 attempts per hour
    keyGenerator: (ip: string) => `password_reset:${ip}`,
    blockDuration: 60 * 60 * 1000, // 1 hour block
    adminBypass: true
  } as RateLimitOptions,
  
  // For email verification requests
  EMAIL_VERIFICATION: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5, // 5 attempts per hour
    keyGenerator: (identifier: string) => `email_verify:${identifier}`,
    blockDuration: 30 * 60 * 1000, // 30 min block
    adminBypass: true
  } as RateLimitOptions,
  
  // For event creation/modification
  EVENT_OPERATIONS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 events per minute
    keyGenerator: (userId: string) => `events:${userId}`,
    adminBypass: true
  } as RateLimitOptions,
  
  // For API calls (user-based)
  API_CALLS: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (userId: string) => `api:${userId}`,
    adminBypass: true
  } as RateLimitOptions,
  
  // For anonymous/IP-based API calls
  API_CALLS_IP: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50, // 50 requests per minute per IP
    keyGenerator: (ip: string) => `api_ip:${ip}`,
    blockDuration: 5 * 60 * 1000, // 5 min block for violations
    adminBypass: false
  } as RateLimitOptions,
  
  // Lenient - for general operations
  GENERAL: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 300, // 300 requests per minute
    keyGenerator: (identifier: string) => `general:${identifier}`,
    adminBypass: true
  } as RateLimitOptions
}

/**
 * Create rate limit headers for HTTP response
 */
export function createRateLimitHeaders(
  remaining: number,
  resetTime: number,
  maxRequests: number,
  retryAfter?: number,
  blocked?: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    'X-RateLimit-Policy': 'sliding-window'
  }
  
  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString()
  }
  
  if (blocked) {
    headers['X-RateLimit-Blocked'] = 'true'
  }
  
  return headers
}

/**
 * Get client IP address from request
 * @param request - Next.js request object
 * @returns IP address string
 */
export function getClientIP(request: any): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfIP) {
    return cfIP
  }
  
  // Fallback to connection remote address
  return request.ip || '127.0.0.1'
}

/**
 * Log rate limit violation for monitoring
 * @param identifier - User ID or IP
 * @param endpoint - API endpoint
 * @param rateLimitType - Type of rate limit
 * @param violation - Violation details
 */
export function logRateLimitViolation(
  identifier: string,
  endpoint: string,
  rateLimitType: string,
  violation: {
    attempts: number,
    blocked?: boolean,
    userAgent?: string,
    timestamp: number
  }
): void {
  // Use the enhanced monitoring service
  try {
    const { recordViolation } = require('./monitoring/rate-limit-monitor')
    recordViolation(identifier, endpoint, rateLimitType, violation)
  } catch (error) {
    console.error('Failed to record violation in monitoring service:', error)
  }
  
  // Also log to console for immediate visibility
  const logData = {
    type: 'rate_limit_violation',
    identifier: identifier.replace(/[^\w:.-]/g, ''), // Sanitize for logging
    endpoint: endpoint.replace(/[^\w\/-]/g, ''), // Sanitize endpoint
    rateLimitType,
    attempts: violation.attempts,
    blocked: violation.blocked || false,
    userAgent: violation.userAgent?.slice(0, 200), // Limit length
    timestamp: new Date(violation.timestamp).toISOString()
  }
  
  if (violation.blocked) {
    console.error('Rate limit violation (BLOCKED):', JSON.stringify(logData))
  } else {
    console.warn('Rate limit violation:', JSON.stringify(logData))
  }
}

/**
 * Check if user has admin role
 * @param userId - User ID to check
 * @returns boolean indicating admin status
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  try {
    // Import here to avoid circular dependencies
    const { createSupabaseClient } = await import('./supabase/server')
    const supabase = createSupabaseClient()
    
    // Check if user has admin role in the users table
    const { data: user, error } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.warn('Failed to check admin status for user:', userId, error.message)
      return false
    }
    
    // Check for admin role
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      return true
    }
    
    // Fallback: check for specific admin emails (hardcoded for emergency access)
    const adminEmails = [
      'admin@polyharmony.app',
      'support@polyharmony.app'
    ]
    
    if (user?.email && adminEmails.includes(user.email.toLowerCase())) {
      return true
    }
    
    return false
    
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}