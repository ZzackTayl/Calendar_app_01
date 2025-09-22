import { NextResponse } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  RATE_LIMITS
} from '@/lib/rate-limiting';
import { NextRequest } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    // SECURITY: Apply rate limiting for ping endpoint (IP-based for anonymous access)
    const ip = getClientIP(request);
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS.HEALTH_CHECK, false);

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.HEALTH_CHECK.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    if (rateLimitResult.isLimited) {
      logRateLimitViolation(
        ip,
        'ping GET',
        'HEALTH_CHECK',
        {
          attempts: RATE_LIMITS.HEALTH_CHECK.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return api.error(ErrorCode.TOO_MANY_REQUESTS, {
        message: 'Too many ping requests',
        retryAfter: rateLimitResult.retryAfter,
        headers
      });
    }

    return api.success(
      { status: 'ok', timestamp: new Date().toISOString() },
      { headers }
    );
  } catch (error) {
    console.error('Error in ping endpoint:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

export async function HEAD(request: NextRequest) {
  try {
    // SECURITY: Apply rate limiting for HEAD requests too
    const ip = getClientIP(request);
    const rateLimitResult = checkRateLimit(ip, RATE_LIMITS.HEALTH_CHECK, false);

    if (rateLimitResult.isLimited) {
      return new NextResponse(null, { status: 429 });
    }

    const headers = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.HEALTH_CHECK.maxRequests,
      rateLimitResult.retryAfter,
      rateLimitResult.blocked
    );

    return new NextResponse(null, {
      status: 200,
      headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, v]))
    });
  } catch (error) {
    console.error('Error in ping HEAD endpoint:', error);
    return new NextResponse(null, { status: 500 });
  }
}
