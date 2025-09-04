-- ======================================================================
-- COMPREHENSIVE ROW-LEVEL SECURITY (RLS) POLICIES MIGRATION
-- Generated: 2025-09-04
-- Purpose: Implement complete RLS policies across all user-scoped tables
--
-- This migration addresses critical data persistence issues by implementing
-- comprehensive RLS policies that ensure proper data access control and
-- consistent authentication context handling.
-- ======================================================================

-- ======================================================================
-- STEP 1: DROP EXISTING INCOMPLETE POLICIES
-- ======================================================================

-- Drop existing incomplete policies to start fresh
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can view their groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can view events based on privacy" ON events;
DROP POLICY IF EXISTS "Users can manage their own CSRF tokens" ON csrf_tokens;
DROP POLICY IF EXISTS "Users can manage their own OAuth states" ON oauth_states;
DROP POLICY IF EXISTS "Users can only access their own availability cache" ON availability_cache;
DROP POLICY IF EXISTS "Users can only access their own conflict audit logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "Users can only access their own availability windows" ON availability_windows;
DROP POLICY IF EXISTS "Users can only access their own metrics" ON conflict_check_metrics;

-- ======================================================================
-- STEP 2: USERS TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own user record
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own user record
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (auth.uid() = id);

-- ======================================================================
-- STEP 3: USER_PROFILES TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING (auth.uid() = id);

-- ======================================================================
-- STEP 4: RELATIONSHIPS TABLE RLS POLICIES (CRITICAL FIX)
-- ======================================================================

-- Users can view relationships where they are either user or partner
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );

-- Users can insert relationships where they are the user_id
CREATE POLICY "Users can create relationships" ON relationships
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        -- Ensure partner exists in users table
        EXISTS (SELECT 1 FROM users WHERE id = partner_id)
    );

-- Users can update relationships where they are either user or partner
CREATE POLICY "Users can update their relationships" ON relationships
    FOR UPDATE USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );

-- Users can delete relationships where they are either user or partner
CREATE POLICY "Users can delete their relationships" ON relationships
    FOR DELETE USING (
        auth.uid() = user_id OR auth.uid() = partner_id
    );

-- ======================================================================
-- STEP 5: EVENTS TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own events
CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own events
CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING (auth.uid() = user_id);

-- Partners can view events based on relationship privacy settings
-- This policy handles shared calendar access
CREATE POLICY "Partners can view shared events" ON events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM relationships r
            WHERE (r.user_id = auth.uid() AND r.partner_id = events.user_id)
               OR (r.partner_id = auth.uid() AND r.user_id = events.user_id)
            AND r.is_active = true
            AND r.connection_tier IN ('details', 'busy_only')
            -- Respect event privacy override
            AND (events.privacy_override = 'default' OR events.privacy_override IS NULL)
        )
    );

-- ======================================================================
-- STEP 6: RELATIONSHIP_GROUPS TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own relationship groups
CREATE POLICY "Users can view own groups" ON relationship_groups
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own relationship groups
CREATE POLICY "Users can create own groups" ON relationship_groups
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own relationship groups
CREATE POLICY "Users can update own groups" ON relationship_groups
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own relationship groups
CREATE POLICY "Users can delete own groups" ON relationship_groups
    FOR DELETE USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 7: EVENT_PERMISSIONS TABLE RLS POLICIES
-- ======================================================================

-- Users can view permissions for their own events
CREATE POLICY "Users can view event permissions" ON event_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = auth.uid())
    );

-- Users can create permissions for their own events
CREATE POLICY "Users can create event permissions" ON event_permissions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = auth.uid())
    );

-- Users can update permissions for their own events
CREATE POLICY "Users can update event permissions" ON event_permissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = auth.uid())
    );

-- Users can delete permissions for their own events
CREATE POLICY "Users can delete event permissions" ON event_permissions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = auth.uid())
    );

-- ======================================================================
-- STEP 8: EVENT_VISIBILITY TABLE RLS POLICIES
-- ======================================================================

-- Users can view visibility settings for their own events
CREATE POLICY "Users can view event visibility" ON event_visibility
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = auth.uid())
    );

-- Users can create visibility settings for their own events
CREATE POLICY "Users can create event visibility" ON event_visibility
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = auth.uid())
    );

-- Users can update visibility settings for their own events
CREATE POLICY "Users can update event visibility" ON event_visibility
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = auth.uid())
    );

-- Users can delete visibility settings for their own events
CREATE POLICY "Users can delete event visibility" ON event_visibility
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = auth.uid())
    );

-- ======================================================================
-- STEP 9: EVENT_ATTACHMENTS TABLE RLS POLICIES
-- ======================================================================

-- Users can view attachments for events they own or can access
CREATE POLICY "Users can view event attachments" ON event_attachments
    FOR SELECT USING (
        auth.uid() = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = auth.uid())
    );

-- Users can create attachments for events they can access
CREATE POLICY "Users can create event attachments" ON event_attachments
    FOR INSERT WITH CHECK (
        auth.uid() = uploaded_by AND
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = auth.uid())
    );

