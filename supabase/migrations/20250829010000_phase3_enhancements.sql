-- Phase 3 Database Enhancements: Groups & Privacy Controls
-- This migration adds necessary indexes and security policies for Phase 3 features

-- Add index to relationships for privacy filtering
CREATE INDEX idx_relationships_privacy ON relationships(user_id, privacy_level);

-- Add index to relationship_groups for faster lookups
CREATE INDEX idx_relationship_groups_privacy ON relationship_groups(user_id, is_active);

-- Add index to relationship_group_members for permission checks
CREATE INDEX idx_group_members_privacy ON relationship_group_members(user_id, group_privacy_level);

-- Add index on events for privacy filtering
CREATE INDEX idx_events_privacy ON events(user_id, privacy_level);

-- Add index for event visibility relationships
CREATE INDEX idx_event_visibility_relationship ON event_visibility(event_id, relationship_id);

-- Add index for event visibility groups
CREATE INDEX idx_event_visibility_group ON event_visibility(event_id, group_id);

-- Create audit log table for permission changes
CREATE TABLE permission_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  previous_level TEXT,
  new_level TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index for audit logs
CREATE INDEX idx_permission_audit_user ON permission_audit_logs(user_id, created_at);
CREATE INDEX idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);
