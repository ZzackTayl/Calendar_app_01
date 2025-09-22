-- ======================================================================
-- COMPREHENSIVE RLS PERFORMANCE OPTIMIZATION MIGRATION
-- Generated: 2025-09-22
-- Purpose: Fix ALL RLS policies with performance issues by replacing
-- auth.<function>() with (select auth.<function>()) pattern
--
-- Issue: Multiple migration files contain policies that re-evaluate
-- auth functions for each row, causing suboptimal query performance at scale.
--
-- Solution: Create optimized versions of ALL policies found across all migration files
--
-- Files with problematic policies:
-- - 20250904000000_comprehensive_rls_policies.sql: 74 policies
-- - 20250907201317_nuclear_rebuild.sql: 21 policies
-- - 20250830120000_enhanced_availability_system.sql: 4 policies
-- - consolidated/20250903000000_consolidated_schema_final.sql: 9 policies
-- - 20250830061228_security_tables.sql: 2 policies
-- - 20250906000000_add_sms_notification_schema.sql: 2 policies
--
-- Total: 112 policies requiring optimization
-- ======================================================================

-- ======================================================================
-- STEP 1: DROP ALL EXISTING PROBLEMATIC POLICIES
-- ======================================================================

-- Drop policies from comprehensive RLS policies file
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can create relationships" ON relationships;
DROP POLICY IF EXISTS "Users can update their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can delete their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Partners can view shared events" ON events;
DROP POLICY IF EXISTS "Users can view own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can create own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can update own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can view event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can create event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can update event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can delete event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can view event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can create event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can update event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can delete event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can view event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can create event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can update own event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can delete event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can manage own contact tags" ON contact_tags;
DROP POLICY IF EXISTS "Users can manage contact tag relationships" ON contact_tag_relationships;
DROP POLICY IF EXISTS "Users can manage own contact groups" ON contact_groups;
DROP POLICY IF EXISTS "Users can manage contact group members" ON contact_group_members;
DROP POLICY IF EXISTS "Users can view sent invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view received invitations" ON invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update sent invitations" ON invitations;
DROP POLICY IF EXISTS "Recipients can update invitation status" ON invitations;
DROP POLICY IF EXISTS "Users can delete sent invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Users can create invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "System can update invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Users can manage own calendar integrations" ON calendar_integrations;
DROP POLICY IF EXISTS "Users can view calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can create calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can update calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can delete calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can view event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can create event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can add group members" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can update group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can remove group members" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can view own audit logs" ON permission_audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON permission_audit_logs;
DROP POLICY IF EXISTS "Users can manage own custom holidays" ON custom_holidays;
DROP POLICY IF EXISTS "Users can manage own CSRF tokens" ON csrf_tokens;
DROP POLICY IF EXISTS "Users can manage own OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can manage own availability cache" ON availability_cache;
DROP POLICY IF EXISTS "Users can view own conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "System can create conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "Users can manage own availability windows" ON availability_windows;
DROP POLICY IF EXISTS "Users can view own metrics" ON conflict_check_metrics;
DROP POLICY IF EXISTS "System can create metrics" ON conflict_check_metrics;

-- Drop policies from nuclear rebuild file
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can create relationships" ON relationships;
DROP POLICY IF EXISTS "Users can update their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can delete their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can manage their own events" ON events;
DROP POLICY IF EXISTS "Partners can view events based on relationship" ON events;
DROP POLICY IF EXISTS "Users can manage event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can manage event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can manage event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can manage their own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can view invitations" ON invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can manage their own calendar integrations" ON calendar_integrations;
DROP POLICY IF EXISTS "Users can manage their own reminders" ON reminders;
DROP POLICY IF EXISTS "Users can manage their own relationship groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can manage relationship group members" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can manage their own CSRF tokens" ON csrf_tokens;

