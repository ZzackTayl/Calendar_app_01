# Comprehensive Row-Level Security (RLS) Implementation Guide

## Overview

This document describes the comprehensive Row-Level Security (RLS) policies implemented to fix data persistence issues in the SpoonSaver application. The implementation ensures that users can only access their own data and data explicitly shared with them through relationship connections.

## Problem Statement

The application was experiencing data persistence issues where users like `zacks@anthropologica.tech` would lose access to their data across sessions. The root cause was incomplete or missing RLS policies on critical tables, particularly the `relationships` table and other user-scoped data tables.

## Solution: Comprehensive RLS Policies

### Files Created

1. **Migration Script**: `/supabase/migrations/20250904000000_comprehensive_rls_policies.sql`
   - Implements complete RLS policies across all user-scoped tables
   - Creates helper functions for complex privacy logic
   - Includes verification queries

2. **Rollback Script**: `/supabase/migrations/20250904000001_rollback_comprehensive_rls.sql`
   - Provides safe rollback mechanism if issues arise
   - Removes all policies and helper functions

3. **Test Script**: `/test-rls-policies.sql`
   - Comprehensive testing framework for RLS policies
   - Includes test data and verification queries

## Key Features Implemented

### 1. Complete Table Coverage

RLS policies implemented for all user-scoped tables:

- `users` and `user_profiles` - Basic user data
- `relationships` - **CRITICAL FIX** - Proper bidirectional access
- `events` - User events with relationship-based sharing
- `contacts` and related tables - Contact management
- `invitations` - Invitation system
- `calendar_integrations` - External calendar connections
- Security tables (`csrf_tokens`, `oauth_states`)
- Availability system tables
- Audit and logging tables

### 2. Sophisticated Relationship-Based Access

The RLS policies implement a three-tier privacy system:

- **`private`**: No access to calendar data
- **`busy_only`**: Can see when user is busy, but no details
- **`details`**: Full access to calendar details (family privileges)

### 3. Helper Functions

Created specialized functions for complex privacy logic:

- `can_view_user_calendar(viewer_id, calendar_owner_id)` - Determines calendar access
- `can_view_event_details(event_id, viewer_id)` - Controls event detail visibility
- `verify_rls_policies()` - Verifies policy completeness

### 4. Event Privacy Overrides

Events support privacy overrides:
- **`default`**: Use relationship connection tier
- **`private`**: Hide from everyone except explicit participants

## Critical Fixes for Relationships Table

The relationships table now has comprehensive policies:

```sql
-- Users can view relationships where they are either user or partner
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );

-- Users can insert relationships where they are the user_id
CREATE POLICY "Users can create relationships" ON relationships
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM users WHERE id = partner_id)
    );

-- Users can update/delete relationships where they are either user or partner
CREATE POLICY "Users can update their relationships" ON relationships
    FOR UPDATE USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );

CREATE POLICY "Users can delete their relationships" ON relationships
    FOR DELETE USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );
```

## Security Patterns

### 1. Standard User-Scoped Pattern
```sql
-- Basic pattern for user-owned data
FOR ALL USING (auth.uid() = user_id)
```

### 2. Bidirectional Relationship Pattern
```sql
-- For tables involving two users (relationships, shares)
FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = partner_id
)
```

### 3. Inherited Access Pattern
```sql
-- For data owned by related entities (event attachments, reminders)
FOR SELECT USING (
    EXISTS (SELECT 1 FROM parent_table WHERE id = child_table.parent_id AND user_id = auth.uid())
)
```

### 4. System Operation Pattern
```sql
-- For audit logs and metrics that system creates
FOR INSERT WITH CHECK (true)  -- System can create for any user
FOR SELECT USING (auth.uid() = user_id)  -- Users can only see their own
```

## Deployment Instructions

### 1. Backup Current Database
```sql
-- Create a backup before applying changes
pg_dump your_database > backup_before_rls_$(date +%Y%m%d).sql
```

