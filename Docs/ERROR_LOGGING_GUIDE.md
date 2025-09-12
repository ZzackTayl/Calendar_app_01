# Error Logging System Guide

## Overview

PolyHarmony Calendar implements a comprehensive error logging system with multiple layers for different types of errors and security events. This guide explains how to use and maintain the system.

## Error Logging Architecture

### 1. **Client-Side Error Reporting**
**File**: `/app/api/error-reporting/route.ts`

**Purpose**: Captures frontend JavaScript errors, React component errors, and user-facing issues.

**Usage**:
```typescript
// Frontend error reporting
const reportError = async (error: Error, errorInfo?: any) => {
  await fetch('/api/error-reporting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      errorId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorType: 'frontend_error',
      metadata: { userId: currentUser?.id }
    })
  });
};
```

**Database Table**: `error_logs`
**Retention**: 90 days

### 2. **Security Event Logging**
**File**: `/lib/security/event-logger.ts`

**Purpose**: Tracks security-related events, authentication failures, and suspicious activities.

**Usage**:
```typescript
import { getSecurityEventLogger } from '@/lib/security/event-logger';

const securityLogger = getSecurityEventLogger();

// Log authentication bypass attempt
securityLogger.logAuthBypassAttempt({
  route: '/api/events',
  userId: 'user-123',
  reason: 'Invalid session token',
  authState: { authenticated: false }
});

// Log unauthorized access
securityLogger.logUnauthorizedAccess({
  route: '/api/private-data',
  userId: 'user-123',
  reason: 'Insufficient permissions',
  authRequired: true
});
```

**Database Table**: `security_events`
**Retention**: 1 year (compliance)

### 3. **System Error Logging**
**File**: `/lib/security/user-isolation.ts` (and other system files)

**Purpose**: Captures server-side system errors, database failures, and infrastructure issues.

**Usage**:
```typescript
// Log system errors
await supabase.from('system_errors').insert({
  user_id: userId,
  error_type: 'security_operation_error',
  resource_type: 'user_data',
  resource_id: userId,
  error_message: error.message,
  metadata: {
    stack_trace: error.stack,
    timestamp: new Date().toISOString()
  }
});
```

**Database Table**: `system_errors`
**Retention**: 180 days

### 4. **Production Monitoring**
**File**: `/lib/monitoring/production-monitoring.ts`

**Purpose**: In-memory error tracking with metrics and performance monitoring.

**Usage**:
```typescript
import { getProductionMonitoringService } from '@/lib/monitoring/production-monitoring';

const monitoring = getProductionMonitoringService();

// Log errors with context
monitoring.logError('database_connection', error, 'critical', {
  endpoint: '/api/events',
  userId: 'user-123'
});

// Track request metrics
monitoring.trackRequest('/api/events', 150); // 150ms response time
```

**Storage**: In-memory (1000 error limit)
**Retention**: Until server restart

### 5. **Key Management Audit**
**File**: `/lib/keys/key-management-service.ts`

**Purpose**: Tracks cryptographic operations for compliance and debugging.

**Usage**:
```typescript
// Automatically logged by KeyManagementService
await keyService.encryptData(userId, sensitiveData);
await keyService.decryptData(userId, encryptedData);
```

**Database Table**: `key_audit_log`
**Retention**: 2 years (compliance)

## Database Schema Setup

### 1. **Apply Error Logging Schema**
```bash
# Apply the error logging schema to your Supabase database
psql -h your-supabase-host -U postgres -d postgres -f schemas/error_logging_schema.sql
```

### 2. **Verify Tables Created**
```sql
-- Check that all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('error_logs', 'system_errors', 'security_events', 'key_audit_log');
```

### 3. **Set Up Cleanup Job**
```sql
-- Create a scheduled job to clean up old logs (run daily)
SELECT cron.schedule('cleanup-error-logs', '0 2 * * *', 'SELECT cleanup_old_error_logs();');
```

## Error Logging Best Practices

### 1. **Error Classification**
- **Frontend Errors**: User-facing issues, component crashes
- **Security Events**: Authentication failures, unauthorized access
- **System Errors**: Database failures, infrastructure issues
- **Key Operations**: Cryptographic failures, key management issues