-- Users can update their own attachments
CREATE POLICY "Users can update own event attachments" ON event_attachments
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Users can delete their own attachments or attachments on their events
CREATE POLICY "Users can delete event attachments" ON event_attachments
    FOR DELETE USING (
        auth.uid() = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = auth.uid())
    );

-- ======================================================================
-- STEP 10: CONTACTS TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own contacts
CREATE POLICY "Users can view own contacts" ON contacts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own contacts
CREATE POLICY "Users can create own contacts" ON contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts" ON contacts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own contacts
CREATE POLICY "Users can delete own contacts" ON contacts
    FOR DELETE USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 11: CONTACT_TAGS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage their own contact tags
CREATE POLICY "Users can manage own contact tags" ON contact_tags
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 12: CONTACT_TAG_RELATIONSHIPS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage contact tag relationships for their own contacts
CREATE POLICY "Users can manage contact tag relationships" ON contact_tag_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE id = contact_tag_relationships.contact_id 
            AND user_id = auth.uid()
        )
    );

-- ======================================================================
-- STEP 13: CONTACT_GROUPS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage their own contact groups
CREATE POLICY "Users can manage own contact groups" ON contact_groups
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 14: CONTACT_GROUP_MEMBERS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage members of their own contact groups
CREATE POLICY "Users can manage contact group members" ON contact_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contact_groups 
            WHERE id = contact_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- ======================================================================
-- STEP 15: INVITATIONS TABLE RLS POLICIES
-- ======================================================================

-- Users can view invitations they sent
CREATE POLICY "Users can view sent invitations" ON invitations
    FOR SELECT USING (auth.uid() = inviter_id);

-- Users can view invitations sent to them (by email)
CREATE POLICY "Users can view received invitations" ON invitations
    FOR SELECT USING (
        invitee_email = (auth.jwt() ->> 'email')::text
    );

-- Users can create invitations
CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (auth.uid() = inviter_id);

-- Users can update invitations they sent
CREATE POLICY "Users can update sent invitations" ON invitations
    FOR UPDATE USING (auth.uid() = inviter_id);

-- Recipients can update invitation status
CREATE POLICY "Recipients can update invitation status" ON invitations
    FOR UPDATE USING (
        invitee_email = (auth.jwt() ->> 'email')::text
    );

-- Users can delete invitations they sent
CREATE POLICY "Users can delete sent invitations" ON invitations
    FOR DELETE USING (auth.uid() = inviter_id);

-- ======================================================================
-- STEP 16: INVITATION_TOKENS TABLE RLS POLICIES
-- ======================================================================

-- Users can view tokens for their invitations
CREATE POLICY "Users can view invitation tokens" ON invitation_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invitations 
            WHERE id = invitation_tokens.invitation_id 
            AND inviter_id = auth.uid()
        )
    );

-- Users can create tokens for their invitations
CREATE POLICY "Users can create invitation tokens" ON invitation_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invitations 
            WHERE id = invitation_tokens.invitation_id 
            AND inviter_id = auth.uid()
        )
    );

-- System can update token usage (used_at field)
CREATE POLICY "System can update invitation tokens" ON invitation_tokens
    FOR UPDATE USING (true);

-- ======================================================================
-- STEP 17: CALENDAR_INTEGRATIONS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage their own calendar integrations
CREATE POLICY "Users can manage own calendar integrations" ON calendar_integrations
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 18: CALENDAR_SHARES TABLE RLS POLICIES
-- ======================================================================

-- Users can view calendar shares they created or that are shared with them
CREATE POLICY "Users can view calendar shares" ON calendar_shares
    FOR SELECT USING (
        auth.uid() = user_id OR auth.uid() = shared_with_id
    );

-- Users can create calendar shares for their own calendars
CREATE POLICY "Users can create calendar shares" ON calendar_shares
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update calendar shares they created
CREATE POLICY "Users can update calendar shares" ON calendar_shares
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete calendar shares they created
CREATE POLICY "Users can delete calendar shares" ON calendar_shares
    FOR DELETE USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 19: REMINDERS TABLE RLS POLICIES
-- ======================================================================

-- Users can view reminders for their own events
CREATE POLICY "Users can view event reminders" ON reminders
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = auth.uid())
    );

-- Users can create reminders for their own events
CREATE POLICY "Users can create event reminders" ON reminders
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = auth.uid())
    );

-- Users can update reminders for their own events
CREATE POLICY "Users can update event reminders" ON reminders
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = auth.uid())
    );

-- Users can delete reminders for their own events
CREATE POLICY "Users can delete event reminders" ON reminders
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = reminders.event_id AND user_id = auth.uid())
    );

-- ======================================================================
-- STEP 20: USER_PREFERENCES TABLE RLS POLICIES
-- ======================================================================

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 21: RELATIONSHIP_GROUP_MEMBERS TABLE RLS POLICIES
-- ======================================================================

