-- Create RLS Verification Function
-- Run this in your Supabase SQL Editor to create the verification function

CREATE OR REPLACE FUNCTION verify_rls_policies()
RETURNS TABLE(table_name text, policy_count integer, status text) AS $$
DECLARE
    tables_to_check text[] := ARRAY[
        'users', 'user_profiles', 'relationships', 'events', 'relationship_groups',
        'event_permissions', 'event_visibility', 'event_attachments', 'contacts',
        'contact_tags', 'contact_tag_relationships', 'contact_groups', 
        'contact_group_members', 'invitations', 'invitation_tokens',
        'calendar_integrations', 'calendar_shares', 'reminders', 'user_preferences',
        'relationship_group_members', 'permission_audit_logs', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics'
    ];
    table_name_var text;
    policy_count_var integer;
    table_exists_var boolean;
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_check
    LOOP
        -- Check if table exists first
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND information_schema.tables.table_name = table_name_var
        ) INTO table_exists_var;
        
        IF NOT table_exists_var THEN
            -- Table doesn't exist
            RETURN QUERY SELECT 
                table_name_var,
                0::integer,
                'TABLE MISSING'::text;
        ELSE
            -- Count policies for each table
            SELECT COUNT(*) INTO policy_count_var
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = table_name_var;
            
            -- Return results
            RETURN QUERY SELECT 
                table_name_var,
                policy_count_var,
                CASE 
                    WHEN policy_count_var = 0 THEN 'NO POLICIES'
                    WHEN policy_count_var < 3 THEN 'INCOMPLETE'
                    ELSE 'COMPLETE'
                END::text;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;

-- Run the verification
SELECT * FROM verify_rls_policies() ORDER BY table_name;
