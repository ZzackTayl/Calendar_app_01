-- ======================================================================
-- ROLLBACK SCRIPT FOR COMPREHENSIVE RLS POLICIES MIGRATION
-- Generated: 2025-09-04
-- Purpose: Rollback the comprehensive RLS policies if needed
-- ======================================================================

-- Drop all the policies we created
-- Users table policies
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

-- User profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Relationships table policies
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can create relationships" ON relationships;
DROP POLICY IF EXISTS "Users can update their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can delete their relationships" ON relationships;

-- Events table policies
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Partners can view events based on relationship" ON events;

-- Relationship groups table policies
DROP POLICY IF EXISTS "Users can view own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can create own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can update own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON relationship_groups;

-- Event permissions table policies
DROP POLICY IF EXISTS "Users can view event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can create event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can update event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can delete event permissions" ON event_permissions;

-- Event visibility table policies
DROP POLICY IF EXISTS "Users can view event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can create event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can update event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can delete event visibility" ON event_visibility;

-- Event attachments table policies
DROP POLICY IF EXISTS "Users can view event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can create event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can update own event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can delete event attachments" ON event_attachments;

-- Contacts table policies
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- Contact tags policies
DROP POLICY IF EXISTS "Users can manage own contact tags" ON contact_tags;

-- Contact tag relationships policies
DROP POLICY IF EXISTS "Users can manage contact tag relationships" ON contact_tag_relationships;

-- Contact groups policies
DROP POLICY IF EXISTS "Users can manage own contact groups" ON contact_groups;

-- Contact group members policies
DROP POLICY IF EXISTS "Users can manage contact group members" ON contact_group_members;

-- Invitations table policies
DROP POLICY IF EXISTS "Users can view sent invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view received invitations" ON invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update sent invitations" ON invitations;
DROP POLICY IF EXISTS "Recipients can update invitation status" ON invitations;
DROP POLICY IF EXISTS "Users can delete sent invitations" ON invitations;

-- Invitation tokens policies
DROP POLICY IF EXISTS "Users can view invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "Users can create invitation tokens" ON invitation_tokens;
DROP POLICY IF EXISTS "System can update invitation tokens" ON invitation_tokens;

-- Calendar integrations policies
DROP POLICY IF EXISTS "Users can manage own calendar integrations" ON calendar_integrations;

-- Calendar shares policies
DROP POLICY IF EXISTS "Users can view calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can create calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can update calendar shares" ON calendar_shares;
DROP POLICY IF EXISTS "Users can delete calendar shares" ON calendar_shares;

-- Reminders policies
DROP POLICY IF EXISTS "Users can view event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can create event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can update event reminders" ON reminders;
DROP POLICY IF EXISTS "Users can delete event reminders" ON reminders;

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;

-- Relationship group members policies
DROP POLICY IF EXISTS "Users can view group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can add group members" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can update group memberships" ON relationship_group_members;
DROP POLICY IF EXISTS "Users can remove group members" ON relationship_group_members;

-- Permission audit logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON permission_audit_logs;
DROP POLICY IF EXISTS "System can create audit logs" ON permission_audit_logs;

-- Custom holidays policies
DROP POLICY IF EXISTS "Users can manage own custom holidays" ON custom_holidays;

-- Security tables policies
DROP POLICY IF EXISTS "Users can manage own CSRF tokens" ON csrf_tokens;
DROP POLICY IF EXISTS "Users can manage own OAuth states" ON oauth_states;

-- Availability system policies
DROP POLICY IF EXISTS "Users can manage own availability cache" ON availability_cache;
DROP POLICY IF EXISTS "Users can view own conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "System can create conflict logs" ON conflict_audit_log;
DROP POLICY IF EXISTS "Users can manage own availability windows" ON availability_windows;
DROP POLICY IF EXISTS "Users can view own metrics" ON conflict_check_metrics;
DROP POLICY IF EXISTS "System can create metrics" ON conflict_check_metrics;

-- Drop helper functions
DROP FUNCTION IF EXISTS can_view_user_calendar(UUID, UUID);
DROP FUNCTION IF EXISTS can_view_event_details(UUID, UUID);
DROP FUNCTION IF EXISTS verify_rls_policies();

-- Restore original minimal policies (if any existed)
-- Note: Add any original policies that existed before the migration here

RAISE NOTICE 'Comprehensive RLS policies rollback completed.';