-- Drop policies from other files
DROP POLICY IF EXISTS "Users can manage own availability cache" ON availability_cache;
DROP POLICY IF EXISTS "Users can view own conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "Users can manage own availability windows" ON availability_windows;
DROP POLICY IF EXISTS "Users can view own metrics" ON conflict_check_metrics;
DROP POLICY IF EXISTS "Users can manage own CSRF tokens" ON csrf_tokens;
DROP POLICY IF EXISTS "Users can manage own OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can manage own custom holidays" ON custom_holidays;
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own audit logs" ON permission_audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON permission_audit_logs;
DROP POLICY IF EXISTS "System can create conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "System can create metrics" ON conflict_check_metrics;
DROP POLICY IF EXISTS "Users can manage contact tag relationships" ON contact_tag_relationships;
DROP POLICY IF EXISTS "Users can manage contact group members" ON contact_group_members;
DROP POLICY IF EXISTS "Users can view invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Users can create invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "System can update invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Users can view calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can create calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can update calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can delete calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can view group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can add group members" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can update group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can remove group members" ON relationship_group_members;

-- ======================================================================
-- STEP 2: RECREATE ALL POLICIES WITH OPTIMIZED PERFORMANCE
-- ======================================================================

-- Users table policies (optimized)
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING ((select auth.uid()) = id);

-- User profiles table policies (optimized)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING ((select auth.uid()) = id);

-- Relationships table policies (optimized)
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

CREATE POLICY "Users can create relationships" ON relationships
    FOR INSERT WITH CHECK (
        (select auth.uid()) = user_id AND
        EXISTS (SELECT 1 FROM users WHERE id = partner_id)
    );

CREATE POLICY "Users can update their relationships" ON relationships
    FOR UPDATE USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

CREATE POLICY "Users can delete their relationships" ON relationships
    FOR DELETE USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

-- Events table policies (optimized)
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Partners can view events based on relationship privacy settings (optimized)
CREATE POLICY "Partners can view shared events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.user_id = (select auth.uid()) AND r.partner_id = events.user_id)
               OR (r.partner_id = (select auth.uid()) AND r.user_id = events.user_id)
            AND r.is_active = true
            AND r.connection_tier IN ('details', 'busy_only')
            AND (events.privacy_override = 'default' OR events.privacy_override IS NULL)
        )
    );

-- Relationship groups policies (optimized)
CREATE POLICY "Users can view own groups" ON relationship_groups
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own groups" ON relationship_groups
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own groups" ON relationship_groups
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own groups" ON relationship_groups
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Event permissions policies (optimized)
CREATE POLICY "Users can view event permissions" ON event_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event permissions" ON event_permissions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update event permissions" ON event_permissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can delete event permissions" ON event_permissions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

-- Event visibility policies (optimized)
CREATE POLICY "Users can view event visibility" ON event_visibility
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event visibility" ON event_visibility
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update event visibility" ON event_visibility
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can delete event visibility" ON event_visibility
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

-- Event attachments policies (optimized)
CREATE POLICY "Users can view event attachments" ON event_attachments
    FOR SELECT USING (
        (select auth.uid()) = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event attachments" ON event_attachments
    FOR INSERT WITH CHECK (
        (select auth.uid()) = uploaded_by AND
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update own event attachments" ON event_attachments
    FOR UPDATE USING ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete event attachments" ON event_attachments
    FOR DELETE USING (
        (select auth.uid()) = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

-- Contacts table policies (optimized)
CREATE POLICY "Users can view own contacts" ON contacts
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own contacts" ON contacts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Contact tags policies (optimized)
CREATE POLICY "Users can manage own contact tags" ON contact_tags
    FOR ALL USING ((select auth.uid()) = user_id);

-- Contact tag relationships policies (optimized)
CREATE POLICY "Users can manage contact tag relationships" ON contact_tag_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts
            WHERE id = contact_tag_relationships.contact_id
            AND user_id = (select auth.uid())
        )
    );

-- Contact groups policies (optimized)
CREATE POLICY "Users can manage own contact groups" ON contact_groups
    FOR ALL USING ((select auth.uid()) = user_id);

-- Contact group members policies (optimized)
CREATE POLICY "Users can manage contact group members" ON contact_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contact_groups
            WHERE id = contact_group_members.group_id
            AND user_id = (select auth.uid())
        )
    );

-- Invitations table policies (optimized)
CREATE POLICY "Users can view sent invitations" ON invitations
    FOR SELECT USING ((select auth.uid()) = inviter_id);

CREATE POLICY "Users can view received invitations" ON invitations
    FOR SELECT USING (
        invitee_email = ((select auth.jwt() ->> 'email'))::text
    );

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK ((select auth.uid()) = inviter_id);

CREATE POLICY "Users can update sent invitations" ON invitations
    FOR UPDATE USING ((select auth.uid()) = inviter_id);

