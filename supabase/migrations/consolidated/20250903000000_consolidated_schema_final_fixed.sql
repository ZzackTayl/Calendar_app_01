-- ======================================================================
-- CONSOLIDATED DATABASE SCHEMA MIGRATION (FIXED)
-- Generated: 2025-09-02
-- Purpose: Single migration file consolidating all schema changes
-- 
-- This migration replaces the following files:
--   • 20250822000000_enhanced_mvp_schema.sql
--   • 20250824000001_invitation_system.sql
--   • 20250829000000_consolidated_schema.sql
--   • 20250829010000_phase3_enhancements.sql
--   • 20250830061228_security_tables.sql
--   • 20250830120000_enhanced_availability_system.sql
--   • 20250830140000_fix_search_path_security.sql
--   • 20250830150000_fix_additional_search_path_security.sql
--   • 20250901000001_add_invitation_tracking_to_relationships.sql
--   • 20250902000000_privacy_model_migration.sql
-- ======================================================================

-- ======================================================================
-- STEP 1: EXTENSIONS
-- ======================================================================

-- Extensions are typically created outside of migrations in Supabase
-- This is just for documentation purposes
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================
-- STEP 2: CREATE ENUM TYPES
-- ======================================================================

-- Create privacy level enum with values expected by frontend
DO $$ 
BEGIN
    CREATE TYPE privacy_level_enum AS ENUM (
        'private',
        'visible',
        'semi_private',
        'public'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create relationship type enum
DO $$ 
BEGIN
    CREATE TYPE relationship_type_enum AS ENUM (
        'primary',
        'secondary', 
        'nesting',
        'long_distance',
        'casual',
        'friendship',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create event status enum
DO $$ 
BEGIN
    CREATE TYPE event_status_enum AS ENUM (
        'confirmed',
        'tentative',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create invitation status enum
DO $$ 
BEGIN
    CREATE TYPE invitation_status_enum AS ENUM (
        'pending',
        'accepted',
        'declined',
        'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create reminder type enum
DO $$ 
BEGIN
    CREATE TYPE reminder_type_enum AS ENUM (
        'email',
        'push',
        'sms'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create connection tier enum (new unified privacy system)
DO $$ 
BEGIN
    CREATE TYPE connection_tier AS ENUM (
        'private',     -- No access to calendar
        'busy_only',   -- Can see when busy, not details
        'details'      -- Can see all details (family privileges)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create event privacy override enum
DO $$ 
BEGIN
    CREATE TYPE event_privacy_override AS ENUM (
        'default',     -- Use connection tier
        'private'      -- Hide from everyone except explicit participants
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ======================================================================
-- STEP 3: CREATE TABLES (in dependency order)
-- ======================================================================

-- USERS TABLE (core identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_PROFILES TABLE
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIP_GROUPS TABLE
CREATE TABLE IF NOT EXISTS relationship_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    color TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIPS TABLE (standardized)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    partner_id UUID NOT NULL,
    relationship_type relationship_type_enum DEFAULT 'other',
    status TEXT DEFAULT 'active',
    start_date DATE,
    end_date DATE,
    notes TEXT,
    default_privacy_level privacy_level_enum NOT NULL DEFAULT 'private', -- Legacy - for backward compatibility
    privacy_level privacy_level_enum NOT NULL DEFAULT 'private', -- Legacy - for backward compatibility
    connection_tier connection_tier NOT NULL DEFAULT 'details', -- New unified privacy system
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, partner_id)
);

-- EVENTS TABLE (unified structure)  
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    location TEXT,
    time_zone TEXT DEFAULT 'UTC',
    recurrence_rule TEXT,
    status event_status_enum DEFAULT 'confirmed',
    privacy_level privacy_level_enum NOT NULL DEFAULT 'private', -- Legacy - for backward compatibility
    privacy_override event_privacy_override DEFAULT 'default', -- New unified privacy system
    external_calendar_id TEXT,
    external_calendar_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_PERMISSIONS TABLE
CREATE TABLE IF NOT EXISTS event_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    relationship_id UUID,
    contact_id UUID,
    group_id UUID,
    permission_level TEXT NOT NULL,
    custom_title TEXT,
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_VISIBILITY TABLE
CREATE TABLE IF NOT EXISTS event_visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    relationship_id UUID,
    contact_id UUID,
    group_id UUID,
    visibility_level TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS event_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS TABLE
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, email)
);

-- CONTACT_TAGS TABLE
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- CONTACT_TAG_RELATIONSHIPS TABLE (many-to-many)
CREATE TABLE IF NOT EXISTS contact_tag_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (contact_id, tag_id)
);

-- CONTACT_GROUPS TABLE
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name)
);

-- CONTACT_GROUP_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS contact_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, contact_id)
);

-- INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_id UUID NOT NULL,
    invitee_email TEXT NOT NULL,
    invitation_type TEXT NOT NULL,
    status invitation_status_enum DEFAULT 'pending',
    expires_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVITATION_TOKENS TABLE
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CALENDAR_INTEGRATIONS TABLE
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL,
    account_email TEXT NOT NULL,
    calendar_name TEXT,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, provider, account_email)
);

-- CALENDAR_SHARES TABLE
CREATE TABLE IF NOT EXISTS calendar_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    shared_with_id UUID NOT NULL,
    permission_level TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, shared_with_id)
);

-- REMINDERS TABLE
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    reminder_type reminder_type_enum NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER_PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    default_privacy_level privacy_level_enum DEFAULT 'private',
    default_connection_tier connection_tier DEFAULT 'busy_only',
    time_zone TEXT DEFAULT 'UTC',
    date_format TEXT DEFAULT 'MM/DD/YYYY',
    time_format TEXT DEFAULT '12h',
    week_start TEXT DEFAULT 'sunday',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RELATIONSHIP_GROUP_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS relationship_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL,
    relationship_id UUID NOT NULL,
    privacy_level privacy_level_enum NOT NULL DEFAULT 'private', -- Legacy - for backward compatibility
    connection_tier connection_tier NOT NULL DEFAULT 'details', -- New unified privacy system
    added_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, relationship_id)
);

-- PERMISSION_AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    old_permissions JSONB,
    new_permissions JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM_HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS custom_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECURITY TABLES
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  user_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID,
  provider TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVAILABILITY SYSTEM TABLES
CREATE TABLE IF NOT EXISTS availability_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    availability_data JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS conflict_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    event_id UUID,
    conflict_type TEXT NOT NULL,
    conflict_details JSONB,
    resolution_action TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    time_zone TEXT DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conflict_check_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    check_type TEXT NOT NULL,
    events_checked INTEGER DEFAULT 0,
    conflicts_found INTEGER DEFAULT 0,
    resolution_time_ms INTEGER,
    check_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- STEP 4: ADD CONSTRAINTS AND FOREIGN KEYS
-- ======================================================================

