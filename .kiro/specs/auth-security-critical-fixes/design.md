# Design Document

## Overview

This design addresses critical authentication security vulnerabilities that cause "authentication context dissociation" - a condition where users appear authenticated to the frontend but lose backend data access due to compromised authentication context. The solution involves eliminating bypass flags, strengthening RLS policies, fixing real-time subscriptions, and ensuring session consistency.

## Architecture

### Current Issues Analysis

**Primary Root Cause:**
- Emergency authentication bypass flag enabled: `BYPASS_ALL_AUTH_CHECKS = true`
- Creates authentication context dissociation between frontend and backend
- Row-Level Security policies cannot function with compromised auth context

**Secondary Contributing Factors:**
1. Missing or incomplete RLS policies on relationships table
2. Real-time subscription failures when auth context is compromised  
3. Session consistency issues with Supabase client cache
4. Stale authentication state retention

### Solution Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │───▶│  Auth Middleware │───▶│  Backend APIs   │
│   (Consistent   │    │  (No Bypasses)   │    │  (RLS Enforced) │
│    Auth State)  │    └──────────────────┘    └─────────────────┘
└─────────────────┘              │                       │
         │                       ▼                       ▼
         │              ┌──────────────────┐    ┌─────────────────┐
         │              │  Session Manager │    │  Database with  │
         │              │  (Consistent)    │    │  Complete RLS   │
         │              └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌──────────────────────┐
                    │  Real-time Manager   │
                    │  (Auth-Aware)        │
                    └──────────────────────┘
```

## Components and Interfaces

### 1. Authentication Bypass Elimination

**Target Files:**
- `middleware.ts` - Remove any bypass flags
- `lib/auth/middleware-helpers.ts` - Ensure no bypass logic
- All authentication-related modules

**Changes Required:**
- Locate and disable `BYPASS_ALL_AUTH_CHECKS = true`
- Remove any emergency bypass logic
- Ensure all authentication checks are enforced

### 2. Enhanced RLS Policy Implementation

**Target Tables:**
- `relationships` - Complete access policies
- `events` - Privacy-aware policies  
- `contacts` - User-scoped policies
- All user-data tables

**Policy Requirements:**
```sql
-- Relationships table policies
CREATE POLICY "Users can manage own relationships" ON relationships
    FOR ALL USING (user_id = auth.uid() OR partner_id = auth.uid());

-- Events table policies  
CREATE POLICY "Users can view events based on privacy" ON events
    FOR SELECT USING (can_view_event(id, auth.uid()));

-- Contacts table policies
CREATE POLICY "Users can manage own contacts" ON contacts
    FOR ALL USING (user_id = auth.uid());
```

### 3. Real-time Subscription Recovery

**Enhanced Subscription Manager:**
- Auth-aware connection management
- Automatic token refresh integration
- Graceful reconnection on auth state changes
- Exponential backoff retry logic

**Key Features:**
```typescript
interface AuthAwareSubscription {
  authState: RealtimeAuthState;
  autoReconnect: boolean;
  tokenRefreshHandler: () => Promise<void>;
  connectionRecovery: () => Promise<void>;
}
```

### 4. Session Consistency Management

**Session Synchronization:**
- Cross-component auth state synchronization
- Automatic stale state detection and refresh
- Consistent session validation across all clients
- Proactive token refresh before expiration

**Implementation:**
```typescript
interface SessionConsistencyManager {
  validateSession(): Promise<SessionValidationResult>;
  synchronizeAuthState(): Promise<void>;
  refreshStaleState(): Promise<void>;
  notifyStateChange(state: AuthState): void;
}
```

## Data Models

### Authentication State

```typescript
interface EnhancedAuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isValidated: boolean;
  lastValidation: Date | null;
  contextIntegrity: boolean;
  rlsEnabled: boolean;
  bypassFlags: BypassFlag[];
}

