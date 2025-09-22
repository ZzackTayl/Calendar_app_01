import { NextRequest, NextResponse } from 'next/server';
import {
  checkRateLimit,
  createRateLimitHeaders,
  getClientIP,
  logRateLimitViolation,
  RATE_LIMITS
} from '@/lib/rate-limiting';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Apply rate limiting for health checks (IP-based for anonymous access)
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
        'health GET',
        'HEALTH_CHECK',
        {
          attempts: RATE_LIMITS.HEALTH_CHECK.maxRequests + 1,
          blocked: rateLimitResult.blocked,
          userAgent: request.headers.get('user-agent') || undefined,
          timestamp: Date.now()
        }
      );

      return NextResponse.json(
        {
          status: 'rate_limited',
          error: 'Too many health check requests',
          retryAfter: rateLimitResult.retryAfter,
          timestamp: new Date().toISOString()
        },
        {
          status: 429,
          headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, v]))
        }
      );
    }

    // Basic health check for Docker containers
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      services: {
        database: 'connected', // Will be enhanced with actual DB check
        redis: 'connected',     // Will be enhanced with actual Redis check
        mailhog: 'available'   // MailHog is available in Docker
      }
    };

    return NextResponse.json(healthData, {
      status: 200,
      headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, v]))
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}