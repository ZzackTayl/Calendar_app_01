# Group Permissions Fix Documentation

## Overview

This document describes the comprehensive fixes applied to address critical gaps in the group permissions and event visibility system discovered during the analysis.

## Critical Issues Fixed

### 1. Table Name Inconsistencies
**Issue**: Code was referencing `group_members` table while the actual table is `relationship_group_members`.

**Fixed Files**:
- `/lib/permissions/permission-service.ts`
- `/lib/supabase/server.ts`
- `/app/api/groups/invitations/create/route.ts`
- `/app/api/groups/invitations/accept/route.ts`
- `/app/api/invitations/details/[token]/route.ts`
- `/app/api/invitations/accept/[token]/route.ts`
- `/app/api/groups/[groupId]/route.ts`
- `/app/api/groups/[groupId]/members/[userId]/route.ts`
- `/app/api/account/delete/route.ts`
- `/tests/test-helpers.ts`
- `/__tests__/permissions/permission-system.test.ts`

### 2. Database Schema and Functions
**Issue**: The helper functions `can_view_user_calendar` and `can_view_event_details` were not checking group-based permissions.

**Solution**: Created a comprehensive SQL migration that:
- Ensures `group_member_permissions` table exists with proper structure
- Updates helper functions to include group permission checks
- Adds a new `check_group_permission` helper function
- Updates RLS policies to use the enhanced functions

### 3. Verification of group_member_permissions Table
**Issue**: Initial analysis suggested the `group_member_permissions` table was missing.

**Finding**: The table is actually defined in the schema but needed proper indexes and enhanced helper functions to use it.

## How to Apply the Fixes

### Step 1: Update Your Codebase

All TypeScript/JavaScript files have been updated in this commit. The changes fix all references from `group_members` to `relationship_group_members`.

### Step 2: Apply the Database Migration

The database changes need to be applied using one of these methods:

#### Option A: Using Supabase Dashboard (Recommended)
1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor
3. Copy the entire contents of `/migrations/fix-group-permissions-comprehensive.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration

#### Option B: Using Supabase CLI
```bash
supabase db push --file migrations/fix-group-permissions-comprehensive.sql
```

#### Option C: Using the Helper Script
```bash
npm run fix:group-permissions
```
This will show you the current state and provide instructions for applying the migration.

### Step 3: Verify the Migration

After applying the migration, verify it succeeded by:

1. **Check Tables Exist**:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('relationship_group_members', 'group_member_permissions');
```

2. **Check Functions Updated**:
```sql
SELECT proname, prosrc FROM pg_proc 
WHERE proname IN ('can_view_user_calendar', 'can_view_event_details', 'check_group_permission');
```

3. **Test Permission Checks**:
```sql
-- This should return true for same user
SELECT can_view_user_calendar('YOUR_USER_ID'::UUID, 'YOUR_USER_ID'::UUID);
```

### Step 4: Run Tests

After applying all fixes, run the permission tests to ensure everything works:

```bash
# Run all permission tests
npm test -- __tests__/permissions/

# Run specific production-ready tests
npm run test:privacy:all
npm run test:relationships
```

## What the Migration Does

The migration (`fix-group-permissions-comprehensive.sql`) performs these operations:

1. **Creates group_member_permissions table** (if it doesn't exist)
   - Stores granular permissions between group members
   - Includes visibility flags for details, location, description, attendees
   - Has proper indexes and constraints

2. **Updates can_view_user_calendar function**
   - Now checks both direct relationships AND group permissions
   - Verifies both users are active members of the same group

3. **Updates can_view_event_details function**
   - Includes group-based permission checks
   - Properly handles private event permissions through groups

4. **Creates check_group_permission function**
   - New helper function for checking specific permission types
   - Used internally by other functions

5. **Adds proper RLS policies**
   - Ensures users can only manage their own permissions
   - Allows viewing permissions where user is involved

## Testing the Fix

After applying all changes, test the group permissions system:

1. Create a test group
2. Add multiple users to the group
3. Set custom permissions between group members
4. Create events with group-based visibility
5. Verify that calendar and event visibility respects group permissions

## Summary

These fixes ensure that:
- ✅ All code references use the correct table name (`relationship_group_members`)
- ✅ The `group_member_permissions` table exists and is properly structured
- ✅ Database helper functions check both relationship AND group permissions
- ✅ RLS policies properly enforce group-based access control
- ✅ The system can handle complex polycule permission scenarios

The fixes maintain backward compatibility while adding the missing group permission functionality. The system now properly enforces the sophisticated dual privacy/permission model as originally designed.
