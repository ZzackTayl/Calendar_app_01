# Complete Database Migration Execution Guide

> **Senior Developer Approach**: Production-safe, comprehensive migration with full rollback capability

## Pre-Flight Checklist ✈️

- [ ] **Review** `MIGRATION_PLAN.md` for strategy overview
- [ ] **Verify** you have access to Supabase SQL Editor
- [ ] **Confirm** this is not peak usage time (if production)
- [ ] **Backup** environment variables (`.env.local`)
- [ ] **Notify** stakeholders of maintenance window (if applicable)

---

## Migration Steps

### Step 1: Create Data Backups 📦

**File**: `scripts/migration-backup.sql`

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy entire contents of `migration-backup.sql`
3. **Run the script**
4. **Verify**: Should see "Created backup" messages for each table
5. **Confirm**: Backup verification shows all existing tables backed up

**Expected Output**:
```
NOTICE: Created backup: backup_events_20250907
NOTICE: Created backup: backup_relationships_20250907
NOTICE: Created backup: backup_users_20250907
...
```

### Step 2: Apply Schema Migration 🏗️

**File**: `supabase/migrations/consolidated/20250903000000_consolidated_schema_final_fixed.sql`

1. In **SQL Editor**, create a **new query**
2. Copy entire contents of the consolidated schema migration
3. **Run the migration** (this will take 1-2 minutes)
4. **Watch for errors** - if any occur, stop and review

**Expected Behavior**:
- Creates missing tables (event_visibility, contacts, user_profiles, etc.)
- Creates enum types (connection_tier, event_privacy_override)
- Adds foreign key constraints
- Enables RLS on all tables (but no policies yet)

### Step 3: Apply RLS Policies Migration 🔐

**File**: `supabase/migrations/20250904000000_comprehensive_rls_policies.sql`

1. In **SQL Editor**, create **another new query**
2. Copy entire contents of the RLS policies migration
3. **Run the migration** (this will take 2-3 minutes)
4. **Watch for the final "Comprehensive RLS policies migration completed successfully!" message**

**Expected Behavior**:
- Creates helper functions (`can_view_user_calendar`, `can_view_event_details`)
- Creates comprehensive RLS policies on all tables
- Creates `verify_rls_policies()` function
- Runs automatic verification

### Step 4: Run Verification ✅

**File**: `scripts/post-migration-verification.sql`

1. In **SQL Editor**, create **another new query**
2. Copy entire contents of verification script
3. **Run the verification**
4. **Review all results carefully**

**Success Criteria**:
- ✅ All tables show `EXISTS`
- ✅ All RLS shows `ENABLED`
- ✅ All policies show `COMPLETE`
- ✅ All helper functions show `EXISTS`
- ✅ Data integrity shows `DATA_PRESERVED`
- ✅ Security test shows `SECURE`
- ✅ Migration summary shows `SUCCESS`

---

## If Something Goes Wrong 🚨

### Immediate Actions:
1. **Don't panic** - we have full backups
2. **Note the error message** and exact step where it occurred
3. **Stop running additional migrations**
4. **Run the rollback procedure**

### Rollback Procedure:

**File**: `scripts/rollback-migration.sql`

1. Open **new SQL Editor query**
2. Copy entire contents of rollback script
3. **Run the rollback** (takes 1-2 minutes)
4. **Verify rollback success** - should restore original state
5. **Review backup data** is intact

---

## Post-Migration Tasks ✨

After successful migration:

### 1. Update Documentation
- [ ] Mark migration as completed in project logs
- [ ] Update any API documentation if needed
- [ ] Update environment setup guides

### 2. Monitor Performance
- [ ] Check application response times
- [ ] Monitor database query performance
- [ ] Watch for any user-reported issues

### 3. Clean Up (After 1 Week)
- [ ] If everything is working well, consider removing backup tables
- [ ] Archive migration scripts
- [ ] Update deployment procedures

### 4. Test Key Functionality
- [ ] User registration/login
- [ ] Event creation with different privacy levels
- [ ] Relationship sharing works correctly
- [ ] File uploads to attachments bucket
- [ ] Calendar integrations (if applicable)

---

## Troubleshooting Common Issues

### "Function X does not exist"
- **Cause**: RLS migration didn't complete fully
- **Fix**: Re-run the RLS migration script

### "Table X already exists" 
- **Cause**: Partial migration was already applied
- **Fix**: This is normal - script uses `CREATE TABLE IF NOT EXISTS`

### "Policy already exists"
- **Cause**: RLS policies were partially applied
- **Fix**: Script uses `DROP POLICY IF EXISTS` then recreates

### "Data integrity shows DATA_LOST"
- **Cause**: Something went wrong during migration
- **Fix**: **IMMEDIATELY run rollback script**

### "Security test shows SECURITY_ISSUE"
- **Cause**: RLS policies aren't working correctly
- **Fix**: Review RLS migration logs, may need rollback

---

## Migration Timeline Estimate

| Step | Estimated Time | Critical? |
|------|----------------|-----------|
| Backup | 2-3 minutes | ✅ Yes |
| Schema Migration | 5-8 minutes | ✅ Yes |
| RLS Migration | 8-12 minutes | ✅ Yes |
| Verification | 3-5 minutes | ✅ Yes |
| **Total** | **18-28 minutes** | |

---

## Contact & Support

If you encounter issues:
1. **First**: Try the rollback procedure
2. **Document**: Exact error messages and steps taken
3. **Review**: Check Supabase logs for additional details
4. **Backup**: Ensure your backup tables are intact

---

## Success Confirmation 🎉

You'll know the migration was successful when:
- ✅ All 29 expected tables exist
- ✅ All tables have "COMPLETE" RLS status
- ✅ Verification shows "SUCCESS"
- ✅ Your application still works normally
- ✅ No data was lost (verified by data integrity check)

**Final Status**: Your database now has:
- Complete schema with all permission tables
- Comprehensive security via RLS policies
- Proper relationship-based sharing
- Event permissions working correctly
- Full audit logging capability
