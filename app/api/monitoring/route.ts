import { NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { productionMonitoring } from '@/lib/monitoring/production-monitoring';
import { getEnvironmentConfig } from '@/lib/config/env-validation';
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  isAdminUser,
  RATE_LIMITS
} from '@/lib/rate-limiting'
import { NextRequest } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Production Monitoring Dashboard API
 * Provides real-time monitoring data for operational dashboards
 * SECURITY: Requires admin authentication and rate limiting
 */

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'status';
    const config = getEnvironmentConfig();
    const ip = getClientIP(request);

    // SECURITY: Require authentication for all monitoring endpoints
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required for monitoring endpoints',
        details: authValidation.error
      });
    }

    const user = authValidation.user;

    // SECURITY: Verify admin privileges for monitoring access
    const isAdmin = await isAdminUser(user.id);
    if (!isAdmin) {
      return api.error(ErrorCode.FORBIDDEN, {
        message: 'Admin privileges required for monitoring access'
      });
    }

    // Apply rate limiting for monitoring endpoints
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'monitoring GET',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Rate limit exceeded for monitoring endpoints',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    // Validate and sanitize the type parameter
    const allowedTypes = ['status', 'dashboard', 'health'];
    const sanitizedType = allowedTypes.includes(type) ? type : 'status';

    switch (sanitizedType) {
      case 'status':
        return api.success(productionMonitoring.getStatus(), { headers });

      case 'dashboard':
        return api.success(productionMonitoring.getDashboardData(), { headers });

      case 'health':
        // Redirect to health check endpoint
        return NextResponse.redirect(new URL('/api/health', request.url));

      default:
        return api.error(ErrorCode.VALIDATION_ERROR, {
          message: 'Invalid monitoring type requested'
        });
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-error', error, 'error');

    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    // SECURITY: Require authentication for all monitoring POST operations
    const authValidation = await requireAuthentication(request);
    if (!authValidation.valid || !authValidation.user) {
      return api.error(ErrorCode.UNAUTHORIZED, {
        message: 'Authentication required for monitoring operations',
        details: authValidation.error
      });
    }

    const user = authValidation.user;

    // SECURITY: Verify admin privileges for monitoring operations
    const isAdmin = await isAdminUser(user.id);
    if (!isAdmin) {
      return api.error(ErrorCode.FORBIDDEN, {
        message: 'Admin privileges required for monitoring operations'
      });
    }

    // SECURITY: Validate CSRF protection for state-changing operations
    const csrfValidation = await validateCSRFProtection(request);
    if (!csrfValidation.valid) {
      return api.error(ErrorCode.FORBIDDEN, {
        message: 'CSRF validation failed',
        details: csrfValidation.error
      });
    }

    // Apply rate limiting for monitoring POST operations
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.API_CALLS, isAdmin);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.API_CALLS.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        user.id,
        'monitoring POST',
        'API_CALLS',
        {
          attempts: RATE_LIMITS.API_CALLS.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Rate limit exceeded for monitoring operations',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    // Validate and sanitize the action parameter
    const allowedActions = ['acknowledge-alert', 'resolve-alert', 'log-error', 'track-request'];
    if (!action || !allowedActions.includes(action)) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'Invalid or missing action parameter',
        details: { allowedActions }
      });
    }

    switch (action) {
      case 'acknowledge-alert':
        if (!body.alertId || typeof body.alertId !== 'string') {
          return api.error(ErrorCode.VALIDATION_ERROR, {
            message: 'Valid alertId is required'
          });
        }

        // Sanitize alertId to prevent injection attacks
        const sanitizedAlertId = body.alertId.replace(/[^a-zA-Z0-9-_]/g, '');
        const acknowledged = productionMonitoring.acknowledgeAlert(sanitizedAlertId);
        return api.success({ success: acknowledged }, { headers });

      case 'resolve-alert':
        if (!body.alertId || typeof body.alertId !== 'string') {
          return api.error(ErrorCode.VALIDATION_ERROR, {
            message: 'Valid alertId is required'
          });
        }

        // Sanitize alertId to prevent injection attacks
        const sanitizedResolveId = body.alertId.replace(/[^a-zA-Z0-9-_]/g, '');
        const resolved = productionMonitoring.resolveAlert(sanitizedResolveId);
        return api.success({ success: resolved }, { headers });

      case 'log-error':
        if (!body.type || !body.message || typeof body.type !== 'string' || typeof body.message !== 'string') {
          return api.error(ErrorCode.VALIDATION_ERROR, {
            message: 'Valid type and message are required'
          });
        }

        // Sanitize and limit input to prevent abuse
        const sanitizedType = body.type.replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 100);
        const sanitizedMessage = body.message.substring(0, 1000); // Limit message length
        const allowedLevels = ['error', 'warn', 'info', 'debug'];
        const sanitizedLevel = allowedLevels.includes(body.level) ? body.level : 'error';

        productionMonitoring.logError(
          sanitizedType,
          new Error(sanitizedMessage),
          sanitizedLevel,
          body.context
        );

        return api.success({ success: true }, { headers });

      case 'track-request':
        if (!body.endpoint || typeof body.responseTime !== 'number' || typeof body.endpoint !== 'string') {
          return api.error(ErrorCode.VALIDATION_ERROR, {
            message: 'Valid endpoint and responseTime are required'
          });
        }

        // Sanitize endpoint and validate response time
        const sanitizedEndpoint = body.endpoint.replace(/[^a-zA-Z0-9\/\-_\.]/g, '').substring(0, 200);
        const validatedResponseTime = Math.max(0, Math.min(body.responseTime, 300000)); // Cap at 5 minutes

        productionMonitoring.trackRequest(sanitizedEndpoint, validatedResponseTime);
        return api.success({ success: true }, { headers });

      default:
        return api.error(ErrorCode.VALIDATION_ERROR, {
          message: 'Unknown action'
        });
    }
  } catch (error) {
    productionMonitoring.logError('monitoring-api-post-error', error, 'error');
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}