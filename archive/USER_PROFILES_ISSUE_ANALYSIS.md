# User Profiles Database Issue Analysis

## Issue Summary

Users are experiencing **PGRST116 errors** when trying to load their profiles:

```
Error: "Cannot coerce the result to a single JSON object" - 0 rows returned
API Call: GET user_profiles?select=time_zone&id=eq.8d46e542-e016-4b0a-92e7-d8c4aaa1c13a (returns 406)
```

## Root Cause Analysis

### 1. **Schema Mismatch Between Migrations and TypeScript Types**

The project has multiple conflicting `user_profiles` table definitions across different migration files:

**Nuclear Rebuild Migration (20250907201317_nuclear_rebuild.sql)** - MINIMAL SCHEMA:
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**TypeScript Types (lib/supabase/types.ts)** - ENHANCED SCHEMA:
```typescript
export interface EnhancedUserProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  time_zone: string;
  default_calendar_view: string;
  email_notifications: boolean;
  push_notifications: boolean;
  preferred_pronouns?: string;  // ❌ MISSING
  bio?: string;                 // ❌ MISSING
  relationship_preferences?: Record<string, any>; // ❌ MISSING
  calendar_color_scheme: CalendarColorScheme;     // ❌ MISSING
  onboarding_source?: OnboardingSource;          // ❌ MISSING
  marketing_consent: boolean;                    // ❌ MISSING
  newsletter_consent: boolean;                   // ❌ MISSING
  created_at: string;
  updated_at: string;
}
```

**Consolidated Schema Migration (20250829000000_consolidated_schema.sql)** - MIDDLE GROUND:
```sql
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    username TEXT UNIQUE,                       // ❌ NOT IN NUCLEAR REBUILD
    email_consent BOOLEAN DEFAULT FALSE,        // ❌ NOT IN NUCLEAR REBUILD
    email_preferences JSONB DEFAULT '...',      // ❌ NOT IN NUCLEAR REBUILD
    beta_participant BOOLEAN DEFAULT FALSE,     // ❌ NOT IN NUCLEAR REBUILD
    data_collection_consent BOOLEAN DEFAULT FALSE, // ❌ NOT IN NUCLEAR REBUILD
    selected_calendars TEXT[] DEFAULT '{}',     // ❌ NOT IN NUCLEAR REBUILD
    onboarding_completed BOOLEAN DEFAULT FALSE, // ❌ NOT IN NUCLEAR REBUILD
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. **Migration History Inconsistency**

The project has multiple migration approaches:
- **Latest Applied**: `20250907201317_nuclear_rebuild.sql` (minimal schema)
- **More Complete**: `20250829000000_consolidated_schema.sql` (more fields)
- **TypeScript Expects**: `EnhancedUserProfile` (most comprehensive)

### 3. **Missing Database Objects**

The current setup is missing:
- ✅ **Table exists** (basic `user_profiles`)
- ❌ **Missing columns** (enhanced profile fields)
- ✅ **RLS policies exist**
- ✅ **Triggers exist** (`handle_new_user` function)
- ❌ **Schema mismatches** cause query failures

## Specific Issues Found

### API Calls Failing
- `/api/user/timezone/route.ts` queries `user_profiles.time_zone`
- `lib/time-zones/time-zone-context.tsx` expects enhanced profile fields
- Frontend assumes fields exist that may not be in database

### Files Expecting Enhanced Schema
1. **`/app/api/user/timezone/route.ts`** - Basic time_zone query (✅ should work)
2. **`/lib/time-zones/time-zone-context.tsx`** - Complex profile queries
3. **TypeScript types** - Comprehensive field definitions
4. **Onboarding flows** - Enhanced profile field usage

### Migration File Conflicts
- `fix-group-permissions-comprehensive.sql` - References missing tables
- `20241220_add_encryption_keys.sql` - Adds encryption to non-existent fields
- `20241221_add_user_master_keys.sql` - Builds on missing schema

## Solution

### 1. **Comprehensive Schema Fix** ✅ CREATED
**File**: `/migrations/fix_user_profiles_schema.sql`

This migration:
- ✅ Backs up existing data
- ✅ Creates comprehensive `user_profiles` table matching TypeScript types
- ✅ Includes all required fields from all migration versions
- ✅ Preserves existing user data
- ✅ Updates RLS policies and triggers
- ✅ Adds proper indexes and constraints

### 2. **Diagnostic Tools** ✅ CREATED
**Files**:
- `/scripts/diagnose-user-profiles-issue.js` - JavaScript diagnostic
- `/scripts/test-user-profiles-fix.sql` - SQL verification tests

### 3. **Verification Process**
1. Run diagnostic script to confirm current state
2. Apply schema fix migration
3. Run test script to verify resolution
4. Test API endpoints

## Fields Added by Fix

### Core Profile Fields (from nuclear rebuild)
- `id`, `full_name`, `avatar_url`, `time_zone`, `default_calendar_view`
- `email_notifications`, `push_notifications`, `created_at`, `updated_at`

### Extended Fields (from consolidated schema)
- `username`, `email_consent`, `email_preferences`, `beta_participant`
- `data_collection_consent`, `selected_calendars`, `onboarding_completed`

### Enhanced Fields (from TypeScript types)
- `preferred_pronouns`, `bio`, `relationship_preferences`
- `calendar_color_scheme`, `onboarding_source`
- `marketing_consent`, `newsletter_consent`

### Subscription Fields (from subscription migration)
- `subscription_tier`, `max_file_size_mb`
- `max_events_per_month`, `max_relationships`

## Required Enums
- `calendar_color_scheme` - Color scheme preferences
- `onboarding_source` - User acquisition tracking

## Next Steps

1. **Apply the Fix**:
   ```bash
   # Run in Supabase SQL Editor or via CLI
   psql -f migrations/fix_user_profiles_schema.sql
   ```

2. **Verify Resolution**:
   ```bash
   # Test the diagnostic script
   node scripts/diagnose-user-profiles-issue.js

   # Run SQL verification
   psql -f scripts/test-user-profiles-fix.sql
   ```

3. **Test API Endpoints**:
   ```bash
   # This should no longer return PGRST116
   curl "GET user_profiles?select=time_zone&id=eq.USER_ID"
   ```

4. **Update Frontend Code** (if needed):
   - Ensure queries match available fields
   - Add error handling for missing profile records
   - Implement proper user profile creation flow

## Prevention

To prevent similar issues:
1. **Standardize schema migrations** - One source of truth
2. **Keep TypeScript types in sync** with database schema
3. **Add integration tests** for API endpoints
4. **Use migration validation** before applying
5. **Document schema changes** in both SQL and TypeScript

---

**Status**: ✅ **ANALYSIS COMPLETE** - Fix ready to apply
**Files Created**:
- `migrations/fix_user_profiles_schema.sql` (comprehensive fix)
- `scripts/diagnose-user-profiles-issue.js` (diagnostic tool)
- `scripts/test-user-profiles-fix.sql` (verification tests)