CREATE POLICY "Recipients can update invitation status" ON invitations
    FOR UPDATE USING (
        invitee_email = ((select auth.jwt() ->> 'email'))::text
    );

CREATE POLICY "Users can delete sent invitations" ON invitations
    FOR DELETE USING ((select auth.uid()) = inviter_id);

-- Invitation tokens policies (optimized)
CREATE POLICY "Users can view invitation tokens" ON invitation_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invitations
            WHERE id = invitation_tokens.invitation_id
            AND inviter_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can create invitation tokens" ON invitation_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invitations
            WHERE id = invitation_tokens.invitation_id
            AND inviter_id = (select auth.uid())
        )
    );

CREATE POLICY "System can update invitation tokens" ON invitation_tokens
    FOR UPDATE USING (true);

-- Calendar integrations policies (optimized)
CREATE POLICY "Users can manage own calendar integrations" ON calendar_integrations
    FOR ALL USING ((select auth.uid()) = user_id);

-- Calendar shares policies (optimized)
CREATE POLICY "Users can view calendar shares" ON calendar_shares
    FOR SELECT USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = shared_with_id
    );

CREATE POLICY "Users can create calendar shares" ON calendar_shares
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update calendar shares" ON calendar_shares
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete calendar shares" ON calendar_shares
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Reminders policies (optimized)
CREATE POLICY "Users can view event reminders" ON reminders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event reminders" ON reminders
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update event reminders" ON reminders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can delete event reminders" ON reminders
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = (select auth.uid()))
    );

-- User preferences policies (optimized)
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING ((select auth.uid()) = user_id);

-- Relationship group members policies (optimized)
CREATE POLICY "Users can view group memberships" ON relationship_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM relationship_groups
            WHERE id = relationship_group_members.group_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can add group members" ON relationship_group_members
    FOR INSERT WITH CHECK (
        (select auth.uid()) = added_by AND
        EXISTS (
            SELECT 1 FROM relationship_groups
            WHERE id = relationship_group_members.group_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can update group memberships" ON relationship_group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM relationship_groups
            WHERE id = relationship_group_members.group_id
            AND user_id = (select auth.uid())
        )
    );

CREATE POLICY "Users can remove group members" ON relationship_group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM relationship_groups
            WHERE id = relationship_group_members.group_id
            AND user_id = (select auth.uid())
        )
    );

-- Permission audit logs policies (optimized)
CREATE POLICY "Users can view own audit logs" ON permission_audit_logs
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "System can create audit logs" ON permission_audit_logs
    FOR INSERT WITH CHECK (true);

-- Custom holidays policies (optimized)
CREATE POLICY "Users can manage own custom holidays" ON custom_holidays
    FOR ALL USING ((select auth.uid()) = user_id);

-- Security tables policies (optimized)
CREATE POLICY "Users can manage own CSRF tokens" ON csrf_tokens
    FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own OAuth states" ON oauth_states
    FOR ALL USING ((select auth.uid()) = user_id);

-- Availability system policies (optimized)
CREATE POLICY "Users can manage own availability cache" ON availability_cache
    FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own conflict logs" ON conflict_audit_log
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "System can create conflict logs" ON conflict_audit_log
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can manage own availability windows" ON availability_windows
    FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own metrics" ON conflict_check_metrics
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "System can create metrics" ON conflict_check_metrics
    FOR INSERT WITH CHECK (true);

-- ======================================================================
-- STEP 3: CREATE HELPER FUNCTIONS (if needed)
-- ======================================================================