interface BypassFlag {
  name: string;
  enabled: boolean;
  location: string;
  severity: 'critical' | 'high' | 'medium';
}
```

### RLS Policy Status

```typescript
interface RLSPolicyStatus {
  tableName: string;
  policiesEnabled: boolean;
  policyCount: number;
  missingPolicies: string[];
  lastValidated: Date;
}
```

## Error Handling

### 1. Authentication Context Dissociation

**Detection:**
- Monitor for successful frontend auth with failed backend queries
- Track RLS policy enforcement failures
- Detect session inconsistencies across components

**Recovery:**
- Force session refresh and re-validation
- Clear stale authentication cache
- Re-establish real-time connections
- Notify user of temporary access issues

### 2. RLS Policy Failures

**Detection:**
- Monitor database query failures with auth context
- Track policy enforcement errors
- Detect missing or misconfigured policies

**Recovery:**
- Validate and repair RLS policies
- Ensure proper user context in queries
- Implement fallback access patterns
- Log policy failures for analysis

### 3. Real-time Connection Failures

**Detection:**
- Monitor subscription connection status
- Track authentication-related disconnections
- Detect token expiration issues

**Recovery:**
- Implement exponential backoff retry
- Refresh authentication tokens before retry
- Re-establish subscriptions with fresh auth context
- Graceful degradation to polling if needed

## Security Considerations

### 1. Bypass Flag Elimination

**Critical Actions:**
- Immediate removal of all bypass flags
- Code audit for hidden bypass logic
- Deployment verification of bypass removal
- Monitoring for bypass flag reintroduction

### 2. RLS Policy Completeness

**Security Requirements:**
- Complete policy coverage for all user-scoped tables
- Policy testing with various user scenarios
- Regular policy validation and updates
- Monitoring for policy bypass attempts

### 3. Authentication Context Integrity

**Integrity Measures:**
- Continuous auth context validation
- Cross-component state verification
- Token freshness monitoring
- Session hijacking detection

## Testing Strategy

### 1. Authentication Bypass Testing

**Test Scenarios:**
- Verify no bypass flags are active
- Test authentication enforcement under load
- Validate policy enforcement with various user states
- Confirm proper error handling for auth failures

### 2. RLS Policy Testing

**Test Coverage:**
- Policy enforcement for all user scenarios
- Cross-user data access prevention
- Policy performance under load
- Edge cases and error conditions

### 3. Real-time Subscription Testing

**Test Areas:**
- Subscription stability with auth state changes
- Token refresh during active subscriptions
- Connection recovery after auth failures
- Performance with multiple concurrent subscriptions

### 4. Session Consistency Testing

**Validation Points:**
- Cross-component auth state synchronization
- Stale state detection and refresh
- Session validation accuracy
- Performance impact of consistency checks

## Performance Considerations

### 1. Authentication Validation

**Optimization:**
- Efficient session validation caching
- Minimal overhead for auth checks
- Batch validation for multiple operations
- Smart refresh timing to avoid unnecessary calls

### 2. RLS Policy Performance

**Database Optimization:**
- Proper indexing for policy queries
- Efficient policy logic implementation
- Query plan optimization for policy enforcement
- Monitoring for policy-related performance issues

### 3. Real-time Connection Management

**Resource Management:**
- Connection pooling for subscriptions
- Efficient auth state propagation
- Minimal reconnection overhead
- Smart batching of subscription updates

## Deployment and Monitoring

### 1. Critical Deployment Steps

**Pre-deployment:**
- Verify bypass flag removal
- Test RLS policy completeness
- Validate session consistency
- Confirm real-time subscription stability

**Post-deployment:**
- Monitor authentication success rates
- Track RLS policy enforcement
- Verify real-time connection stability
- Validate session consistency metrics

### 2. Monitoring and Alerting

**Key Metrics:**
- Authentication context dissociation events
- RLS policy failure rates
- Real-time subscription success rates
- Session consistency validation results

**Alert Conditions:**
- Any bypass flag detection
- RLS policy enforcement failures
- High authentication error rates
- Real-time connection instability