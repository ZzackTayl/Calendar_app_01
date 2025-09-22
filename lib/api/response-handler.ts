/**
 * Standardized API Response Handler
 * Ensures consistent response formats, error handling, and production-ready messages
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

// Standard response envelope types
export interface ApiSuccessResponse<T = any> {
  ok: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page?: number;
      limit?: number;
      total?: number;
      hasMore?: boolean;
      nextCursor?: string;
      prevCursor?: string;
    };
  };
}

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
    retryAfter?: number;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Error codes enum
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // CSRF
  CSRF_VALIDATION_FAILED = 'CSRF_VALIDATION_FAILED',
  MISSING_CSRF_TOKEN = 'MISSING_CSRF_TOKEN',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  GONE = 'GONE',
  
  // Server Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Business Logic
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_STATE = 'INVALID_STATE',
}

// Production-safe error messages (no sensitive data)
const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.UNAUTHORIZED]: 'Authentication required',
  [ApiErrorCode.FORBIDDEN]: 'Access denied',
  [ApiErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ApiErrorCode.SESSION_EXPIRED]: 'Your session has expired. Please sign in again',
  [ApiErrorCode.EMAIL_NOT_VERIFIED]: 'Please verify your email address',
  [ApiErrorCode.VALIDATION_ERROR]: 'Invalid request data',
  [ApiErrorCode.INVALID_INPUT]: 'The provided input is invalid',
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ApiErrorCode.INVALID_FORMAT]: 'Invalid data format',
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later',
  [ApiErrorCode.TOO_MANY_REQUESTS]: 'Request limit exceeded',
  [ApiErrorCode.CSRF_VALIDATION_FAILED]: 'Security validation failed',
  [ApiErrorCode.MISSING_CSRF_TOKEN]: 'Security token is missing',
  [ApiErrorCode.NOT_FOUND]: 'Resource not found',
  [ApiErrorCode.ALREADY_EXISTS]: 'Resource already exists',
  [ApiErrorCode.CONFLICT]: 'Request conflicts with current state',
  [ApiErrorCode.GONE]: 'Resource is no longer available',
  [ApiErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred',
  [ApiErrorCode.DATABASE_ERROR]: 'Database operation failed',
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service is unavailable',
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: 'Operation not allowed',
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions for this action',
  [ApiErrorCode.QUOTA_EXCEEDED]: 'Quota limit exceeded',
  [ApiErrorCode.INVALID_STATE]: 'Invalid operation for current state',
};

// HTTP status codes mapping
const ERROR_STATUS_CODES: Record<ApiErrorCode, number> = {
  [ApiErrorCode.UNAUTHORIZED]: 401,
  [ApiErrorCode.FORBIDDEN]: 403,
  [ApiErrorCode.INVALID_CREDENTIALS]: 401,
  [ApiErrorCode.SESSION_EXPIRED]: 401,
  [ApiErrorCode.EMAIL_NOT_VERIFIED]: 401,
  [ApiErrorCode.VALIDATION_ERROR]: 400,
  [ApiErrorCode.INVALID_INPUT]: 400,
  [ApiErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ApiErrorCode.INVALID_FORMAT]: 400,
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ApiErrorCode.TOO_MANY_REQUESTS]: 429,
  [ApiErrorCode.CSRF_VALIDATION_FAILED]: 403,
  [ApiErrorCode.MISSING_CSRF_TOKEN]: 403,
  [ApiErrorCode.NOT_FOUND]: 404,
  [ApiErrorCode.ALREADY_EXISTS]: 409,
  [ApiErrorCode.CONFLICT]: 409,
  [ApiErrorCode.GONE]: 410,
  [ApiErrorCode.INTERNAL_ERROR]: 500,
  [ApiErrorCode.DATABASE_ERROR]: 500,
  [ApiErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ApiErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ApiErrorCode.OPERATION_NOT_ALLOWED]: 403,
  [ApiErrorCode.INSUFFICIENT_PERMISSIONS]: 403,
  [ApiErrorCode.QUOTA_EXCEEDED]: 429,
  [ApiErrorCode.INVALID_STATE]: 409,
};

// Response headers configuration
interface ResponseHeaders {
  [key: string]: string;
}

// Main response handler class
export class ApiResponseHandler {
  private requestId: string;
  private headers: ResponseHeaders;

  constructor(requestId?: string) {
    this.requestId = requestId || this.generateRequestId();
    this.headers = {
      'X-Request-Id': this.requestId,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    };
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add custom headers
  public addHeaders(headers: ResponseHeaders): void {
    this.headers = { ...this.headers, ...headers };
  }

  // Success response
  public success<T>(
    data: T,
    options?: {
      status?: number;
      headers?: ResponseHeaders;
      pagination?: {
        page?: number;
        limit?: number;
        total?: number;
        hasMore?: boolean;
        nextCursor?: string;
        prevCursor?: string;
      };
    }
  ): NextResponse<ApiSuccessResponse<T>> {
    const response: ApiSuccessResponse<T> = {
      ok: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.requestId,
      },
    };

    if (options?.pagination) {
      response.meta!.pagination = options.pagination;
    }

    const finalHeaders = {
      ...this.headers,
      ...options?.headers,
    };

    return NextResponse.json(response, {
      status: options?.status || 200,
      headers: finalHeaders,
    });
  }

  // Error response
  public error(
    code: ApiErrorCode,
    options?: {
      message?: string;
      details?: any;
      field?: string;
      status?: number;
      headers?: ResponseHeaders;
      retryAfter?: number;
    }
  ): NextResponse<ApiErrorResponse> {
    const response: ApiErrorResponse = {
      ok: false,
      error: {
        code,
        message: options?.message || ERROR_MESSAGES[code],
        details: options?.details,
        field: options?.field,
        retryAfter: options?.retryAfter,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.requestId,
      },
    };

    // In production, sanitize error details
    if (process.env.NODE_ENV === 'production' && options?.details) {
      // Remove sensitive information from details
      response.error.details = this.sanitizeErrorDetails(options.details);
    }

    const finalHeaders = {
      ...this.headers,
      ...options?.headers,
    };

    return NextResponse.json(response, {
      status: options?.status || ERROR_STATUS_CODES[code] || 500,
      headers: finalHeaders,
    });
  }

  // Handle Zod validation errors
  public validationError(error: ZodError): NextResponse<ApiErrorResponse> {
    const issues = error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return this.error(ApiErrorCode.VALIDATION_ERROR, {
      details: issues,
      message: 'Validation failed',
    });
  }

  // Handle database errors
  public databaseError(error: any): NextResponse<ApiErrorResponse> {
    console.error('Database error:', error);
    
    // Check for common database error patterns
    if (error.code === '23505' || error.message?.includes('duplicate')) {
      return this.error(ApiErrorCode.ALREADY_EXISTS, {
        message: 'Resource already exists',
      });
    }
    
    if (error.code === '23503' || error.message?.includes('foreign key')) {
      return this.error(ApiErrorCode.CONFLICT, {
        message: 'Operation would violate data integrity',
      });
    }
    
    return this.error(ApiErrorCode.DATABASE_ERROR);
  }

  // Handle generic errors
  public handleError(error: any): NextResponse<ApiErrorResponse> {
    // Log error for debugging (in production, use proper logging service)
    console.error('API Error:', error);

    // Handle Zod errors
    if (error instanceof ZodError) {
      return this.validationError(error);
    }

    // Handle known error formats
    if (error.code && ERROR_STATUS_CODES[error.code as ApiErrorCode]) {
      return this.error(error.code as ApiErrorCode, {
        message: error.message,
        details: error.details,
      });
    }

    // Database errors
    if (error.code && typeof error.code === 'string' && error.code.length === 5) {
      return this.databaseError(error);
    }

    // Default to internal error
    return this.error(ApiErrorCode.INTERNAL_ERROR);
  }

  // Sanitize error details for production
  private sanitizeErrorDetails(details: any): any {
    if (typeof details === 'string') {
      // Remove file paths, IP addresses, etc.
      return details
        .replace(/\/[\w\-\/\.]+/g, '[path]')
        .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[ip]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[email]');
    }
    
    if (Array.isArray(details)) {
      return details.map(item => this.sanitizeErrorDetails(item));
    }
    
    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {};
      for (const key in details) {
        // Skip sensitive keys
        if (['password', 'token', 'secret', 'key', 'authorization'].includes(key.toLowerCase())) {
          sanitized[key] = '[redacted]';
        } else {
          sanitized[key] = this.sanitizeErrorDetails(details[key]);
        }
      }
      return sanitized;
    }
    
    return details;
  }

  // Rate limit response
  public rateLimitExceeded(
    retryAfter: number,
    options?: {
      remaining?: number;
      limit?: number;
      reset?: number;
    }
  ): NextResponse<ApiErrorResponse> {
    const headers: ResponseHeaders = {
      'Retry-After': retryAfter.toString(),
    };

    if (options) {
      if (options.remaining !== undefined) {
        headers['X-RateLimit-Remaining'] = options.remaining.toString();
      }
      if (options.limit !== undefined) {
        headers['X-RateLimit-Limit'] = options.limit.toString();
      }
      if (options.reset !== undefined) {
        headers['X-RateLimit-Reset'] = options.reset.toString();
      }
    }

    return this.error(ApiErrorCode.RATE_LIMIT_EXCEEDED, {
      message: `Rate limit exceeded. Please retry after ${retryAfter} seconds`,
      details: { retryAfter },
      headers,
    });
  }

  // CORS preflight response
  public corsPreflightResponse(
    allowedOrigin: string,
    allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: string[] = ['Content-Type', 'Authorization', 'X-CSRF-Token']
  ): NextResponse {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': allowedMethods.join(', '),
        'Access-Control-Allow-Headers': allowedHeaders.join(', '),
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  // Add CORS headers to response
  public addCorsHeaders(
    response: NextResponse,
    origin: string
  ): NextResponse {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
    return response;
  }
}

// Factory function for creating response handler
export function createApiResponse(requestId?: string): ApiResponseHandler {
  return new ApiResponseHandler(requestId);
}

// Middleware for consistent error handling
export async function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
  requestId?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  const api = createApiResponse(requestId);
  
  try {
    return await handler();
  } catch (error) {
    return api.handleError(error);
  }
}

// Export error codes for use in endpoints
export { ApiErrorCode as ErrorCode };