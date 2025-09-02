-- ======================================================================
-- ROLLBACK SCRIPT FOR CONSOLIDATED MIGRATION
-- Generated: 2025-09-02T06:04:05.760Z
-- Purpose: Rollback all changes made by consolidated migration
-- ======================================================================

-- ======================================================================
-- STEP 1: DROP POLICIES
-- ======================================================================

-- Drop all RLS policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    END LOOP;
END $$;

-- ======================================================================
-- STEP 2: DROP INDEXES
-- ======================================================================

-- Drop all custom indexes
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE '%_unique'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
    END LOOP;
END $$;

-- ======================================================================
-- STEP 3: DROP TABLES (in reverse dependency order)
-- ======================================================================

-- Drop tables in reverse order to handle dependencies
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS conflict_check_metrics CASCADE;
DROP TABLE IF EXISTS availability_windows CASCADE;
DROP TABLE IF EXISTS conflict_audit_log CASCADE;
DROP TABLE IF EXISTS availability_cache CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS csrf_tokens CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;
DROP TABLE IF EXISTS event_attachments CASCADE;
DROP TABLE IF EXISTS relationship_group_members CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS calendar_shares CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS invitation_tokens CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS contact_group_members CASCADE;
DROP TABLE IF EXISTS contact_groups CASCADE;
DROP TABLE IF EXISTS contact_tag_relationships CASCADE;
DROP TABLE IF EXISTS contact_tags CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS event_visibility CASCADE;
DROP TABLE IF EXISTS event_permissions CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS relationship_groups CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ======================================================================
-- STEP 4: DROP ENUM TYPES
-- ======================================================================

DROP TYPE IF EXISTS privacy_level_enum CASCADE;
DROP TYPE IF EXISTS relationship_type_enum CASCADE;
DROP TYPE IF EXISTS event_status_enum CASCADE;
DROP TYPE IF EXISTS invitation_status_enum CASCADE;
DROP TYPE IF EXISTS reminder_type_enum CASCADE;
DROP TYPE IF EXISTS connection_tier CASCADE;
DROP TYPE IF EXISTS event_privacy_override CASCADE;

-- ======================================================================
-- VERIFICATION
-- ======================================================================

DO $$
DECLARE
    remaining_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'user_profiles', 'relationship_groups', 'relationships',
        'relationship_group_members', 'events', 'event_permissions',
        'event_visibility', 'event_attachments', 'contacts', 'contact_tags',
        'contact_tag_relationships', 'contact_groups', 'contact_group_members',
        'invitations', 'invitation_tokens', 'calendar_integrations',
        'calendar_shares', 'reminders', 'user_preferences', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics', 'permission_audit_logs'
    );
    
    IF remaining_tables = 0 THEN
        RAISE NOTICE 'Rollback completed successfully! All tables removed.';
    ELSE
        RAISE WARNING 'Rollback incomplete. % tables still exist.', remaining_tables;
    END IF;
END $$;

-- ======================================================================
-- END OF ROLLBACK SCRIPT
-- ======================================================================
