# Comprehensive Database Migration Plan

> **Status**: Production-Ready Migration Strategy  
> **Target**: Complete schema + comprehensive RLS policies  
> **Approach**: Senior Developer Standards

## Current State Analysis

Based on verification results:
- **5 tables** properly secured (COMPLETE)
- **3 tables** partially secured (INCOMPLETE) 
- **2 tables** exist but unsecured (CRITICAL RISK)
- **16 tables** missing entirely (SCHEMA INCOMPLETE)

## Migration Strategy

### Phase 1: Schema Completion
**Objective**: Create all missing tables, enums, and constraints

**Source**: `supabase/migrations/consolidated/20250903000000_consolidated_schema_final_fixed.sql`

**What it provides**:
- All missing enum types (privacy_level_enum, connection_tier, etc.)
- All missing tables (event_visibility, event_attachments, contacts, user_profiles, etc.)
- Proper foreign key constraints and indexes
- Enables RLS on all tables

### Phase 2: Comprehensive RLS Policies  
**Objective**: Secure all tables with proper row-level security

**Source**: `supabase/migrations/20250904000000_comprehensive_rls_policies.sql`

**What it provides**:
- Helper functions (can_view_user_calendar, can_view_event_details)
- Complete RLS policies for all tables
- Proper permission hierarchy enforcement
- Security verification functions

## Risk Assessment

### 🟢 LOW RISK
- **Data Preservation**: Migrations use `CREATE TABLE IF NOT EXISTS`
- **Existing Data**: Won't be affected by new table creation
- **Rollback Available**: Both migrations have rollback scripts

### 🟡 MEDIUM RISK  
- **RLS Policy Changes**: May affect existing data access patterns
- **Function Dependencies**: New helper functions change query behavior

### 🔴 HIGH RISK (Current State)
- **event_permissions** table has NO security policies
- **calendar_integrations** table has NO security policies
- Data exposure risk in current state is HIGHER than migration risk

## Execution Plan

### Step 1: Pre-Migration Backup
```sql
-- Create backup tables for critical data
CREATE TABLE backup_events_20250907 AS SELECT * FROM events;
CREATE TABLE backup_relationships_20250907 AS SELECT * FROM relationships;
CREATE TABLE backup_users_20250907 AS SELECT * FROM users;
```

### Step 2: Schema Migration
**File**: `consolidated/20250903000000_consolidated_schema_final_fixed.sql`
- Creates missing tables and enums
- Adds constraints and indexes
- Enables RLS on all tables (but doesn't create policies yet)

### Step 3: RLS Policies Migration
**File**: `20250904000000_comprehensive_rls_policies.sql` 
- Creates helper functions
- Implements comprehensive RLS policies
- Adds verification functions

### Step 4: Verification & Testing
- Run verification functions
- Test key user flows
- Validate security boundaries

## Rollback Strategy

If issues occur:
1. **Immediate**: Run rollback migrations in reverse order
2. **Data Recovery**: Restore from backup tables
3. **Selective Rollback**: Drop specific policies without affecting tables

## Expected Outcome

### Tables Status After Migration:
- **ALL 29 tables** will exist
- **ALL tables** will have comprehensive RLS policies (3+ policies each)
- **ALL security functions** will be available
- **ALL permission hierarchies** will be properly enforced

### Security Improvements:
- event_permissions table properly secured
- calendar_integrations properly secured  
- Complete data isolation between users
- Proper relationship-based sharing
- Audit logging enabled

## Senior Developer Validation Checklist

- [ ] Backup created before migration
- [ ] Schema migration applied successfully
- [ ] RLS policies migration applied successfully
- [ ] All tables show "COMPLETE" status
- [ ] Helper functions created and accessible
- [ ] Test user can access their own data
- [ ] Test user cannot access other user's data
- [ ] Relationship-based sharing works correctly
- [ ] Event permissions work as expected
- [ ] Performance impact acceptable (< 100ms additional latency)

## Files Created for This Migration

1. `scripts/production-migration.sql` - Combined schema + RLS migration
2. `scripts/rollback-migration.sql` - Complete rollback procedure  
3. `scripts/post-migration-verification.sql` - Comprehensive testing
4. `scripts/migration-backup.sql` - Data backup procedures
