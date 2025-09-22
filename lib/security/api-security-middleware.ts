/**
 * Comprehensive API Security Middleware
 * Implements all critical security controls in a reusable way
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuthentication } from '@/lib/auth/session-manager';
import { validateCSRFProtection } from '@/lib/security/csrf';
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS,
  RateLimitOptions
} from '@/lib/rate-limiting';
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { z } from 'zod';

// Security configuration for different endpoint types
export interface SecurityConfig {
  requireAuth: boolean;
  requireCSRF: boolean;
  requireAdmin?: boolean;
  rateLimit?: RateLimitOptions;
  allowAnonymous?: boolean;
  maxRequestSize?: number;
  validateInput?: z.ZodSchema;
  sanitizeParams?: boolean;
}

// Predefined security configurations
export const SECURITY_CONFIGS = {
  PUBLIC_READ: {
    requireAuth: false,
    requireCSRF: false,
    rateLimit: RATE_LIMITS.HEALTH_CHECK,
    allowAnonymous: true
  } as SecurityConfig,

  AUTH_REQUIRED: {
    requireAuth: true,
    requireCSRF: false,
    rateLimit: RATE_LIMITS.API_CALLS
  } as SecurityConfig,

  PROTECTED_WRITE: {
    requireAuth: true,
    requireCSRF: true,
    rateLimit: RATE_LIMITS.API_CALLS,
    maxRequestSize: 1024 * 1024 // 1MB
  } as SecurityConfig,

  ADMIN_ONLY: {
    requireAuth: true,
    requireCSRF: true,
    requireAdmin: true,
    rateLimit: RATE_LIMITS.API_CALLS
  } as SecurityConfig,

  SENSITIVE_OPERATION: {
    requireAuth: true,
    requireCSRF: true,
    rateLimit: RATE_LIMITS.EVENT_OPERATIONS,
    maxRequestSize: 512 * 1024 // 512KB
  } as SecurityConfig,

  EMAIL_OPERATION: {
    requireAuth: true,
    requireCSRF: true,
    rateLimit: RATE_LIMITS.EMAIL,
    maxRequestSize: 100 * 1024 // 100KB
  } as SecurityConfig,

  BULK_OPERATION: {
    requireAuth: true,
    requireCSRF: true,
    rateLimit: RATE_LIMITS.BULK_OPERATION,
    maxRequestSize: 10 * 1024 * 1024 // 10MB
  } as SecurityConfig,
} as const;

// Security validation result
export interface SecurityValidationResult {
  success: boolean;
  user?: any;
  headers?: Record<string, string>;
  error?: NextResponse;
}

/**
 * Apply comprehensive security checks to an API endpoint
 */
