/**
 * Secure Route Wrapper
 *
 * Universal security wrapper for all API routes to ensure consistent cross-user isolation.
 * This wrapper should be applied to ALL route handlers to prevent security vulnerabilities.
 *
 * SECURITY FEATURES:
 * 1. Standardized authentication and authorization
 * 2. Automatic user context validation
 * 3. CSRF protection for state-changing operations
 * 4. Rate limiting integration
 * 5. Audit logging for security events
 * 6. Error handling with security-first approach
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  validateUserIsolation,
  validateResourceOwnership,
  validateGroupPermission,
  validateUuidParams,
  createIsolationErrorResponse,
  RouteSecurityConfig,
  IsolationValidationResult
} from '@/lib/security/cross-user-isolation-middleware';
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS
} from '@/lib/rate-limiting';

export interface SecureRouteContext {
  userContext: any;
  supabase: any;
  isolationService: any;
  request: NextRequest;
  params?: Record<string, any>;
}

export interface SecureRouteOptions extends RouteSecurityConfig {
  rateLimitType?: keyof typeof RATE_LIMITS;
  validateParams?: string[]; // UUID parameters to validate
  requiredResourceAccess?: {
    type: 'event' | 'relationship' | 'user' | 'group';
    idParam: string;
    permission: 'read' | 'write' | 'delete';
  };
  requiredGroupAccess?: {
    idParam: string;
    role: 'member' | 'admin' | 'creator' | 'can_invite' | 'can_remove';
  };
}

type RouteHandler = (context: SecureRouteContext) => Promise<NextResponse>;

/**
 * Creates a secure wrapper for API route handlers
 *
 * @param handler - The route handler function
 * @param options - Security configuration options
 * @returns Wrapped route handler with security controls
 */
export function createSecureRoute(
  handler: RouteHandler,
  options: SecureRouteOptions = {
    requiresAuth: true,
    requiresCSRF: true,
    requiredPermissions: ['read'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE']
  }
) {
  return async (request: NextRequest, routeParams?: { params: Record<string, any> }) => {
    const startTime = Date.now();
    let validationResult: IsolationValidationResult | null = null;

    try {
      // Step 1: Validate user isolation and authentication
      const isolationResult = await validateUserIsolation(request, options);
      validationResult = isolationResult;

      if (!isolationResult.success) {
        return createIsolationErrorResponse(
          isolationResult.error || 'Security validation failed',
          isolationResult.statusCode || 403
        );
      }

      const { userContext, supabase, isolationService } = isolationResult;

      // Step 2: Rate limiting (if enabled and user authenticated)
      if (options.rateLimitType && userContext) {
        const isAdmin = await isAdminUser(userContext.userId);
        const rateLimitConfig = RATE_LIMITS[options.rateLimitType];
        const rateLimitResult = checkRateLimit(userContext.userId, rateLimitConfig, isAdmin);

        const headers = createRateLimitHeaders(
          rateLimitResult.remaining,
          rateLimitResult.resetTime,
          rateLimitConfig.maxRequests,
          rateLimitResult.retryAfter,
          rateLimitResult.blocked
        );

        if (rateLimitResult.isLimited) {
          logRateLimitViolation(
            userContext.userId,
            `${request.method} ${request.url}`,
            options.rateLimitType,
            {
              attempts: rateLimitConfig.maxRequests + 1,
              blocked: rateLimitResult.blocked,
              userAgent: request.headers.get('user-agent') || undefined,
              timestamp: Date.now()
            }
          );

          return NextResponse.json(
            {
              error: 'Rate limit exceeded. Please slow down your requests.',
              retryAfter: rateLimitResult.retryAfter
            },
            {
              status: 429,
              headers
            }
          );
        }
      }

      // Step 3: Parameter validation (UUID format checking)
      const params = routeParams?.params || {};
      if (options.validateParams && options.validateParams.length > 0) {
        const paramSubset: Record<string, any> = {};
        for (const paramName of options.validateParams) {
          if (params[paramName]) {
            paramSubset[paramName] = params[paramName];
          }
        }

        const paramValidation = validateUuidParams(paramSubset);
        if (!paramValidation.valid) {
          return createIsolationErrorResponse(
            paramValidation.error || 'Invalid parameters',
            400
          );
        }
      }

      // Step 4: Resource ownership validation (if required)
      if (options.requiredResourceAccess && userContext && isolationService) {
        const { type, idParam, permission } = options.requiredResourceAccess;
        const resourceId = params[idParam];

        if (!resourceId) {
          return createIsolationErrorResponse(
            `Missing required parameter: ${idParam}`,
            400
          );
        }

        const ownershipValidation = await validateResourceOwnership(
          isolationService,
          userContext,
          type,
          resourceId,
          permission
        );

        if (!ownershipValidation.allowed) {
          return createIsolationErrorResponse(
            `Access denied: ${ownershipValidation.reason}`,
            ownershipValidation.statusCode || 403
          );
        }
      }

      // Step 5: Group permission validation (if required)
      if (options.requiredGroupAccess && userContext && isolationService) {
        const { idParam, role } = options.requiredGroupAccess;
        const groupId = params[idParam];

        if (!groupId) {
          return createIsolationErrorResponse(
            `Missing required parameter: ${idParam}`,
            400
          );
        }

        const groupValidation = await validateGroupPermission(
          isolationService,
          userContext,
          groupId,
          role
        );

        if (!groupValidation.allowed) {
          return createIsolationErrorResponse(
            `Group access denied: ${groupValidation.reason}`,
            groupValidation.statusCode || 403
          );
        }
      }

      // Step 6: Create secure context and call handler
      const context: SecureRouteContext = {
        userContext,
        supabase,
        isolationService,
        request,
        params
      };

      const response = await handler(context);

      // Step 7: Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('X-Security-Validation', 'passed');
      response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);

      return response;

    } catch (error) {
      console.error('Security wrapper error:', error);

      // Log security error for monitoring
      if (validationResult?.userContext) {
        await logSecurityError(
          validationResult.userContext.userId,
          request.method,
          request.url,
          error instanceof Error ? error.message : String(error)
        );
      }

      // Fail secure - never expose internal errors
      return createIsolationErrorResponse(
        'Internal security error - access denied',
        500
      );
    }
  };
}

