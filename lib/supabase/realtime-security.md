# Real-time Security Configuration for Calendar Application

## Overview

This document outlines the security considerations and configuration requirements for real-time subscriptions in the Calendar application. The system uses Supabase's real-time capabilities with comprehensive privacy controls.

## Security Architecture

### 1. Authentication Requirements

**All real-time subscriptions require authenticated users:**
- User must have valid Supabase session
- Email must be verified (`user.email_confirmed_at` not null)
- Session must not be expired
- Middleware automatically refreshes sessions

### 2. Row Level Security (RLS) Integration

**Real-time subscriptions respect existing RLS policies:**

#### Events Table
```sql
-- RLS Policy for Events
CREATE POLICY "Users can view events based on privacy" ON events
    FOR SELECT USING (can_view_event(id, auth.uid()));
```

#### Relationships Table  
```sql
-- RLS Policy for Relationships
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (user_id = auth.uid() OR partner_id = auth.uid());
```

#### Relationship Groups Table
```sql
-- RLS Policy for Groups
CREATE POLICY "Users can view their groups" ON relationship_groups
    FOR SELECT USING (user_id = auth.uid());
```

### 3. Privacy Enforcement

**Connection Tier System:**
- `private`: No event visibility
- `busy_only`: See free/busy blocks only  
- `details`: See full event details

**Event Privacy Overrides:**
- `default`: Use connection tier settings
- `private`: Hide from everyone except explicit participants

### 4. Subscription Filtering

**User-specific filters are applied:**

```typescript
// Events: Only events user can access
filter: `user_id=eq.${userId}`

// Relationships: Only relationships involving user
filter: `user_id=eq.${userId}`

// Invitations: Only invitations to/from user  
filter: `invited_by=eq.${userId}`
```

## Rate Limiting

### Subscription Rate Limits
- **Max 10 subscriptions per user per minute**
- **Automatic cleanup after 1 minute**
- **Per-user tracking with in-memory storage**

### Connection Limits
- **Max 100 concurrent channels per user** (Supabase default)
- **Automatic channel cleanup on errors**
- **Connection pooling for efficiency**

## Implementation Security Checklist

### ✅ Backend Security (Completed)

1. **RLS Policies Active**
   - ✅ Events table has privacy-aware RLS
   - ✅ Relationships table restricts to user's connections
   - ✅ Groups table restricts to user's groups
   - ✅ Invitations table filtered by user involvement

2. **Authentication Integration**
   - ✅ Middleware handles session refresh
   - ✅ Real-time client uses authenticated sessions
   - ✅ Subscription manager checks auth status

3. **Privacy Functions Available**
   - ✅ `can_view_event(event_id, user_id)` function
   - ✅ `can_view_event_details(event_id, user_id)` function
   - ✅ `get_connection_tier(user_id, target_user_id)` function

4. **Rate Limiting Implemented**
   - ✅ Subscription rate limiting (10/min per user)
   - ✅ Automatic cleanup of expired limits
   - ✅ Connection management with cleanup

### 🚧 Frontend Security (Pending - Data Flow Agent)

1. **Subscription Management**
   - 🔄 Use `createSubscriptionManager()` utility
   - 🔄 Implement proper cleanup on component unmount
   - 🔄 Handle connection errors gracefully

2. **Data Validation**
   - 🔄 Validate incoming real-time payloads
   - 🔄 Sanitize data before UI updates
   - 🔄 Handle partial/malformed data

3. **User Experience**
   - 🔄 Show connection status indicators
   - 🔄 Handle offline/online transitions  
   - 🔄 Implement retry logic for failed connections

## Security Risks and Mitigations

### Risk 1: Information Disclosure
**Risk:** Users might receive events they shouldn't see
**Mitigation:** 
- RLS policies enforce privacy at database level
- Client-side validation as additional layer
- Audit logs for subscription access

### Risk 2: Connection Abuse
**Risk:** Users creating excessive real-time connections
**Mitigation:**
- Rate limiting on subscription creation (10/min)
- Connection pooling and cleanup
- Server-side monitoring of connection counts

### Risk 3: Data Tampering
**Risk:** Malicious payloads in real-time streams
**Mitigation:**
- Read-only subscriptions (no write operations via real-time)
- Payload validation on frontend
- Type-safe interfaces for real-time data

### Risk 4: Session Hijacking
**Risk:** Unauthorized access via stolen session tokens
**Mitigation:**
- Automatic session refresh in middleware
- Short session expiry times
- HttpOnly cookies for session storage

## Monitoring and Logging

### Real-time Metrics to Track
1. **Connection Health**
   - Number of active subscriptions per user
   - Connection success/failure rates
   - Average connection duration

2. **Security Events**
   - Failed subscription attempts
   - RLS policy violations (blocked queries)
   - Rate limit violations

3. **Performance Metrics**
   - Real-time message latency
   - Database query performance for RLS checks
   - Memory usage for subscription management

### Logging Configuration

```typescript
// Enable debug logging for real-time operations
console.debug(`[REALTIME] ${operation} for user ${userId}`);
console.error(`[REALTIME] Security violation: ${violation}`);
console.warn(`[REALTIME] Rate limit exceeded for user ${userId}`);
```

## Emergency Procedures

### Incident Response
1. **Suspected Data Breach**
   - Immediately disable real-time subscriptions
   - Review audit logs for unauthorized access
   - Force session refresh for all users

2. **Performance Issues**
   - Check connection counts per user
   - Implement emergency rate limiting
   - Scale database connections if needed

3. **RLS Policy Bypass**
   - Immediately patch RLS policies
   - Review all real-time subscription filters
   - Audit recent real-time message logs

### Recovery Procedures
1. **Service Restoration**
   - Verify RLS policies are active
   - Test subscription filtering
   - Gradually re-enable real-time features

2. **Data Integrity Checks**
   - Verify no unauthorized data was accessed
   - Check event privacy settings
   - Validate relationship connection tiers

## Configuration Validation

### Pre-deployment Checklist
- [ ] All RLS policies tested and active
- [ ] Rate limiting tested with edge cases
- [ ] Subscription cleanup tested
- [ ] Authentication integration tested
- [ ] Privacy function performance tested

### Production Monitoring
- [ ] Real-time connection counts dashboard
- [ ] RLS policy violation alerts
- [ ] Rate limit violation alerts  
- [ ] Database performance monitoring for real-time queries

## Integration Notes for Data Flow Agent

When implementing frontend real-time features:

1. **Always use `createSubscriptionManager()`** - Don't create raw Supabase channels
2. **Check `checkRealtimeStatus()`** before creating subscriptions
3. **Implement proper cleanup** - Call `unsubscribeAll()` on component unmount
4. **Handle authentication failures** - Redirect to login on auth errors
5. **Validate all payloads** - Don't trust real-time data implicitly
6. **Show connection status** - Users should know if real-time is working
7. **Implement retry logic** - Handle temporary connection failures gracefully

The backend infrastructure is fully prepared for real-time implementation with comprehensive security measures.