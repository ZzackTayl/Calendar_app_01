-- ======================================================================
-- POST-MIGRATION VERIFICATION SCRIPT
-- ======================================================================
-- Purpose: Comprehensive verification that migration was successful
-- Run this AFTER completing both schema and RLS migrations

-- 1. Verify all expected tables exist
WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'users', 'user_profiles', 'relationships', 'events', 'relationship_groups',
        'event_permissions', 'event_visibility', 'event_attachments', 'contacts',
        'contact_tags', 'contact_tag_relationships', 'contact_groups', 
        'contact_group_members', 'invitations', 'invitation_tokens',
        'calendar_integrations', 'calendar_shares', 'reminders', 'user_preferences',
        'relationship_group_members', 'permission_audit_logs', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics'
    ]) as expected_table
)
SELECT 
    '1_TABLE_EXISTENCE' as check_type,
    e.expected_table as table_name,
    CASE WHEN t.table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM expected_tables e
LEFT JOIN information_schema.tables t ON e.expected_table = t.table_name 
    AND t.table_schema = 'public'
ORDER BY e.expected_table;

-- 2. Verify RLS is enabled on all tables
SELECT 
    '2_RLS_STATUS' as check_type,
    tablename as table_name,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables 
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'backup_%'
ORDER BY tablename;

-- 3. Verify RLS policies exist (should be COMPLETE for all)
SELECT '3_POLICY_STATUS' as check_type, * FROM verify_rls_policies() ORDER BY table_name;

-- 4. Verify helper functions exist
SELECT 
    '4_HELPER_FUNCTIONS' as check_type,
    proname as table_name,
    'EXISTS' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname IN ('can_view_user_calendar', 'can_view_event_details', 'verify_rls_policies')
ORDER BY proname;

-- 5. Verify enum types exist
SELECT 
    '5_ENUM_TYPES' as check_type,
    typname as table_name,
    'EXISTS' as status
FROM pg_type t
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND typname IN ('privacy_level_enum', 'relationship_type_enum', 'event_status_enum', 
                    'invitation_status_enum', 'reminder_type_enum', 'connection_tier', 
                    'event_privacy_override')
ORDER BY typname;

-- 6. Verify foreign key constraints
SELECT 
    '6_FOREIGN_KEYS' as check_type,
    tc.table_name || '.' || kcu.column_name as table_name,
    'CONSTRAINT_EXISTS' as status
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
    AND tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name NOT LIKE 'backup_%'
ORDER BY tc.table_name, kcu.column_name;

-- 7. Data integrity check - verify no data was lost
WITH data_comparison AS (
    SELECT 
        'events' as table_name,
        (SELECT COUNT(*) FROM events) as current_count,
        (SELECT COUNT(*) FROM backup_events_20250907) as backup_count
    UNION ALL
    SELECT 
        'relationships' as table_name,
        (SELECT COUNT(*) FROM relationships) as current_count,
        (SELECT COUNT(*) FROM backup_relationships_20250907) as backup_count
    UNION ALL
    SELECT 
        'users' as table_name,
        (SELECT COUNT(*) FROM users) as current_count,
        (SELECT COUNT(*) FROM backup_users_20250907) as backup_count
)
SELECT 
    '7_DATA_INTEGRITY' as check_type,
    table_name,
    CASE 
        WHEN current_count = backup_count THEN 'DATA_PRESERVED'
        WHEN current_count > backup_count THEN 'DATA_INCREASED'
        ELSE 'DATA_LOST'
    END as status
FROM data_comparison;

-- 8. Performance check - basic query timing
EXPLAIN (ANALYZE, BUFFERS) 
SELECT COUNT(*) FROM events WHERE user_id = (SELECT id FROM users LIMIT 1);

-- 9. Security test - verify RLS is working
-- This should return 0 if RLS is properly blocking access
SELECT 
    '9_SECURITY_TEST' as check_type,
    'unauthorized_access_blocked' as table_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'SECURE'
        ELSE 'SECURITY_ISSUE'
    END as status
FROM (
    -- Try to access data without proper auth context
    -- This should be blocked by RLS policies
    SELECT * FROM events 
    WHERE user_id != auth.uid() 
    LIMIT 1
) unauthorized_query;

-- 10. Final summary
SELECT 
    '10_MIGRATION_SUMMARY' as check_type,
    'COMPLETED' as table_name,
    CASE 
        WHEN (SELECT COUNT(*) FROM verify_rls_policies() WHERE status != 'COMPLETE') = 0
        THEN 'SUCCESS'
        ELSE 'ISSUES_DETECTED'
    END as status;

-- Display final message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'MIGRATION VERIFICATION COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Review the results above:';
    RAISE NOTICE '• All tables should show EXISTS';
    RAISE NOTICE '• All RLS should show ENABLED';
    RAISE NOTICE '• All policies should show COMPLETE';
    RAISE NOTICE '• All helper functions should show EXISTS';
    RAISE NOTICE '• Data integrity should show DATA_PRESERVED';
    RAISE NOTICE '• Security test should show SECURE';
    RAISE NOTICE '• Final status should show SUCCESS';
    RAISE NOTICE '';
    RAISE NOTICE 'If any issues are detected, check the rollback procedures.';
    RAISE NOTICE '======================================================================';
END;
$$;
