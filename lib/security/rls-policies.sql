-- Row-Level Security (RLS) Policies for Cross-User Data Isolation
-- 
-- This SQL file implements comprehensive Row-Level Security policies to prevent
-- cross-user data access at the database level. These policies provide defense-in-depth
-- security by ensuring that even direct database access cannot bypass user isolation.
-- 
-- CRITICAL: These policies are essential for production data security.

-- =====================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL USER DATA TABLES
-- =====================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Enable RLS on relationships table
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Enable RLS on relationship groups
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;

-- Enable RLS on group members
ALTER TABLE relationship_group_members ENABLE ROW LEVEL SECURITY;

-- Enable RLS on event permissions
ALTER TABLE event_permissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit logs (users can only see their own audit logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on security violations (users cannot see these, admin only)
ALTER TABLE security_violations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- USERS TABLE RLS POLICIES
-- =====================================================================

-- Users can only access their own user record
CREATE POLICY "users_isolation_policy" ON users
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = id);

-- =====================================================================
-- EVENTS TABLE RLS POLICIES
-- =====================================================================

-- Users can only access events they own
CREATE POLICY "events_owner_policy" ON events
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Users can view events from partners based on privacy settings and relationships
CREATE POLICY "events_partner_view_policy" ON events
  FOR SELECT
  TO authenticated
  USING (
    -- Event owner can always see their events (covered by owner policy)
    -- OR user has relationship with event owner AND event is not private
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE (
        (r.user_id = auth.uid()::text AND r.partner_id = events.user_id)
        OR 
        (r.partner_id = auth.uid()::text AND r.user_id = events.user_id)
      )
      AND r.status = 'active'
      AND r.connection_tier != 'private'
      AND events.privacy_level != 'private'
    )
    OR
    -- OR event is public and user has any relationship with owner
    (
      events.privacy_level = 'public'
      AND EXISTS (
        SELECT 1 FROM relationships r
        WHERE (
          (r.user_id = auth.uid()::text AND r.partner_id = events.user_id)
          OR 
          (r.partner_id = auth.uid()::text AND r.user_id = events.user_id)
        )
        AND r.status = 'active'
      )
    )
  );

-- =====================================================================
-- RELATIONSHIPS TABLE RLS POLICIES
-- =====================================================================

-- Users can only access relationships they are part of
CREATE POLICY "relationships_participant_policy" ON relationships
  FOR ALL
  TO authenticated
  USING (
    auth.uid()::text = user_id 
    OR 
    auth.uid()::text = partner_id
  );

-- =====================================================================
-- RELATIONSHIP GROUPS RLS POLICIES
-- =====================================================================

-- Users can only access groups they created
CREATE POLICY "relationship_groups_owner_policy" ON relationship_groups
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = created_by);

-- Users can view (but not modify) groups they are members of
CREATE POLICY "relationship_groups_member_view_policy" ON relationship_groups
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM relationship_group_members rgm
      WHERE rgm.group_id = relationship_groups.id
      AND rgm.user_id = auth.uid()::text
      AND rgm.left_at IS NULL
    )
  );

-- =====================================================================
-- RELATIONSHIP GROUP MEMBERS RLS POLICIES
-- =====================================================================

-- Users can only see group memberships for groups they are part of
CREATE POLICY "group_members_participant_policy" ON relationship_group_members
  FOR SELECT
  TO authenticated
  USING (
    -- User is the member being queried
    auth.uid()::text = user_id
    OR
    -- User is also a member of the same group
    EXISTS (
      SELECT 1 FROM relationship_group_members rgm2
      WHERE rgm2.group_id = relationship_group_members.group_id
      AND rgm2.user_id = auth.uid()::text
      AND rgm2.left_at IS NULL
    )
    OR
    -- User created the group
    EXISTS (
      SELECT 1 FROM relationship_groups rg
      WHERE rg.id = relationship_group_members.group_id
      AND rg.created_by = auth.uid()::text
    )
  );

-- Users can only modify their own group memberships
CREATE POLICY "group_members_self_modify_policy" ON relationship_group_members
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Group creators can manage all memberships in their groups
CREATE POLICY "group_members_creator_manage_policy" ON relationship_group_members
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM relationship_groups rg
      WHERE rg.id = relationship_group_members.group_id
      AND rg.created_by = auth.uid()::text
    )
  );

-- =====================================================================
-- EVENT PERMISSIONS RLS POLICIES
-- =====================================================================

-- Users can see event permissions for events they own
CREATE POLICY "event_permissions_event_owner_policy" ON event_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_permissions.event_id
      AND e.user_id = auth.uid()::text
    )
  );

-- Users can see event permissions that grant them access
CREATE POLICY "event_permissions_grantee_policy" ON event_permissions
  FOR SELECT
  TO authenticated
  USING (
    -- Permission is for a relationship the user is part of
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = event_permissions.relationship_id
      AND (r.user_id = auth.uid()::text OR r.partner_id = auth.uid()::text)
    )
    OR
    -- Permission is for a group the user is a member of
    EXISTS (
      SELECT 1 FROM relationship_group_members rgm
      WHERE rgm.group_id = event_permissions.group_id
      AND rgm.user_id = auth.uid()::text
      AND rgm.left_at IS NULL
    )
  );