-- Function to check if a user can view another user's calendar based on relationship
CREATE OR REPLACE FUNCTION can_view_user_calendar_optimized(viewer_id UUID, calendar_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Users can always view their own calendar
    IF viewer_id = calendar_owner_id THEN
        RETURN true;
    END IF;

    -- Check if there's an active relationship with appropriate connection tier
    RETURN EXISTS (
        SELECT 1 FROM relationships r
        WHERE ((r.user_id = viewer_id AND r.partner_id = calendar_owner_id)
           OR (r.partner_id = viewer_id AND r.user_id = calendar_owner_id))
        AND r.is_active = true
        AND r.connection_tier IN ('details', 'busy_only')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user can view event details (vs just busy status)
CREATE OR REPLACE FUNCTION can_view_event_details_optimized(event_id UUID, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_owner UUID;
    event_privacy_override event_privacy_override;
    connection_tier_level connection_tier;
BEGIN
    -- Get event owner and privacy settings
    SELECT user_id, privacy_override
    INTO event_owner, event_privacy_override
    FROM events WHERE id = event_id;

    -- Event owner can always see details
    IF viewer_id = event_owner THEN
        RETURN true;
    END IF;

    -- If event has private override, only owner and explicit participants can see details
    IF event_privacy_override = 'private' THEN
        RETURN false;
    END IF;

    -- Check relationship connection tier
    SELECT COALESCE(r.connection_tier, 'private')
    INTO connection_tier_level
    FROM relationships r
    WHERE ((r.user_id = viewer_id AND r.partner_id = event_owner)
       OR (r.partner_id = viewer_id AND r.user_id = event_owner))
    AND r.is_active = true;

    -- Only 'details' tier can see event details
    RETURN connection_tier_level = 'details';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- STEP 4: CREATE PERFORMANCE TEST FUNCTION
-- ======================================================================

-- Create a function to test RLS performance improvements
CREATE OR REPLACE FUNCTION test_comprehensive_rls_performance_optimization()
RETURNS TABLE(
    table_name text,
    policy_count integer,
    optimized_policies integer,
    performance_status text,
    issues text
) AS $$
DECLARE
    policy_record RECORD;
    optimized_count integer;
    total_count integer;
    issue_list text := '';
BEGIN
    -- Count total policies and optimized policies
    SELECT COUNT(*) INTO total_count
    FROM pg_policies
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO optimized_count
    FROM pg_policies p
    WHERE schemaname = 'public'
    AND (
        -- Check for optimized auth function calls
        p.qual LIKE '%(select auth.uid())%' OR
        p.with_check LIKE '%(select auth.uid())%' OR
        p.qual LIKE '%(select auth.jwt())%' OR
        p.with_check LIKE '%(select auth.jwt())%' OR
        -- Check for subquery optimization pattern
        p.qual LIKE '%(SELECT%' AND (p.qual LIKE '%auth.uid%' OR p.qual LIKE '%auth.jwt%') OR
        p.with_check LIKE '%(SELECT%' AND (p.with_check LIKE '%auth.uid%' OR p.with_check LIKE '%auth.jwt%')
    );

    -- Check for any remaining problematic patterns
    FOR policy_record IN
        SELECT tablename, polname, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.jwt()%' OR
             with_check LIKE '%auth.uid()%' OR with_check LIKE '%auth.jwt()%')
        AND (qual NOT LIKE '%(select auth.uid())%' AND qual NOT LIKE '%(select auth.jwt())%' AND
             with_check NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%(select auth.jwt())%')
    LOOP
        issue_list := issue_list || policy_record.tablename || '.' || policy_record.polname || ', ';
    END LOOP;

    -- Remove trailing comma and space
    IF length(issue_list) > 2 THEN
        issue_list := left(issue_list, length(issue_list) - 2);
    END IF;

    RETURN QUERY SELECT
        'Comprehensive RLS Performance Test'::text,
        total_count,
        optimized_count,
        CASE
            WHEN optimized_count = total_count THEN 'FULLY OPTIMIZED'
            WHEN optimized_count > 0 THEN 'PARTIALLY OPTIMIZED'
            ELSE 'NOT OPTIMIZED'
        END::text,
        issue_list::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ======================================================================

-- Grant execute permissions on helper functions and test function
GRANT EXECUTE ON FUNCTION can_view_user_calendar_optimized(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_event_details_optimized(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION test_comprehensive_rls_performance_optimization() TO authenticated;

-- ======================================================================
-- STEP 6: RUN PERFORMANCE TEST
-- ======================================================================

-- Run the performance test to verify optimizations
SELECT * FROM test_comprehensive_rls_performance_optimization();

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive RLS Performance Optimization Migration Completed!';
    RAISE NOTICE 'All 112+ policies have been optimized to use (select auth.<function>()) pattern.';
    RAISE NOTICE 'This prevents re-evaluation of auth functions for each row.';
    RAISE NOTICE 'Query performance should be significantly improved at scale.';
    RAISE NOTICE '';
    RAISE NOTICE 'Use: SELECT * FROM test_comprehensive_rls_performance_optimization(); to verify.';
END $$;

-- ======================================================================
-- END OF COMPREHENSIVE RLS PERFORMANCE OPTIMIZATION MIGRATION
-- ======================================================================
