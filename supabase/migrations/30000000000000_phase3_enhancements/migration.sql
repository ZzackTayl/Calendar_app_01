-- Phase 3 Database Enhancements: Groups & Privacy Controls
-- This migration adds necessary indexes and security policies for Phase 3 features

-- ===================================================================
-- INDEXES FOR PERMISSIONS & PRIVACY
-- ===================================================================

-- Add index to relationships for privacy filtering
CREATE INDEX IF NOT EXISTS idx_relationships_privacy ON relationships(user_id, privacy_level);

-- Add index to relationship_groups for faster lookups
CREATE INDEX IF NOT EXISTS idx_relationship_groups_privacy ON relationship_groups(created_by, is_private);

-- Add index to relationship_group_members for permission checks
CREATE INDEX IF NOT EXISTS idx_group_members_privacy ON relationship_group_members(user_id, group_privacy_level);

-- Add index on events for privacy filtering
CREATE INDEX IF NOT EXISTS idx_events_privacy ON events(owner_id, privacy_level);

-- Add index for event visibility relationships
CREATE INDEX IF NOT EXISTS idx_event_visibility_relationship ON event_visibility(event_id, relationship_id);

-- Add index for event visibility groups
CREATE INDEX IF NOT EXISTS idx_event_visibility_group ON event_visibility(event_id, group_id);

-- ===================================================================
-- AUDITING FOR PERMISSION CHANGES
-- ===================================================================

-- Create audit log table for permission changes
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL, -- 'update', 'grant', 'revoke'
  resource_type TEXT NOT NULL, -- 'relationship', 'group', 'event'
  resource_id UUID NOT NULL,
  previous_level TEXT,
  new_level TEXT,
  target_id UUID, -- The user or group that the permission applies to
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);

-- ===================================================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on all tables that need access control
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Relationships RLS policies
DROP POLICY IF EXISTS relationships_select_policy ON relationships;
CREATE POLICY relationships_select_policy ON relationships
  FOR SELECT USING (
    -- User can see their own relationships
    user_id = auth.uid() OR
    -- User can see relationships where they have been granted access
    id IN (
      SELECT relationship_id FROM event_visibility 
      WHERE user_id = auth.uid() AND privacy_level != 'no_access'
    )
  );

DROP POLICY IF EXISTS relationships_insert_policy ON relationships;
CREATE POLICY relationships_insert_policy ON relationships
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS relationships_update_policy ON relationships;
CREATE POLICY relationships_update_policy ON relationships
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS relationships_delete_policy ON relationships;
CREATE POLICY relationships_delete_policy ON relationships
  FOR DELETE USING (user_id = auth.uid());

