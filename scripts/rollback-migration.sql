-- ======================================================================
-- COMPLETE MIGRATION ROLLBACK SCRIPT
-- ======================================================================
-- Purpose: Restore database to pre-migration state if issues occur
-- WARNING: This will remove all migration changes and restore backup data

-- STEP 1: Drop all RLS policies (in reverse dependency order)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy: % on %', policy_record.policyname, policy_record.tablename;
    END LOOP;
END;
$$;

-- STEP 2: Drop helper functions
DROP FUNCTION IF EXISTS can_view_user_calendar(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_event_details(UUID, UUID);
DROP FUNCTION IF EXISTS verify_rls_policies();

-- STEP 3: Drop new tables that were created in migration (preserve existing data tables)
DROP TABLE IF EXISTS availability_cache CASCADE;
DROP TABLE IF EXISTS availability_windows CASCADE;
DROP TABLE IF EXISTS calendar_shares CASCADE;
DROP TABLE IF EXISTS conflict_audit_log CASCADE;
DROP TABLE IF EXISTS conflict_check_metrics CASCADE;
DROP TABLE IF EXISTS contact_group_members CASCADE;
DROP TABLE IF EXISTS contact_groups CASCADE;
DROP TABLE IF EXISTS contact_tag_relationships CASCADE;
DROP TABLE IF EXISTS contact_tags CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;
DROP TABLE IF EXISTS event_attachments CASCADE;
DROP TABLE IF EXISTS event_visibility CASCADE;
DROP TABLE IF EXISTS invitation_tokens CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;

-- STEP 4: Disable RLS on remaining tables
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE csrf_tokens DISABLE ROW LEVEL SECURITY;

-- STEP 5: Drop new enum types (if they don't have dependencies)
DO $$
BEGIN
    DROP TYPE IF EXISTS connection_tier CASCADE;
    DROP TYPE IF EXISTS event_privacy_override CASCADE;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not drop enum types (may have dependencies): %', SQLERRM;
END;
$$;

-- STEP 6: Restore data from backups (if backups exist)
DO $$
DECLARE
    table_name text;
    restore_sql text;
    backup_exists boolean;
BEGIN
    -- List of tables that might have backups
    FOR table_name IN 
        SELECT unnest(ARRAY['events', 'relationships', 'users', 'invitations', 
                           'relationship_groups', 'relationship_group_members', 
                           'event_permissions', 'calendar_integrations', 'csrf_tokens'])
    LOOP
        -- Check if backup table exists
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'backup_' || table_name || '_20250907'
        ) INTO backup_exists;
        
        IF backup_exists THEN
            -- Truncate current table and restore from backup
            EXECUTE format('TRUNCATE TABLE %I CASCADE', table_name);
            EXECUTE format('INSERT INTO %I SELECT * FROM backup_%s_20250907', 
                          table_name, table_name);
            RAISE NOTICE 'Restored data for table: %', table_name;
        ELSE
            RAISE NOTICE 'No backup found for table: %', table_name;
        END IF;
    END LOOP;
END;
$$;

-- STEP 7: Verification - show current state
SELECT 
    'POST_ROLLBACK_TABLES' as check_type,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'backup_%'
ORDER BY table_name;

-- Show RLS status (should all be disabled)
SELECT 
    'POST_ROLLBACK_RLS' as check_type,
    tablename as table_name,
    CASE WHEN rowsecurity THEN 'STILL_ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'backup_%'
ORDER BY tablename;

-- Show policy count (should all be 0)
SELECT 
    'POST_ROLLBACK_POLICIES' as check_type,
    tablename as table_name,
    COUNT(*) || '_POLICIES' as status
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'backup_%'
GROUP BY tablename
ORDER BY tablename;

-- STEP 8: Optional - Clean up backup tables
-- Uncomment these lines if you want to remove backup tables after rollback
-- WARNING: This will permanently delete backup data
/*
DO $$
DECLARE
    backup_table text;
BEGIN
    FOR backup_table IN
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'backup_%_20250907'
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS %I', backup_table);
        RAISE NOTICE 'Dropped backup table: %', backup_table;
    END LOOP;
END;
$$;
*/

-- Final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'ROLLBACK COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Database has been restored to pre-migration state:';
    RAISE NOTICE '• New tables have been dropped';
    RAISE NOTICE '• RLS policies have been removed';
    RAISE NOTICE '• Helper functions have been dropped';
    RAISE NOTICE '• Original data has been restored from backups';
    RAISE NOTICE '';
    RAISE NOTICE 'Review the verification results above to confirm rollback success.';
    RAISE NOTICE 'Backup tables (backup_*_20250907) are preserved for safety.';
    RAISE NOTICE '======================================================================';
END;
$$;
