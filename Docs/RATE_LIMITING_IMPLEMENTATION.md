# Comprehensive Rate Limiting Implementation

This document describes the comprehensive rate limiting system implemented for the PolyHarmony Calendar application.

## Overview

The rate limiting system provides multi-layered protection against abuse, DDoS attacks, and unauthorized access attempts. It includes:

- IP-based and user-based rate limiting
- Progressive delays for authentication failures
- Admin bypass mechanisms
- Comprehensive monitoring and logging
- Configurable limits per endpoint type

## Core Components

### 1. Rate Limiting Engine (`lib/rate-limiting.ts`)

The main rate limiting engine provides:
- Sliding window rate limiting algorithm
- In-memory storage (production-ready for Redis migration)
- Progressive blocking for repeated violations
- Authentication failure handling with exponential backoff

#### Key Features:
- **Progressive Delays**: Failed authentication attempts trigger increasing delays
- **Adaptive Blocking**: Repeated violations result in temporary IP/user blocks
- **Admin Bypass**: Administrators can bypass rate limits when configured
- **Cleanup Mechanisms**: Automatic cleanup of expired entries

### 2. Rate Limiting Middleware (`lib/middleware/rate-limit-middleware.ts`)

Provides higher-order functions and middleware for easy integration:
- `withRateLimit()`: Wrap any API handler with rate limiting
- `createAuthRateLimitMiddleware()`: Specialized auth rate limiting
- `createAPIRateLimitMiddleware()`: General API rate limiting
- `createEventRateLimitMiddleware()`: Event-specific rate limiting

### 3. API-Level Rate Limiter (`lib/middleware/api-rate-limiter.ts`)

Comprehensive middleware for all API endpoints:
- Automatic endpoint detection and configuration
- Method-specific rate limits (POST more restrictive than GET)
- User authentication integration
- Fallback to IP-based limiting for unauthenticated requests

### 4. Monitoring System (`lib/monitoring/rate-limit-monitor.ts`)

Advanced monitoring and alerting:
- Violation tracking and history
- Real-time metrics and analytics
- High-risk identifier detection
- Data export capabilities (JSON/CSV)
- Configurable alerting thresholds

## Rate Limit Configurations

### Authentication Endpoints (IP-based)

```typescript
AUTH_ATTEMPTS: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,            // 5 attempts per window
  enableProgressive: true,   // Progressive delays
  blockDuration: 30 * 60 * 1000 // 30 min blocks
}
```

### Password Reset (IP-based)

```typescript
PASSWORD_RESET: {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // 3 attempts per hour
  blockDuration: 60 * 60 * 1000 // 1 hour block
}
```

### Event Operations (User-based)

```typescript
EVENT_OPERATIONS: {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 30,      // 30 events per minute
  adminBypass: true     // Admin bypass enabled
}
```

### General API Calls (User-based)

```typescript
API_CALLS: {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 100,     // 100 requests per minute
  adminBypass: true     // Admin bypass enabled
}
```

### Account Deletion (Very Strict)

```typescript
ACCOUNT_DELETION: {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,           // Only 3 attempts per hour
  blockDuration: 60 * 60 * 1000, // 1 hour block
  adminBypass: true         // Admin bypass enabled
}
```

## Implementation Examples

### 1. Basic API Route Protection

```typescript
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limiting'

export const GET = withRateLimit(
  async (request: NextRequest) => {
    // Your API logic here
  },
  RATE_LIMITS.API_CALLS
)
```

### 2. Custom Rate Limiting

```typescript
import { checkRateLimit, createRateLimitHeaders } from '@/lib/rate-limiting'

export async function POST(request: NextRequest) {
  const user = await getUser(request)
  const rateLimitResult = checkRateLimit(user.id, {
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (userId) => `custom:${userId}`
  })
  
  if (rateLimitResult.isLimited) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { 
        status: 429, 
        headers: createRateLimitHeaders(...) 
      }
    )
  }
  
  // Continue with request processing
}
```

### 3. Progressive Authentication Delays

```typescript
import { handleAuthFailure, clearAuthFailure } from '@/lib/rate-limiting'

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  
  // Check for progressive delay
  const authFailure = handleAuthFailure(ip)
  if (authFailure.shouldDelay) {
    return NextResponse.json(
      { error: `Please wait ${authFailure.delaySeconds} seconds` },
      { status: 429 }
    )
  }
  
  // Attempt authentication
  const authResult = await authenticate(email, password)
  
  if (authResult.success) {
    // Clear failure record on success
    clearAuthFailure(ip)
    return NextResponse.json({ success: true })
  } else {
    // Failure is automatically tracked
    return NextResponse.json({ error: 'Invalid credentials' })
  }
}
```