### 2. **Error Context**
Always include:
- **User ID**: When available and relevant
- **Timestamp**: ISO 8601 format
- **Request Context**: URL, user agent, IP address
- **Error Type**: Categorized error classification
- **Metadata**: Additional context for debugging

### 3. **Privacy Considerations**
- **No Sensitive Data**: Never log passwords, encryption keys, or personal information
- **User Consent**: Respect user privacy preferences
- **Data Minimization**: Only log what's necessary for debugging

### 4. **Performance Impact**
- **Async Logging**: Never block main thread for error logging
- **Batch Operations**: Group multiple errors when possible
- **Graceful Degradation**: Continue operation even if logging fails

## Monitoring and Alerting

### 1. **Error Dashboard** (To Be Implemented)
```typescript
// Future: Admin dashboard for error monitoring
const ErrorDashboard = () => {
  const [errors, setErrors] = useState([]);
  
  useEffect(() => {
    // Fetch recent errors
    fetch('/api/admin/errors/recent')
      .then(res => res.json())
      .then(setErrors);
  }, []);
  
  return (
    <div>
      <h2>Recent Errors</h2>
      {errors.map(error => (
        <ErrorCard key={error.id} error={error} />
      ))}
    </div>
  );
};
```

### 2. **Alert Configuration**
```typescript
// Configure error alerts
const alertConfig = {
  critical: {
    threshold: 5, // 5 errors in 5 minutes
    timeWindow: 5,
    channels: ['email', 'sms', 'slack']
  },
  high: {
    threshold: 10,
    timeWindow: 10,
    channels: ['email', 'slack']
  }
};
```

### 3. **Error Trends**
```sql
-- Query error trends
SELECT 
  DATE(created_at) as date,
  error_type,
  COUNT(*) as error_count
FROM error_logs 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), error_type
ORDER BY date DESC, error_count DESC;
```

## Troubleshooting Common Issues

### 1. **Database Connection Errors**
```typescript
// Check Supabase connection
const { data, error } = await supabase
  .from('error_logs')
  .select('count')
  .limit(1);

if (error) {
  console.error('Database connection failed:', error);
  // Fall back to console logging
}
```

### 2. **Memory Leaks**
```typescript
// Monitor memory usage
const monitoring = getProductionMonitoringService();
const status = monitoring.getStatus();

if (status.errors.length > 800) {
  console.warn('Error log approaching memory limit');
}
```

### 3. **Missing Error Context**
```typescript
// Ensure proper error context
const logError = (error: Error, context: any) => {
  const enrichedError = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    context: {
      userId: context.userId,
      endpoint: context.endpoint,
      userAgent: context.userAgent
    }
  };
  
  // Log with proper context
  monitoring.logError('application_error', enrichedError, 'error', context);
};
```

## Security Considerations

### 1. **Access Control**
- **RLS Policies**: Users can only see their own errors
- **Admin Access**: Separate admin role for error monitoring
- **API Keys**: Secure error reporting endpoints

### 2. **Data Protection**
- **Encryption**: Sensitive error data encrypted at rest
- **Retention**: Automatic cleanup based on retention policies
- **Compliance**: GDPR/CCPA compliant error handling

### 3. **Attack Prevention**
- **Rate Limiting**: Prevent error log flooding
- **Input Validation**: Sanitize error report data
- **Audit Trail**: Track who accesses error logs

## Maintenance Tasks

### 1. **Daily**
- Check error log volume and trends
- Review critical security events
- Monitor system performance metrics

### 2. **Weekly**
- Analyze error patterns and trends
- Review and update error classification
- Check retention policy compliance

### 3. **Monthly**
- Generate error reports for stakeholders
- Review and update alerting thresholds
- Audit error log access and permissions

## Integration with External Services

### 1. **Error Reporting Services**
```typescript
// Sentry integration example
if (process.env.SENTRY_DSN) {
  Sentry.captureException(error, {
    tags: {
      component: 'calendar',
      user: userId
    },
    extra: {
      metadata: errorMetadata
    }
  });
}
```

### 2. **Monitoring Platforms**
```typescript
// DataDog integration example
if (process.env.DATADOG_API_KEY) {
  datadog.increment('polyharmony.errors', 1, {
    error_type: errorType,
    severity: severity
  });
}
```

This error logging system provides comprehensive coverage of all error types while maintaining privacy and performance standards. Regular monitoring and maintenance ensure reliable error tracking for production environments.