-- Relationship Groups RLS policies
DROP POLICY IF EXISTS relationship_groups_select_policy ON relationship_groups;
CREATE POLICY relationship_groups_select_policy ON relationship_groups
  FOR SELECT USING (
    -- User can see groups they created
    created_by = auth.uid() OR
    -- User can see groups they're a member of
    id IN (
      SELECT group_id FROM relationship_group_members 
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS relationship_groups_insert_policy ON relationship_groups;
CREATE POLICY relationship_groups_insert_policy ON relationship_groups
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS relationship_groups_update_policy ON relationship_groups;
CREATE POLICY relationship_groups_update_policy ON relationship_groups
  FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS relationship_groups_delete_policy ON relationship_groups;
CREATE POLICY relationship_groups_delete_policy ON relationship_groups
  FOR DELETE USING (created_by = auth.uid());

-- Group Members RLS policies
DROP POLICY IF EXISTS group_members_select_policy ON relationship_group_members;
CREATE POLICY group_members_select_policy ON relationship_group_members
  FOR SELECT USING (
    -- User can see members of groups they created or belong to
    group_id IN (
      SELECT id FROM relationship_groups 
      WHERE created_by = auth.uid() OR 
      id IN (SELECT group_id FROM relationship_group_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS group_members_insert_policy ON relationship_group_members;
CREATE POLICY group_members_insert_policy ON relationship_group_members
  FOR INSERT WITH CHECK (
    -- Only the group creator can add members
    group_id IN (
      SELECT id FROM relationship_groups 
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_members_update_policy ON relationship_group_members;
CREATE POLICY group_members_update_policy ON relationship_group_members
  FOR UPDATE USING (
    -- Only the group creator can update members
    group_id IN (
      SELECT id FROM relationship_groups 
      WHERE created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS group_members_delete_policy ON relationship_group_members;
CREATE POLICY group_members_delete_policy ON relationship_group_members
  FOR DELETE USING (
    -- Only the group creator can remove members
    group_id IN (
      SELECT id FROM relationship_groups 
      WHERE created_by = auth.uid()
    )
  );

-- Events RLS policies
DROP POLICY IF EXISTS events_select_policy ON events;
CREATE POLICY events_select_policy ON events
  FOR SELECT USING (
    -- User can see their own events
    owner_id = auth.uid() OR
    -- User can see events with public visibility
    privacy_level = 'public' OR
    -- User can see events they have been granted access to
    id IN (
      SELECT event_id FROM event_visibility 
      WHERE user_id = auth.uid() AND privacy_level != 'no_access'
    ) OR
    -- User can see events shared with groups they belong to
    id IN (
      SELECT event_id FROM event_visibility
      WHERE group_id IN (
        SELECT group_id FROM relationship_group_members
        WHERE user_id = auth.uid()
      ) AND privacy_level != 'no_access'
    )
  );

DROP POLICY IF EXISTS events_insert_policy ON events;
CREATE POLICY events_insert_policy ON events
  FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS events_update_policy ON events;
CREATE POLICY events_update_policy ON events
  FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS events_delete_policy ON events;
CREATE POLICY events_delete_policy ON events
  FOR DELETE USING (owner_id = auth.uid());

-- Event Visibility RLS policies
DROP POLICY IF EXISTS event_visibility_select_policy ON event_visibility;
CREATE POLICY event_visibility_select_policy ON event_visibility
  FOR SELECT USING (
    -- User can see visibility settings for their own events
    event_id IN (SELECT id FROM events WHERE owner_id = auth.uid()) OR
    -- User can see visibility settings that apply to them
    user_id = auth.uid() OR
    -- User can see group visibility settings for groups they belong to
    group_id IN (SELECT group_id FROM relationship_group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS event_visibility_insert_policy ON event_visibility;
CREATE POLICY event_visibility_insert_policy ON event_visibility
  FOR INSERT WITH CHECK (
    -- User can only set visibility for their own events
    event_id IN (SELECT id FROM events WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS event_visibility_update_policy ON event_visibility;
CREATE POLICY event_visibility_update_policy ON event_visibility
  FOR UPDATE USING (
    -- User can only update visibility for their own events
    event_id IN (SELECT id FROM events WHERE owner_id = auth.uid())
  );

DROP POLICY IF EXISTS event_visibility_delete_policy ON event_visibility;
CREATE POLICY event_visibility_delete_policy ON event_visibility
  FOR DELETE USING (
    -- User can only delete visibility for their own events
    event_id IN (SELECT id FROM events WHERE owner_id = auth.uid())
  );

-- Audit Log RLS policies
DROP POLICY IF EXISTS audit_log_select_policy ON permission_audit_logs;
CREATE POLICY audit_log_select_policy ON permission_audit_logs
  FOR SELECT USING (
    -- Users can only see their own audit logs
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS audit_log_insert_policy ON permission_audit_logs;
CREATE POLICY audit_log_insert_policy ON permission_audit_logs
  FOR INSERT WITH CHECK (
    -- Only the system or the user themselves can insert audit logs
    user_id = auth.uid()
  );

-- ===================================================================
-- FUNCTIONS FOR PERMISSION INHERITANCE & CONFLICT RESOLUTION
-- ===================================================================

-- Function to get the effective permission level for a user on an event
CREATE OR REPLACE FUNCTION get_effective_permission_level(
  p_user_id UUID,
  p_event_id UUID,
  p_conflict_strategy TEXT DEFAULT 'most_restrictive'
) RETURNS TEXT AS $$
DECLARE
  direct_permission TEXT;
  group_permission TEXT;
  default_permission TEXT;
  final_permission TEXT;
  privacy_order TEXT[] := ARRAY['no_access', 'hidden', 'busy_only', 'limited_access', 'full_access'];
  is_owner BOOLEAN;
BEGIN
  -- Check if user is the owner (always full access)
  SELECT owner_id = p_user_id INTO is_owner
  FROM events
  WHERE id = p_event_id;
  
  IF is_owner THEN
    RETURN 'full_access';
  END IF;
  
  -- Get direct permission for the event
  SELECT privacy_level INTO direct_permission
  FROM event_visibility
  WHERE event_id = p_event_id AND user_id = p_user_id
  LIMIT 1;
  
  -- Get permissions from groups the user belongs to
  SELECT ev.privacy_level INTO group_permission
  FROM event_visibility ev
  JOIN relationship_group_members rgm ON ev.group_id = rgm.group_id
  WHERE ev.event_id = p_event_id 
    AND rgm.user_id = p_user_id
  ORDER BY 
    CASE WHEN p_conflict_strategy = 'most_restrictive' THEN 
      array_position(privacy_order, ev.privacy_level)
    ELSE 
      -array_position(privacy_order, ev.privacy_level)
    END
  LIMIT 1;
  
  -- Get default event permission
  SELECT privacy_level INTO default_permission
  FROM events
  WHERE id = p_event_id;
  
  -- Apply conflict resolution strategy
  IF p_conflict_strategy = 'explicit_wins' AND direct_permission IS NOT NULL THEN
    final_permission := direct_permission;
  ELSIF p_conflict_strategy = 'most_permissive' THEN
    -- For most permissive, pick the highest permission level
    IF direct_permission IS NULL AND group_permission IS NULL THEN
      final_permission := default_permission;
    ELSIF direct_permission IS NULL THEN
      final_permission := group_permission;
    ELSIF group_permission IS NULL THEN
      final_permission := direct_permission;
    ELSIF array_position(privacy_order, direct_permission) > array_position(privacy_order, group_permission) THEN
      final_permission := direct_permission;
    ELSE
      final_permission := group_permission;
    END IF;
  ELSE -- most_restrictive is the default
    -- For most restrictive, pick the lowest permission level
    IF direct_permission IS NULL AND group_permission IS NULL THEN
      final_permission := default_permission;
    ELSIF direct_permission IS NULL THEN
      final_permission := group_permission;
    ELSIF group_permission IS NULL THEN
      final_permission := direct_permission;
    ELSIF array_position(privacy_order, direct_permission) < array_position(privacy_order, group_permission) THEN
      final_permission := direct_permission;
    ELSE
      final_permission := group_permission;
    END IF;
  END IF;
  
  RETURN final_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to log permission changes
CREATE OR REPLACE FUNCTION log_permission_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permission_audit_logs (
    user_id, 
    action_type, 
    resource_type, 
    resource_id, 
    previous_level, 
    new_level, 
    target_id,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    CASE
      WHEN TG_OP = 'INSERT' THEN 'grant'
      WHEN TG_OP = 'UPDATE' THEN 'update'
      WHEN TG_OP = 'DELETE' THEN 'revoke'
    END,
    TG_TABLE_NAME,
    CASE
      WHEN TG_TABLE_NAME = 'event_visibility' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.event_id
          ELSE NEW.event_id
        END
      WHEN TG_TABLE_NAME = 'relationships' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.id
          ELSE NEW.id
        END
      WHEN TG_TABLE_NAME = 'relationship_group_members' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.group_id
          ELSE NEW.group_id
        END
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN OLD.group_privacy_level
        END
      WHEN TG_OP = 'UPDATE' THEN 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN OLD.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN OLD.group_privacy_level
        END
      ELSE NULL
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      ELSE 
        CASE
          WHEN TG_TABLE_NAME = 'event_visibility' THEN NEW.privacy_level
          WHEN TG_TABLE_NAME = 'relationships' THEN NEW.privacy_level
          WHEN TG_TABLE_NAME = 'relationship_group_members' THEN NEW.group_privacy_level
        END
    END,
    CASE
      WHEN TG_TABLE_NAME = 'event_visibility' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN 
            COALESCE(OLD.user_id, OLD.group_id)
          ELSE 
            COALESCE(NEW.user_id, NEW.group_id)
        END
      WHEN TG_TABLE_NAME = 'relationships' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.partner_id
          ELSE NEW.partner_id
        END
      WHEN TG_TABLE_NAME = 'relationship_group_members' THEN 
        CASE
          WHEN TG_OP = 'DELETE' THEN OLD.user_id
          ELSE NEW.user_id
        END
    END,
    current_setting('request.headers', true)::json->'x-real-ip',
    current_setting('request.headers', true)::json->'user-agent'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for permission audit logging
DROP TRIGGER IF EXISTS relationships_permission_audit ON relationships;
CREATE TRIGGER relationships_permission_audit
AFTER INSERT OR UPDATE OF privacy_level OR DELETE
ON relationships
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION log_permission_change();

DROP TRIGGER IF EXISTS group_members_permission_audit ON relationship_group_members;
CREATE TRIGGER group_members_permission_audit
AFTER INSERT OR UPDATE OF group_privacy_level OR DELETE
ON relationship_group_members
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION log_permission_change();

DROP TRIGGER IF EXISTS event_visibility_audit ON event_visibility;
CREATE TRIGGER event_visibility_audit
AFTER INSERT OR UPDATE OF privacy_level OR DELETE
ON event_visibility
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION log_permission_change();