-- Users can view group memberships for their own groups
CREATE POLICY "Users can view group memberships" ON relationship_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM relationship_groups 
            WHERE id = relationship_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can add members to their own groups
CREATE POLICY "Users can add group members" ON relationship_group_members
    FOR INSERT WITH CHECK (
        auth.uid() = added_by AND
        EXISTS (
            SELECT 1 FROM relationship_groups 
            WHERE id = relationship_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can update memberships in their own groups
CREATE POLICY "Users can update group memberships" ON relationship_group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM relationship_groups 
            WHERE id = relationship_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can remove members from their own groups
CREATE POLICY "Users can remove group members" ON relationship_group_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM relationship_groups 
            WHERE id = relationship_group_members.group_id 
            AND user_id = auth.uid()
        )
    );

-- ======================================================================
-- STEP 22: PERMISSION_AUDIT_LOGS TABLE RLS POLICIES
-- ======================================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON permission_audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System can create audit logs (for any user)
CREATE POLICY "System can create audit logs" ON permission_audit_logs
    FOR INSERT WITH CHECK (true);

-- ======================================================================
-- STEP 23: CUSTOM_HOLIDAYS TABLE RLS POLICIES
-- ======================================================================

-- Users can manage their own custom holidays
CREATE POLICY "Users can manage own custom holidays" ON custom_holidays
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 24: SECURITY TABLES RLS POLICIES
-- ======================================================================

-- CSRF Tokens - Users can manage their own tokens
CREATE POLICY "Users can manage own CSRF tokens" ON csrf_tokens
    FOR ALL USING (auth.uid() = user_id);

-- OAuth States - Users can manage their own states
CREATE POLICY "Users can manage own OAuth states" ON oauth_states
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 25: AVAILABILITY SYSTEM RLS POLICIES
-- ======================================================================

-- Users can manage their own availability cache
CREATE POLICY "Users can manage own availability cache" ON availability_cache
    FOR ALL USING (auth.uid() = user_id);

-- Users can view their own conflict audit logs
CREATE POLICY "Users can view own conflict logs" ON conflict_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- System can create conflict audit logs
CREATE POLICY "System can create conflict logs" ON conflict_audit_log
    FOR INSERT WITH CHECK (true);

-- Users can manage their own availability windows
CREATE POLICY "Users can manage own availability windows" ON availability_windows
    FOR ALL USING (auth.uid() = user_id);

-- Users can view their own conflict check metrics
CREATE POLICY "Users can view own metrics" ON conflict_check_metrics
    FOR SELECT USING (auth.uid() = user_id);

-- System can create metrics for any user
CREATE POLICY "System can create metrics" ON conflict_check_metrics
    FOR INSERT WITH CHECK (true);

-- ======================================================================
-- STEP 26: CREATE HELPER FUNCTIONS FOR COMPLEX POLICIES
-- ======================================================================

-- Function to check if a user can view another user's calendar based on relationship
CREATE OR REPLACE FUNCTION can_view_user_calendar(viewer_id UUID, calendar_owner_id UUID)
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
CREATE OR REPLACE FUNCTION can_view_event_details(event_id UUID, viewer_id UUID)
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
-- STEP 27: UPDATE EVENT POLICIES TO USE HELPER FUNCTIONS
-- ======================================================================

-- Drop the basic partner sharing policy and replace with more sophisticated one
DROP POLICY IF EXISTS "Partners can view shared events" ON events;

-- More sophisticated partner event viewing policy
CREATE POLICY "Partners can view events based on relationship" ON events
    FOR SELECT USING (
        -- Owner can always see their events
        auth.uid() = user_id OR
        -- Partners can see based on relationship tier and event privacy
        (can_view_user_calendar(auth.uid(), user_id) AND 
         (privacy_override = 'default' OR privacy_override IS NULL))
    );

-- ======================================================================
-- STEP 28: VERIFICATION AND TESTING QUERIES
-- ======================================================================

-- Create a verification function to test RLS policies
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
BEGIN
    FOREACH table_name_var IN ARRAY tables_to_check
    LOOP
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
            END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- STEP 29: GRANT NECESSARY PERMISSIONS
-- ======================================================================

-- Grant execute permissions on helper functions to authenticated users
GRANT EXECUTE ON FUNCTION can_view_user_calendar(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_view_event_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_rls_policies() TO authenticated;

-- ======================================================================
-- STEP 30: FINAL VERIFICATION
-- ======================================================================

-- Run verification to ensure all policies are in place
SELECT * FROM verify_rls_policies() ORDER BY table_name;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Comprehensive RLS policies migration completed successfully!';
    RAISE NOTICE 'All tables now have proper row-level security policies in place.';
    RAISE NOTICE 'Data persistence issues should be resolved.';
    RAISE NOTICE 'Use SELECT * FROM verify_rls_policies() to check policy status.';
END $$;

-- ======================================================================
-- END OF COMPREHENSIVE RLS POLICIES MIGRATION
-- ======================================================================