-- Only event owners can modify event permissions
CREATE POLICY "event_permissions_owner_modify_policy" ON event_permissions
  FOR INSERT, UPDATE, DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_permissions.event_id
      AND e.user_id = auth.uid()::text
    )
  );

-- =====================================================================
-- AUDIT LOGS RLS POLICIES
-- =====================================================================

-- Users can only see their own audit logs
CREATE POLICY "audit_logs_self_policy" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- System can insert audit logs for any user
CREATE POLICY "audit_logs_system_insert_policy" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================================
-- SECURITY VIOLATIONS RLS POLICIES
-- =====================================================================

-- Only service role can access security violations (admin/monitoring only)
CREATE POLICY "security_violations_admin_only_policy" ON security_violations
  FOR ALL
  TO service_role
  USING (true);

-- Authenticated users cannot access security violations at all
CREATE POLICY "security_violations_user_deny_policy" ON security_violations
  FOR ALL
  TO authenticated
  USING (false);

-- =====================================================================
-- SYSTEM ERRORS RLS POLICIES
-- =====================================================================

-- Only service role can access system errors (admin/monitoring only)
CREATE POLICY "system_errors_admin_only_policy" ON system_errors
  FOR ALL
  TO service_role
  USING (true);

-- Authenticated users cannot access system errors at all
CREATE POLICY "system_errors_user_deny_policy" ON system_errors
  FOR ALL
  TO authenticated
  USING (false);

-- =====================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================================

-- Function to validate user context in application code
CREATE OR REPLACE FUNCTION validate_user_context()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure auth.uid() is set (user is authenticated)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for data access';
  END IF;
  
  -- For insert/update operations, ensure user_id matches auth.uid()
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.user_id IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'User can only modify their own data';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply user context validation to critical tables
DROP TRIGGER IF EXISTS validate_events_user_context ON events;
CREATE TRIGGER validate_events_user_context
  BEFORE INSERT OR UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_context();

DROP TRIGGER IF EXISTS validate_relationships_user_context ON relationships;
CREATE TRIGGER validate_relationships_user_context
  BEFORE INSERT OR UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_context();

-- =====================================================================
-- SECURITY MONITORING FUNCTIONS
-- =====================================================================

-- Function to log potential RLS bypass attempts
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when RLS policies would deny access
  INSERT INTO security_violations (
    user_id,
    violation_type,
    resource_type,
    resource_id,
    metadata,
    created_at
  ) VALUES (
    auth.uid()::text,
    'rls_policy_violation',
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text, 'unknown'),
    jsonb_build_object(
      'operation', TG_OP,
      'attempted_at', NOW(),
      'table', TG_TABLE_NAME
    ),
    NOW()
  );
  
  -- Continue with the operation (will be blocked by RLS policies)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply RLS violation logging to key tables
-- Note: These triggers will fire before RLS policies block the operation
-- DROP TRIGGER IF EXISTS log_events_rls_violations ON events;
-- CREATE TRIGGER log_events_rls_violations
--   BEFORE INSERT OR UPDATE OR DELETE ON events
--   FOR EACH ROW
--   EXECUTE FUNCTION log_rls_violation();

-- =====================================================================
-- UTILITY FUNCTIONS FOR TESTING RLS POLICIES
-- =====================================================================

-- Function to test if a user can access a specific event
CREATE OR REPLACE FUNCTION can_user_access_event(
  test_user_id TEXT,
  event_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  event_exists BOOLEAN;
BEGIN
  -- Set the auth context for testing
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
  
  -- Try to select the event
  SELECT EXISTS(
    SELECT 1 FROM events WHERE id = event_id
  ) INTO event_exists;
  
  RETURN event_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to test relationship access
CREATE OR REPLACE FUNCTION can_user_access_relationship(
  test_user_id TEXT,
  relationship_id TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  relationship_exists BOOLEAN;
BEGIN
  -- Set the auth context for testing
  PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id)::text, true);
  
  -- Try to select the relationship
  SELECT EXISTS(
    SELECT 1 FROM relationships WHERE id = relationship_id
  ) INTO relationship_exists;
  
  RETURN relationship_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================

COMMENT ON POLICY "users_isolation_policy" ON users IS 'Ensures users can only access their own user record';
COMMENT ON POLICY "events_owner_policy" ON events IS 'Users can only access events they created';
COMMENT ON POLICY "events_partner_view_policy" ON events IS 'Users can view partner events based on privacy settings and relationship permissions';
COMMENT ON POLICY "relationships_participant_policy" ON relationships IS 'Users can only access relationships they are part of as user or partner';
COMMENT ON FUNCTION validate_user_context() IS 'Validates user authentication and ownership for data modifications';
COMMENT ON FUNCTION can_user_access_event(TEXT, TEXT) IS 'Testing function to validate event access permissions';

-- =====================================================================
-- GRANTS AND PERMISSIONS
-- =====================================================================

-- Ensure authenticated users can execute utility functions
GRANT EXECUTE ON FUNCTION can_user_access_event(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_access_relationship(TEXT, TEXT) TO authenticated;

-- Grant service role access to monitoring functions
GRANT ALL ON security_violations TO service_role;
GRANT ALL ON system_errors TO service_role;
GRANT ALL ON audit_logs TO service_role;