-- Add foreign key constraints
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_id FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationship_groups ADD CONSTRAINT fk_relationship_groups_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationships ADD CONSTRAINT fk_relationships_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationships ADD CONSTRAINT fk_relationships_partner_id FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE events ADD CONSTRAINT fk_events_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE event_permissions ADD CONSTRAINT fk_event_permissions_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE event_permissions ADD CONSTRAINT fk_event_permissions_relationship_id FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE;
ALTER TABLE event_permissions ADD CONSTRAINT fk_event_permissions_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE event_permissions ADD CONSTRAINT fk_event_permissions_group_id FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;
ALTER TABLE event_visibility ADD CONSTRAINT fk_event_visibility_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE event_visibility ADD CONSTRAINT fk_event_visibility_relationship_id FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE;
ALTER TABLE event_visibility ADD CONSTRAINT fk_event_visibility_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE event_visibility ADD CONSTRAINT fk_event_visibility_group_id FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;
ALTER TABLE event_attachments ADD CONSTRAINT fk_event_attachments_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE event_attachments ADD CONSTRAINT fk_event_attachments_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE contact_tags ADD CONSTRAINT fk_contact_tags_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE contact_tag_relationships ADD CONSTRAINT fk_contact_tag_relationships_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE contact_tag_relationships ADD CONSTRAINT fk_contact_tag_relationships_tag_id FOREIGN KEY (tag_id) REFERENCES contact_tags(id) ON DELETE CASCADE;
ALTER TABLE contact_groups ADD CONSTRAINT fk_contact_groups_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE contact_group_members ADD CONSTRAINT fk_contact_group_members_group_id FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE;
ALTER TABLE contact_group_members ADD CONSTRAINT fk_contact_group_members_contact_id FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE invitations ADD CONSTRAINT fk_invitations_inviter_id FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE invitation_tokens ADD CONSTRAINT fk_invitation_tokens_invitation_id FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE;
ALTER TABLE calendar_integrations ADD CONSTRAINT fk_calendar_integrations_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_shares ADD CONSTRAINT fk_calendar_shares_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE calendar_shares ADD CONSTRAINT fk_calendar_shares_shared_with_id FOREIGN KEY (shared_with_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE reminders ADD CONSTRAINT fk_reminders_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE user_preferences ADD CONSTRAINT fk_user_preferences_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE relationship_group_members ADD CONSTRAINT fk_relationship_group_members_group_id FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;
ALTER TABLE relationship_group_members ADD CONSTRAINT fk_relationship_group_members_relationship_id FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE;
ALTER TABLE relationship_group_members ADD CONSTRAINT fk_relationship_group_members_added_by FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE permission_audit_logs ADD CONSTRAINT fk_permission_audit_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE custom_holidays ADD CONSTRAINT fk_custom_holidays_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE csrf_tokens ADD CONSTRAINT fk_csrf_tokens_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE oauth_states ADD CONSTRAINT fk_oauth_states_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE availability_cache ADD CONSTRAINT fk_availability_cache_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE conflict_audit_log ADD CONSTRAINT fk_conflict_audit_log_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE conflict_audit_log ADD CONSTRAINT fk_conflict_audit_log_event_id FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE availability_windows ADD CONSTRAINT fk_availability_windows_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE conflict_check_metrics ADD CONSTRAINT fk_conflict_check_metrics_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ======================================================================
-- STEP 5: CREATE INDEXES
-- ======================================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_time ON events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_end_time ON events(end_time);
CREATE INDEX IF NOT EXISTS idx_events_user_start ON events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_relationships_user_id ON relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_id ON relationships(partner_id);
CREATE INDEX IF NOT EXISTS idx_relationships_user_partner ON relationships(user_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter_id ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitee_email ON invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires_at ON invitation_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_id ON calendar_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_provider ON calendar_integrations(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_is_sent ON reminders(is_sent);
CREATE INDEX IF NOT EXISTS idx_relationship_groups_user_id ON relationship_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_relationship_group_members_group_id ON relationship_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_relationship_group_members_relationship_id ON relationship_group_members(relationship_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON permission_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_custom_holidays_user_id ON custom_holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_holidays_date ON custom_holidays(date);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_availability_cache_user_date ON availability_cache(user_id, date);
CREATE INDEX IF NOT EXISTS idx_conflict_audit_log_user_id ON conflict_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_audit_log_created_at ON conflict_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_availability_windows_user_id ON availability_windows(user_id);
CREATE INDEX IF NOT EXISTS idx_availability_windows_day_of_week ON availability_windows(day_of_week);
CREATE INDEX IF NOT EXISTS idx_conflict_check_metrics_user_id ON conflict_check_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_conflict_check_metrics_created_at ON conflict_check_metrics(created_at);

-- ======================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ======================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_visibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tag_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_check_metrics ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- STEP 7: VERIFICATION QUERIES
-- ======================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'users', 'user_profiles', 'relationship_groups', 'relationships',
        'relationship_group_members', 'events', 'event_permissions',
        'event_visibility', 'event_attachments', 'contacts', 'contact_tags',
        'contact_tag_relationships', 'contact_groups', 'contact_group_members',
        'invitations', 'invitation_tokens', 'calendar_integrations',
        'calendar_shares', 'reminders', 'user_preferences', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics', 'permission_audit_logs'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    -- Count existing tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables);
    
    -- Check for missing tables
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    -- Report results
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: % of %', table_count, array_length(expected_tables, 1);
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ======================================================================
-- END OF CONSOLIDATED MIGRATION
-- ======================================================================