export async function applySecurityMiddleware(
  request: NextRequest,
  config: SecurityConfig,
  params?: Record<string, string>
): Promise<SecurityValidationResult> {
  const api = createApiResponse();
  let user: any = null;
  let headers: Record<string, string> = {};

  try {
    // 1. AUTHENTICATION CHECK
    if (config.requireAuth) {
      const authValidation = await requireAuthentication(request);
      if (!authValidation.valid || !authValidation.user) {
        return {
          success: false,
          error: api.error(ErrorCode.UNAUTHORIZED, {
            message: 'Authentication required',
            details: authValidation.error
          })
        };
      }
      user = authValidation.user;
    }

    // 2. ADMIN PRIVILEGE CHECK
    if (config.requireAdmin && user) {
      const isAdmin = await isAdminUser(user.id);
      if (!isAdmin) {
        return {
          success: false,
          error: api.error(ErrorCode.FORBIDDEN, {
            message: 'Admin privileges required'
          })
        };
      }
    }

    // 3. CSRF PROTECTION CHECK
    if (config.requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      const csrfValidation = await validateCSRFProtection(request);
      if (!csrfValidation.valid) {
        return {
          success: false,
          error: api.error(ErrorCode.FORBIDDEN, {
            message: 'CSRF validation failed',
            details: csrfValidation.error
          })
        };
      }
    }

    // 4. RATE LIMITING CHECK
    if (config.rateLimit) {
      const identifier = user ? user.id : getClientIP(request);
      const isAdmin = user ? await isAdminUser(user.id) : false;
      const rateLimitResult = checkRateLimit(identifier, config.rateLimit, isAdmin);

      headers = {
        ...headers,
        ...createRateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetTime,
          config.rateLimit.maxRequests,
          rateLimitResult.retryAfter,
          rateLimitResult.blocked
        )
      };

      if (rateLimitResult.isLimited) {
        logRateLimitViolation(
          identifier,
          `${request.method} ${request.nextUrl.pathname}`,
          'SECURITY_MIDDLEWARE',
          {
            attempts: config.rateLimit.maxRequests + 1,
            blocked: rateLimitResult.blocked,
            userAgent: request.headers.get('user-agent') || undefined,
            timestamp: Date.now()
          }
        );

        return {
          success: false,
          error: api.error(ErrorCode.TOO_MANY_REQUESTS, {
            message: 'Rate limit exceeded',
            retryAfter: rateLimitResult.retryAfter,
            headers
          })
        };
      }
    }

    // 5. REQUEST SIZE VALIDATION
    if (config.maxRequestSize && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > config.maxRequestSize) {
        return {
          success: false,
          error: api.error(ErrorCode.VALIDATION_ERROR, {
            message: 'Request size exceeds maximum allowed limit'
          })
        };
      }
    }

    // 6. PARAMETER SANITIZATION
    if (config.sanitizeParams && params) {
      for (const [key, value] of Object.entries(params)) {
        if (typeof value === 'string') {
          // Validate UUID format for ID parameters
          if (key.endsWith('id') || key.endsWith('Id')) {
            if (!/^[a-f0-9-]+$/i.test(value)) {
              return {
                success: false,
                error: api.error(ErrorCode.VALIDATION_ERROR, {
                  message: `Invalid ${key} format`,
                  field: key
                })
              };
            }
          }

          // Basic XSS prevention for string parameters
          if (/<script|javascript:|data:/i.test(value)) {
            return {
              success: false,
              error: api.error(ErrorCode.VALIDATION_ERROR, {
                message: `Invalid characters in ${key}`,
                field: key
              })
            };
          }
        }
      }
    }

    // 7. COMMON SECURITY HEADERS
    headers = {
      ...headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Security-Applied': 'true'
    };

    return {
      success: true,
      user,
      headers
    };

  } catch (error) {
    console.error('Security middleware error:', error);
    return {
      success: false,
      error: api.error(ErrorCode.INTERNAL_ERROR, {
        message: 'Security validation failed'
      })
    };
  }
}

/**
 * Higher-order function to wrap API handlers with security middleware
 */
export function withSecurity<T = any>(
  config: SecurityConfig,
  handler: (request: NextRequest, params: T, securityContext: { user?: any; headers: Record<string, string> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, params: T): Promise<NextResponse> => {
    // Extract route parameters for sanitization
    const routeParams = typeof params === 'object' && params !== null ?
      (params as any).params || {} : {};

    const securityResult = await applySecurityMiddleware(request, config, routeParams);

    if (!securityResult.success) {
      return securityResult.error!;
    }

    try {
      return await handler(request, params, {
        user: securityResult.user,
        headers: securityResult.headers || {}
      });
    } catch (error) {
      console.error('API handler error:', error);
      const api = createApiResponse();
      return api.error(ErrorCode.INTERNAL_ERROR);
    }
  };
}

/**
 * Validate request body against schema with security considerations
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>,
  maxSize = 1024 * 1024 // 1MB default
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  const api = createApiResponse();

  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {
        success: false,
        error: api.error(ErrorCode.VALIDATION_ERROR, {
          message: 'Content-Type must be application/json'
        })
      };
    }

    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return {
        success: false,
        error: api.error(ErrorCode.VALIDATION_ERROR, {
          message: 'Request body too large'
        })
      };
    }

    // Parse and validate body
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: api.validationError(result.error)
      };
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: api.error(ErrorCode.VALIDATION_ERROR, {
          message: 'Invalid JSON format'
        })
      };
    }

    console.error('Request body validation error:', error);
    return {
      success: false,
      error: api.error(ErrorCode.INTERNAL_ERROR)
    };
  }
}

/**
 * Create a secure API response with appropriate headers
 */
export function createSecureResponse<T>(
  data: T,
  headers?: Record<string, string>,
  status = 200
): NextResponse {
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    ...headers
  };

  return NextResponse.json(data, {
    status,
    headers: securityHeaders
  });
}

// Export commonly used security configurations
export {
  SECURITY_CONFIGS as SecurityConfigs
};