### 2. Apply Migration
```bash
# In Supabase CLI
supabase db push

# Or manually in SQL editor
-- Run: supabase/migrations/20250904000000_comprehensive_rls_policies.sql
```

### 3. Verify Deployment
```sql
-- Check policy status
SELECT * FROM verify_rls_policies() ORDER BY table_name;

-- Should show all tables with 'COMPLETE' status
```

### 4. Test with Real Users
1. Have test users sign in through the application
2. Create relationships between test users
3. Create events and test visibility
4. Verify data persists across sessions

## Testing Guidelines

### 1. Automated Testing
Run the test script:
```bash
psql -f test-rls-policies.sql your_database
```

### 2. Manual Testing Checklist

**User Data Isolation:**
- [ ] Users can only see their own profiles
- [ ] Users can only see their own contacts
- [ ] Users can only see their own events

**Relationship Access:**
- [ ] Users can see relationships where they are user or partner
- [ ] Users can create relationships with themselves as user_id
- [ ] Users can update/delete their own relationships

**Event Sharing:**
- [ ] Partners with 'details' tier can see event details
- [ ] Partners with 'busy_only' tier see limited info
- [ ] 'private' events are hidden from partners
- [ ] Event owners can always see their own events

**Cross-User Security:**
- [ ] User A cannot see User B's private data
- [ ] User A cannot modify User B's data
- [ ] Relationship deletion by either party removes access

### 3. Performance Testing
Monitor query performance after deployment:
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%auth.uid%'
ORDER BY mean_time DESC;
```

## Troubleshooting

### Common Issues

1. **"Row level security policy for X not passed"**
   - Check that user is properly authenticated
   - Verify auth.uid() returns expected UUID
   - Check policy logic matches your use case

2. **Data still not persisting**
   - Verify all related tables have proper policies
   - Check for missing foreign key constraints
   - Ensure consistent user_id usage across tables

3. **Performance issues**
   - Add indexes on commonly filtered columns
   - Consider policy optimization for complex queries
   - Monitor auth.uid() function calls

### Rollback Procedure

If issues arise:
```bash
# Apply rollback migration
supabase db push --include-file 20250904000001_rollback_comprehensive_rls.sql

# Or manually run the rollback script
```

## Implementation Notes

### Design Decisions

1. **Permissive Partner Access**: Partners in relationships can modify relationship records. This enables both parties to update privacy settings.

2. **System vs User Operations**: Audit logs and metrics allow system insertion but user-restricted reading.

3. **Helper Functions**: Complex privacy logic is centralized in functions for maintainability.

4. **Verification Built-in**: The migration includes verification functions for ongoing monitoring.

### Future Enhancements

1. **Granular Event Permissions**: Individual event sharing beyond relationship tiers
2. **Time-based Access**: Temporary access grants
3. **Group-based Permissions**: Team/family group access patterns
4. **Audit Trail Enhancement**: More detailed access logging

## Monitoring and Maintenance

### Ongoing Verification
```sql
-- Weekly policy check
SELECT * FROM verify_rls_policies() 
WHERE status != 'COMPLETE';

-- Monthly performance review  
SELECT schemaname, tablename, 
       (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count
FROM pg_tables t 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Log Monitoring
Monitor authentication and access patterns:
```sql
-- Check for policy violations
SELECT * FROM permission_audit_logs 
WHERE action LIKE '%violation%' 
ORDER BY created_at DESC;
```

## Conclusion

This comprehensive RLS implementation provides:

- **Data Security**: Complete isolation between users
- **Relationship Privacy**: Sophisticated sharing based on connection tiers  
- **Data Persistence**: Reliable access across sessions
- **Maintainability**: Clear patterns and helper functions
- **Testability**: Comprehensive verification framework

The implementation specifically addresses the reported issue where users like `zacks@anthropologica.tech` were losing access to their relationship data, ensuring consistent and secure data access patterns across the entire application.