/**
 * Specialized wrapper for event-related routes
 */
export function createSecureEventRoute(
  handler: RouteHandler,
  permission: 'read' | 'write' | 'delete' = 'read',
  additionalOptions: Partial<SecureRouteOptions> = {}
) {
  return createSecureRoute(handler, {
    requiresAuth: true,
    requiresCSRF: permission !== 'read',
    requiredPermissions: [permission],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    rateLimitType: permission === 'read' ? 'API_CALLS' : 'EVENT_OPERATIONS',
    validateParams: ['eventId', 'id'],
    requiredResourceAccess: {
      type: 'event',
      idParam: 'eventId',
      permission
    },
    ...additionalOptions
  });
}

/**
 * Specialized wrapper for group-related routes
 */
export function createSecureGroupRoute(
  handler: RouteHandler,
  requiredRole: 'member' | 'admin' | 'creator' | 'can_invite' | 'can_remove' = 'member',
  additionalOptions: Partial<SecureRouteOptions> = {}
) {
  return createSecureRoute(handler, {
    requiresAuth: true,
    requiresCSRF: true,
    requiredPermissions: ['write'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    rateLimitType: 'API_CALLS',
    validateParams: ['groupId'],
    requiredGroupAccess: {
      idParam: 'groupId',
      role: requiredRole
    },
    ...additionalOptions
  });
}

/**
 * Specialized wrapper for relationship-related routes
 */
export function createSecureRelationshipRoute(
  handler: RouteHandler,
  permission: 'read' | 'write' | 'delete' = 'read',
  additionalOptions: Partial<SecureRouteOptions> = {}
) {
  return createSecureRoute(handler, {
    requiresAuth: true,
    requiresCSRF: permission !== 'read',
    requiredPermissions: [permission],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    rateLimitType: 'API_CALLS',
    validateParams: ['relationshipId', 'id'],
    requiredResourceAccess: {
      type: 'relationship',
      idParam: 'relationshipId',
      permission
    },
    ...additionalOptions
  });
}

/**
 * Logs security errors for monitoring and incident response
 */
async function logSecurityError(
  userId: string,
  method: string,
  url: string,
  errorMessage: string
): Promise<void> {
  try {
    // This would integrate with your monitoring system
    console.error('Security Error:', {
      userId,
      method,
      url,
      error: errorMessage,
      timestamp: new Date().toISOString(),
      severity: 'HIGH'
    });

    // TODO: Integrate with external monitoring service
    // await monitoringService.logSecurityIncident({...});

  } catch (logError) {
    console.error('Failed to log security error:', logError);
  }
}

/**
 * Example usage patterns for different route types
 */

// Basic secure route
// export const GET = createSecureRoute(async (context) => {
//   // Your route logic here with guaranteed user isolation
//   return NextResponse.json({ data: 'secure' });
// });

// Event route with write access
// export const PUT = createSecureEventRoute(async (context) => {
//   const { userContext, supabase, params } = context;
//   // Event is already validated to belong to the user
//   return NextResponse.json({ updated: true });
// }, 'write');

// Group route requiring admin role
// export const DELETE = createSecureGroupRoute(async (context) => {
//   const { userContext, supabase, params } = context;
//   // User is already validated to be an admin of this group
//   return NextResponse.json({ deleted: true });
// }, 'admin');