## Implemented Endpoints

### Authentication Endpoints
- `POST /api/auth/signin` - IP-based with progressive delays
- `POST /api/auth/signup` - IP-based, more restrictive (3/15min)
- `POST /api/auth/reset-password` - IP-based (3/hour)
- `POST /api/auth/update-password` - User-based (5/hour)

### API Endpoints
- `GET/POST /api/events` - User-based with event-specific limits
- `GET/POST /api/contacts` - User-based general API limits
- `POST /api/account/delete` - Very strict limits (3/hour)
- `GET /api/monitoring/rate-limits` - Admin-only monitoring

## Monitoring and Analytics

### Monitoring Dashboard API

Access monitoring data via `/api/monitoring/rate-limits`:

```bash
# Get metrics for the last hour
GET /api/monitoring/rate-limits?action=metrics&timeWindow=3600000

# Get violations for specific identifier
GET /api/monitoring/rate-limits?action=violations&identifier=user123

# Export violation data as CSV
GET /api/monitoring/rate-limits?action=export&format=csv
```

### Response Includes:
- Total violations count
- Unique IPs and users
- Top violating endpoints
- Top violating identifiers
- Recent violation history

### High-Risk Detection

The system automatically identifies high-risk identifiers based on:
- Violation frequency (≥10 in time window)
- Block frequency (≥2 blocks in time window)
- Pattern analysis

## HTTP Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1640995200
X-RateLimit-Policy: sliding-window
Retry-After: 30 (when rate limited)
X-RateLimit-Blocked: true (when blocked)
```

## Admin Features

### Admin Bypass
- Administrators automatically bypass most rate limits
- Controlled via `adminBypass` configuration option
- Emergency access via hardcoded admin emails

### Admin Detection
Admins are identified by:
1. `role` field in users table (`admin` or `super_admin`)
2. Hardcoded admin email addresses (emergency access)

## Production Considerations

### 1. Redis Migration
For production, replace the in-memory store with Redis:

```typescript
// Replace Map-based storage with Redis
const rateLimitStore = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
})
```

### 2. Monitoring Integration
Integrate with your monitoring stack:

```typescript
function triggerAlert(alertType, data) {
  // Send to DataDog, New Relic, etc.
  monitoringService.sendMetric('rate_limit_alert', data)
  
  // Send Slack/email notifications
  notificationService.sendAlert(alertType, data)
}
```

### 3. Database Logging
Store violations in database for long-term analysis:

```typescript
async function recordViolation(violation) {
  await supabase
    .from('rate_limit_violations')
    .insert(violation)
}
```

## Security Features

### 1. Input Sanitization
All identifiers and endpoints are sanitized before logging to prevent injection attacks.

### 2. Memory Protection
Automatic cleanup prevents memory leaks from accumulated violation records.

### 3. Progressive Blocking
Repeated violations result in increasingly longer blocks, deterring persistent attackers.

### 4. Monitoring and Alerting
Real-time detection of attack patterns with configurable alerting thresholds.

## Configuration

Rate limits can be adjusted in `lib/rate-limiting.ts`:

```typescript
export const RATE_LIMITS = {
  AUTH_ATTEMPTS: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    // ... other options
  }
  // Modify as needed for your use case
}
```

## Testing

The rate limiting system can be tested using:

```bash
# Test authentication rate limiting
for i in {1..10}; do
  curl -X POST /api/auth/signin -d '{"email":"test@example.com","password":"wrong"}'
done

# Test API rate limiting
for i in {1..150}; do
  curl -H "Authorization: Bearer $TOKEN" /api/events
done
```

## Troubleshooting

### Common Issues

1. **Rate limits too strict**: Adjust `maxRequests` in configuration
2. **Admin bypass not working**: Check `isAdminUser()` implementation
3. **Memory usage high**: Ensure cleanup is running properly
4. **False positives**: Review identifier generation logic

### Debug Logging

Enable detailed logging by setting:

```bash
DEBUG_RATE_LIMITING=true
```

This provides detailed information about rate limiting decisions and violations.

## Future Enhancements

1. **Distributed Rate Limiting**: Redis-based coordination across multiple servers
2. **Machine Learning**: Detect unusual patterns and adapt limits automatically
3. **Geolocation**: Different limits based on user location
4. **User Reputation**: Adjust limits based on user behavior history
5. **API Key Support**: Different limits for API key vs session-based access

## Conclusion

This comprehensive rate limiting system provides robust protection against various types of abuse while maintaining flexibility for legitimate users. The monitoring capabilities enable proactive security management and optimization based on real usage patterns.

For questions or modifications, please refer to the implementation files or contact the development team.