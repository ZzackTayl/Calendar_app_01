-- ======================================================================
-- CONSOLIDATED SCHEMA MIGRATION
-- Description: Complete schema consolidation with all fixes and enhancements
-- Date: 2025-08-29
-- Purpose: 
--   1. Consolidate all schema changes into a single coherent migration
--   2. Include all tables, constraints, indexes, and policies from recent migrations
--   3. Add Phase 3 enhancements for groups and privacy controls
--   4. Ensure proper foreign key relationships and RLS policies
-- ======================================================================

-- ======================================================================
-- STEP 1: EXTENSIONS
-- ======================================================================

-- Extensions are typically created outside of migrations in Supabase
-- This is just for documentation purposes
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ======================================================================
-- STEP 3: CREATE TABLES
-- ======================================================================

-- Users table (core identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_privacy_level privacy_level_enum DEFAULT 'private',
    is_active BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    profile_data JSONB DEFAULT '{}',
    public_key TEXT, -- For future encryption
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month', -- 'month', 'week', 'day', 'agenda'
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    username TEXT UNIQUE,
    email_consent BOOLEAN DEFAULT FALSE,
    email_preferences JSONB DEFAULT '{"updates": false, "notifications": false, "tips": false}'::jsonb,
    beta_participant BOOLEAN DEFAULT FALSE,
    data_collection_consent BOOLEAN DEFAULT FALSE,
    selected_calendars TEXT[] DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3)
);

-- Relationship groups
CREATE TABLE IF NOT EXISTS relationship_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE (user_id, group_name),
    CHECK (length(group_name) > 0 AND length(group_name) <= 100)
);

-- Relationships (standardized)
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    partner_id UUID, -- Can be null for pending invitations
    partner_email TEXT, -- For invitations before user exists
    partner_name TEXT,
    group_id UUID,
    relationship_type relationship_type_enum DEFAULT 'other',
    default_privacy_level privacy_level_enum DEFAULT 'private',
    start_date DATE,
    birthday DATE,
    anniversary_date DATE,
    color TEXT DEFAULT '#3B82F6',
    notes TEXT,
    relationship_details JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events (unified structure)  
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    time_zone TEXT DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT false,
    privacy_level privacy_level_enum DEFAULT 'private',
    relationship_id UUID, -- Primary relationship association
    color TEXT DEFAULT '#3B82F6',
    status event_status_enum DEFAULT 'confirmed',
    recurrence_rule TEXT, -- RRULE for recurring events
    event_data JSONB DEFAULT '{}', -- Additional structured data
    google_calendar_id TEXT, -- Google Calendar integration
    google_event_id TEXT,    -- Google Event ID
    caldav_uid TEXT,         -- CalDAV UID for other calendar systems
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CHECK (end_time > start_time),
    CHECK (length(title) > 0 AND length(title) <= 200)
);

-- Event permissions (granular access control)
CREATE TABLE IF NOT EXISTS event_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    relationship_id UUID,
    group_id UUID,
    permission_level privacy_level_enum NOT NULL,
    can_see_details BOOLEAN DEFAULT true,
    can_see_location BOOLEAN DEFAULT true, 
    can_see_description BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either relationship_id or group_id is set, not both
    CHECK (
        (relationship_id IS NOT NULL AND group_id IS NULL) OR 
        (relationship_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Event visibility (for Phase 3 features)
CREATE TABLE IF NOT EXISTS event_visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID,
    group_id UUID,
    relationship_id UUID,
    privacy_level privacy_level_enum NOT NULL DEFAULT 'private',
    can_see_details BOOLEAN DEFAULT true,
    can_see_location BOOLEAN DEFAULT true,
    can_see_description BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure exactly one of user_id, group_id, or relationship_id is set
    CHECK (
        (user_id IS NOT NULL AND group_id IS NULL AND relationship_id IS NULL) OR
        (user_id IS NULL AND group_id IS NOT NULL AND relationship_id IS NULL) OR
        (user_id IS NULL AND group_id IS NULL AND relationship_id IS NOT NULL)
    )
);

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    company TEXT,
    job_title TEXT,
    avatar_url TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    contact_data JSONB DEFAULT '{}', -- Additional contact info
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- At least one name or contact method required
    CHECK (
        (first_name IS NOT NULL OR last_name IS NOT NULL) OR
        (email IS NOT NULL OR phone_number IS NOT NULL)
    ),
    UNIQUE (user_id, email)
);

-- Contact tags
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, name),
    CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Contact tag relationships (many-to-many)
CREATE TABLE IF NOT EXISTS contact_tag_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (contact_id, tag_id)
);

-- Contact groups (for organizing contacts)
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    group_name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, group_name),
    CHECK (length(group_name) > 0 AND length(group_name) <= 100)
);

-- Contact group members (many-to-many)
CREATE TABLE IF NOT EXISTS contact_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_group_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (contact_group_id, contact_id)
);

-- Invitations
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    invitation_type TEXT DEFAULT 'relationship' CHECK (invitation_type IN ('relationship', 'group', 'calendar_share')),
    message TEXT,
    status invitation_status_enum DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    recipient_user_id UUID, -- Set when invitation is accepted
    invitation_data JSONB DEFAULT '{}', -- Additional invitation context
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Either email or phone required
    CHECK (recipient_email IS NOT NULL OR recipient_phone IS NOT NULL)
);

-- Invitation tokens (for secure links)
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invitation_id UUID NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_ip INET,
    used_by_user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendar integrations
CREATE TABLE IF NOT EXISTS calendar_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'apple', 'outlook', 'caldav')),
    account_email TEXT,
    access_token_encrypted TEXT, -- Encrypted OAuth tokens
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    calendar_id TEXT, -- External calendar ID
    calendar_name TEXT,
    is_active BOOLEAN DEFAULT true,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_error TEXT,
    integration_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (user_id, provider, account_email)
);

-- Calendar shares (for sharing calendars between users)
CREATE TABLE IF NOT EXISTS calendar_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL,
    shared_with_user_id UUID NOT NULL,
    permission_level privacy_level_enum DEFAULT 'visible',
    can_edit_events BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE, -- For public sharing
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE (owner_user_id, shared_with_user_id)
);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    reminder_type TEXT DEFAULT 'notification' CHECK (reminder_type IN ('notification', 'email', 'sms')),
    is_sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    reminder_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    default_event_duration INTEGER DEFAULT 60, -- minutes
    calendar_view_default TEXT DEFAULT 'month',
    color_scheme TEXT DEFAULT 'default',
    language TEXT DEFAULT 'en',
    notification_settings JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship group members
CREATE TABLE IF NOT EXISTS relationship_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('creator', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    can_invite_members BOOLEAN DEFAULT false,
    can_edit_group_info BOOLEAN DEFAULT false,
    can_remove_members BOOLEAN DEFAULT false,
    group_privacy_level privacy_level_enum DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Permission audit logs (for Phase 3)
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

-- Event attachments
CREATE TABLE IF NOT EXISTS event_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom holidays
CREATE TABLE IF NOT EXISTS custom_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT true,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, name, date)
);

-- ======================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS
-- ======================================================================

-- User profiles
ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS fk_user_profiles_id;
ALTER TABLE user_profiles
    ADD CONSTRAINT fk_user_profiles_id 
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- Relationship groups
ALTER TABLE relationship_groups
    DROP CONSTRAINT IF EXISTS fk_relationship_groups_user_id;
ALTER TABLE relationship_groups
    ADD CONSTRAINT fk_relationship_groups_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Relationships
ALTER TABLE relationships
    DROP CONSTRAINT IF EXISTS fk_relationships_user_id;
ALTER TABLE relationships
    ADD CONSTRAINT fk_relationships_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE relationships
    DROP CONSTRAINT IF EXISTS fk_relationships_partner_id;
ALTER TABLE relationships
    ADD CONSTRAINT fk_relationships_partner_id 
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE relationships
    DROP CONSTRAINT IF EXISTS fk_relationships_group_id;
ALTER TABLE relationships
    ADD CONSTRAINT fk_relationships_group_id 
    FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE SET NULL;

-- Events
ALTER TABLE events
    DROP CONSTRAINT IF EXISTS fk_events_user_id;
ALTER TABLE events
    ADD CONSTRAINT fk_events_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE events
    DROP CONSTRAINT IF EXISTS fk_events_relationship_id;
ALTER TABLE events
    ADD CONSTRAINT fk_events_relationship_id 
    FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE SET NULL;

-- Event permissions
ALTER TABLE event_permissions
    DROP CONSTRAINT IF EXISTS fk_event_permissions_event_id;
ALTER TABLE event_permissions
    ADD CONSTRAINT fk_event_permissions_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_permissions
    DROP CONSTRAINT IF EXISTS fk_event_permissions_relationship_id;
ALTER TABLE event_permissions
    ADD CONSTRAINT fk_event_permissions_relationship_id 
    FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE;

ALTER TABLE event_permissions
    DROP CONSTRAINT IF EXISTS fk_event_permissions_group_id;
ALTER TABLE event_permissions
    ADD CONSTRAINT fk_event_permissions_group_id 
    FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;

-- Event visibility
ALTER TABLE event_visibility
    DROP CONSTRAINT IF EXISTS fk_event_visibility_event_id;
ALTER TABLE event_visibility
    ADD CONSTRAINT fk_event_visibility_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_visibility
    DROP CONSTRAINT IF EXISTS fk_event_visibility_user_id;
ALTER TABLE event_visibility
    ADD CONSTRAINT fk_event_visibility_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE event_visibility
    DROP CONSTRAINT IF EXISTS fk_event_visibility_group_id;
ALTER TABLE event_visibility
    ADD CONSTRAINT fk_event_visibility_group_id 
    FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;

ALTER TABLE event_visibility
    DROP CONSTRAINT IF EXISTS fk_event_visibility_relationship_id;
ALTER TABLE event_visibility
    ADD CONSTRAINT fk_event_visibility_relationship_id 
    FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE CASCADE;

-- Contacts
ALTER TABLE contacts
    DROP CONSTRAINT IF EXISTS fk_contacts_user_id;
ALTER TABLE contacts
    ADD CONSTRAINT fk_contacts_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Contact tags
ALTER TABLE contact_tags
    DROP CONSTRAINT IF EXISTS fk_contact_tags_user_id;
ALTER TABLE contact_tags
    ADD CONSTRAINT fk_contact_tags_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Contact tag relationships
ALTER TABLE contact_tag_relationships
    DROP CONSTRAINT IF EXISTS fk_contact_tag_rel_contact_id;
ALTER TABLE contact_tag_relationships
    ADD CONSTRAINT fk_contact_tag_rel_contact_id 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE contact_tag_relationships
    DROP CONSTRAINT IF EXISTS fk_contact_tag_rel_tag_id;
ALTER TABLE contact_tag_relationships
    ADD CONSTRAINT fk_contact_tag_rel_tag_id 
    FOREIGN KEY (tag_id) REFERENCES contact_tags(id) ON DELETE CASCADE;

-- Contact groups
ALTER TABLE contact_groups
    DROP CONSTRAINT IF EXISTS fk_contact_groups_user_id;
ALTER TABLE contact_groups
    ADD CONSTRAINT fk_contact_groups_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Contact group members
ALTER TABLE contact_group_members
    DROP CONSTRAINT IF EXISTS fk_contact_group_members_group_id;
ALTER TABLE contact_group_members
    ADD CONSTRAINT fk_contact_group_members_group_id 
    FOREIGN KEY (contact_group_id) REFERENCES contact_groups(id) ON DELETE CASCADE;

ALTER TABLE contact_group_members
    DROP CONSTRAINT IF EXISTS fk_contact_group_members_contact_id;
ALTER TABLE contact_group_members
    ADD CONSTRAINT fk_contact_group_members_contact_id 
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- Invitations
ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS fk_invitations_sender_id;
ALTER TABLE invitations
    ADD CONSTRAINT fk_invitations_sender_id 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS fk_invitations_recipient_user_id;
ALTER TABLE invitations
    ADD CONSTRAINT fk_invitations_recipient_user_id 
    FOREIGN KEY (recipient_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Invitation tokens
ALTER TABLE invitation_tokens
    DROP CONSTRAINT IF EXISTS fk_invitation_tokens_invitation_id;
ALTER TABLE invitation_tokens
    ADD CONSTRAINT fk_invitation_tokens_invitation_id 
    FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE;

-- Calendar integrations
ALTER TABLE calendar_integrations
    DROP CONSTRAINT IF EXISTS fk_calendar_integrations_user_id;
ALTER TABLE calendar_integrations
    ADD CONSTRAINT fk_calendar_integrations_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Calendar shares
ALTER TABLE calendar_shares
    DROP CONSTRAINT IF EXISTS fk_calendar_shares_owner_user_id;
ALTER TABLE calendar_shares
    ADD CONSTRAINT fk_calendar_shares_owner_user_id 
    FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE calendar_shares
    DROP CONSTRAINT IF EXISTS fk_calendar_shares_shared_with_user_id;
ALTER TABLE calendar_shares
    ADD CONSTRAINT fk_calendar_shares_shared_with_user_id 
    FOREIGN KEY (shared_with_user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Reminders
ALTER TABLE reminders
    DROP CONSTRAINT IF EXISTS fk_reminders_event_id;
ALTER TABLE reminders
    ADD CONSTRAINT fk_reminders_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE reminders
    DROP CONSTRAINT IF EXISTS fk_reminders_user_id;
ALTER TABLE reminders
    ADD CONSTRAINT fk_reminders_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User preferences
ALTER TABLE user_preferences
    DROP CONSTRAINT IF EXISTS fk_user_preferences_user_id;
ALTER TABLE user_preferences
    ADD CONSTRAINT fk_user_preferences_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Relationship group members
ALTER TABLE relationship_group_members
    DROP CONSTRAINT IF EXISTS fk_relationship_group_members_group_id;
ALTER TABLE relationship_group_members
    ADD CONSTRAINT fk_relationship_group_members_group_id 
    FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;

ALTER TABLE relationship_group_members
    DROP CONSTRAINT IF EXISTS fk_relationship_group_members_user_id;
ALTER TABLE relationship_group_members
    ADD CONSTRAINT fk_relationship_group_members_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Permission audit logs
ALTER TABLE permission_audit_logs
    DROP CONSTRAINT IF EXISTS fk_permission_audit_logs_user_id;
ALTER TABLE permission_audit_logs
    ADD CONSTRAINT fk_permission_audit_logs_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Event attachments
ALTER TABLE event_attachments
    DROP CONSTRAINT IF EXISTS fk_event_attachments_event_id;
ALTER TABLE event_attachments
    ADD CONSTRAINT fk_event_attachments_event_id 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE event_attachments
    DROP CONSTRAINT IF EXISTS fk_event_attachments_uploaded_by;
ALTER TABLE event_attachments
    ADD CONSTRAINT fk_event_attachments_uploaded_by 
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

-- Custom holidays
ALTER TABLE custom_holidays
    DROP CONSTRAINT IF EXISTS fk_custom_holidays_user_id;
ALTER TABLE custom_holidays
    ADD CONSTRAINT fk_custom_holidays_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ======================================================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- ======================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- User profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;

-- Relationship groups
CREATE INDEX IF NOT EXISTS idx_relationship_groups_user_active ON relationship_groups(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_relationship_groups_name ON relationship_groups(user_id, group_name);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_relationships_user_active ON relationships(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_active ON relationships(partner_id, is_active) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_group ON relationships(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_email ON relationships(partner_email) WHERE partner_email IS NOT NULL;

-- Events
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, start_time);
CREATE INDEX IF NOT EXISTS idx_events_time_range ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_relationship ON events(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_status ON events(user_id, status);
CREATE INDEX IF NOT EXISTS idx_events_privacy ON events(privacy_level);
CREATE INDEX IF NOT EXISTS idx_events_google_calendar ON events(google_calendar_id) WHERE google_calendar_id IS NOT NULL;

-- Event permissions
CREATE INDEX IF NOT EXISTS idx_event_permissions_event ON event_permissions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_permissions_relationship ON event_permissions(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_permissions_group ON event_permissions(group_id) WHERE group_id IS NOT NULL;

-- Event visibility
CREATE INDEX IF NOT EXISTS idx_event_visibility_event ON event_visibility(event_id);
CREATE INDEX IF NOT EXISTS idx_event_visibility_user ON event_visibility(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_visibility_group ON event_visibility(group_id) WHERE group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_visibility_relationship ON event_visibility(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_visibility_privacy ON event_visibility(privacy_level);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user_name ON contacts(user_id, first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(user_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(user_id, phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(user_id, is_favorite) WHERE is_favorite = true;

-- Contact tags
CREATE INDEX IF NOT EXISTS idx_contact_tags_user_name ON contact_tags(user_id, name);

-- Contact tag relationships
CREATE INDEX IF NOT EXISTS idx_contact_tag_rel_contact ON contact_tag_relationships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_rel_tag ON contact_tag_relationships(tag_id);

-- Contact groups
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_name ON contact_groups(user_id, group_name);

-- Contact group members
CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(contact_group_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON invitations(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_email ON invitations(recipient_email, status) WHERE recipient_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_phone ON invitations(recipient_phone, status) WHERE recipient_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at) WHERE status = 'pending';

-- Calendar integrations
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_user_provider ON calendar_integrations(user_id, provider, is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_integrations_sync ON calendar_integrations(last_sync_at) WHERE sync_enabled = true;

-- Calendar shares
CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner ON calendar_shares(owner_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_shared_with ON calendar_shares(shared_with_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_token ON calendar_shares(share_token) WHERE share_token IS NOT NULL;

-- Reminders
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(reminder_time, is_sent);
CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id, is_sent);

-- Relationship group members
CREATE INDEX IF NOT EXISTS idx_relationship_group_members_group ON relationship_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_relationship_group_members_user ON relationship_group_members(user_id);

-- Permission audit logs
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);

-- Event attachments
CREATE INDEX IF NOT EXISTS idx_event_attachments_event ON event_attachments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);

-- Custom holidays
CREATE INDEX IF NOT EXISTS idx_custom_holidays_user_date ON custom_holidays(user_id, date);

-- ======================================================================
-- STEP 6: ADD UPDATED_AT TRIGGERS
-- ======================================================================

-- Create or update the trigger function
-- Modify update_updated_at_column to use a fixed search path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add triggers for all tables with updated_at columns
DO $$ 
BEGIN
    -- Users
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- User profiles
    DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
    CREATE TRIGGER update_user_profiles_updated_at 
        BEFORE UPDATE ON user_profiles 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Relationship groups
    DROP TRIGGER IF EXISTS update_relationship_groups_updated_at ON relationship_groups;
    CREATE TRIGGER update_relationship_groups_updated_at 
        BEFORE UPDATE ON relationship_groups 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Relationships
    DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
    CREATE TRIGGER update_relationships_updated_at 
        BEFORE UPDATE ON relationships 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Events
    DROP TRIGGER IF EXISTS update_events_updated_at ON events;
    CREATE TRIGGER update_events_updated_at 
        BEFORE UPDATE ON events 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Event visibility
    DROP TRIGGER IF EXISTS update_event_visibility_updated_at ON event_visibility;
    CREATE TRIGGER update_event_visibility_updated_at 
        BEFORE UPDATE ON event_visibility 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Contacts
    DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
    CREATE TRIGGER update_contacts_updated_at 
        BEFORE UPDATE ON contacts 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Contact tags
    DROP TRIGGER IF EXISTS update_contact_tags_updated_at ON contact_tags;
    CREATE TRIGGER update_contact_tags_updated_at 
        BEFORE UPDATE ON contact_tags 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Contact groups
    DROP TRIGGER IF EXISTS update_contact_groups_updated_at ON contact_groups;
    CREATE TRIGGER update_contact_groups_updated_at 
        BEFORE UPDATE ON contact_groups 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Invitations
    DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
    CREATE TRIGGER update_invitations_updated_at 
        BEFORE UPDATE ON invitations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Calendar integrations
    DROP TRIGGER IF EXISTS update_calendar_integrations_updated_at ON calendar_integrations;
    CREATE TRIGGER update_calendar_integrations_updated_at 
        BEFORE UPDATE ON calendar_integrations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Calendar shares
    DROP TRIGGER IF EXISTS update_calendar_shares_updated_at ON calendar_shares;
    CREATE TRIGGER update_calendar_shares_updated_at 
        BEFORE UPDATE ON calendar_shares 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Reminders
    DROP TRIGGER IF EXISTS update_reminders_updated_at ON reminders;
    CREATE TRIGGER update_reminders_updated_at 
        BEFORE UPDATE ON reminders 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- User preferences
    DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON user_preferences;
    CREATE TRIGGER update_user_preferences_updated_at 
        BEFORE UPDATE ON user_preferences 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Relationship group members
    DROP TRIGGER IF EXISTS update_relationship_group_members_updated_at ON relationship_group_members;
    CREATE TRIGGER update_relationship_group_members_updated_at 
        BEFORE UPDATE ON relationship_group_members 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Permission audit logs
    DROP TRIGGER IF EXISTS update_permission_audit_logs_updated_at ON permission_audit_logs;
    CREATE TRIGGER update_permission_audit_logs_updated_at 
        BEFORE UPDATE ON permission_audit_logs 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Event attachments
    DROP TRIGGER IF EXISTS update_event_attachments_updated_at ON event_attachments;
    CREATE TRIGGER update_event_attachments_updated_at 
        BEFORE UPDATE ON event_attachments 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    -- Custom holidays
    DROP TRIGGER IF EXISTS update_custom_holidays_updated_at ON custom_holidays;
    CREATE TRIGGER update_custom_holidays_updated_at 
        BEFORE UPDATE ON custom_holidays 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
END $$;

-- ======================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY
-- ======================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_visibility ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_holidays ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- STEP 8: CREATE RLS POLICIES
-- ======================================================================

-- Users policies (users can see their own data)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- User profiles policies
DROP POLICY IF EXISTS "Users can manage own profiles" ON user_profiles;
CREATE POLICY "Users can manage own profiles" ON user_profiles
    FOR ALL USING (auth.uid()::text = id::text);

-- Relationship groups policies
DROP POLICY IF EXISTS "Users can manage own groups" ON relationship_groups;
CREATE POLICY "Users can manage own groups" ON relationship_groups
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Relationships policies
DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;
CREATE POLICY "Users can manage own relationships" ON relationships
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Events policies
DROP POLICY IF EXISTS "Users can manage own events" ON events;
CREATE POLICY "Users can manage own events" ON events
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Event permissions policies
DROP POLICY IF EXISTS "Users can manage event permissions for own events" ON event_permissions;
CREATE POLICY "Users can manage event permissions for own events" ON event_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_permissions.event_id 
            AND events.user_id::text = auth.uid()::text
        )
    );

-- Event visibility policies
DROP POLICY IF EXISTS "Users can manage event visibility for own events" ON event_visibility;
CREATE POLICY "Users can manage event visibility for own events" ON event_visibility
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_visibility.event_id 
            AND events.user_id::text = auth.uid()::text
        )
    );

-- Contacts policies
DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
CREATE POLICY "Users can manage own contacts" ON contacts
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Contact tags policies
DROP POLICY IF EXISTS "Users can manage own contact tags" ON contact_tags;
CREATE POLICY "Users can manage own contact tags" ON contact_tags
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Contact tag relationships policies
DROP POLICY IF EXISTS "Users can manage contact tag relationships" ON contact_tag_relationships;
CREATE POLICY "Users can manage contact tag relationships" ON contact_tag_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_tag_relationships.contact_id 
            AND contacts.user_id::text = auth.uid()::text
        )
    );

-- Contact groups policies
DROP POLICY IF EXISTS "Users can manage own contact groups" ON contact_groups;
CREATE POLICY "Users can manage own contact groups" ON contact_groups
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Contact group members policies
DROP POLICY IF EXISTS "Users can manage contact group members" ON contact_group_members;
CREATE POLICY "Users can manage contact group members" ON contact_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contact_groups 
            WHERE contact_groups.id = contact_group_members.contact_group_id 
            AND contact_groups.user_id::text = auth.uid()::text
        )
    );

-- Invitations policies
DROP POLICY IF EXISTS "Users can manage sent invitations" ON invitations;
CREATE POLICY "Users can manage sent invitations" ON invitations
    FOR ALL USING (auth.uid()::text = sender_id::text);

DROP POLICY IF EXISTS "Users can view received invitations" ON invitations;
CREATE POLICY "Users can view received invitations" ON invitations
    FOR SELECT USING (
        auth.uid()::text = recipient_user_id::text OR
        (recipient_email IS NOT NULL AND recipient_email = auth.email()) OR
        (recipient_phone IS NOT NULL AND recipient_phone = auth.phone())
    );

-- Calendar integrations policies
DROP POLICY IF EXISTS "Users can manage own calendar integrations" ON calendar_integrations;
CREATE POLICY "Users can manage own calendar integrations" ON calendar_integrations
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Calendar shares policies
DROP POLICY IF EXISTS "Users can manage calendar shares they own" ON calendar_shares;
CREATE POLICY "Users can manage calendar shares they own" ON calendar_shares
    FOR ALL USING (auth.uid()::text = owner_user_id::text);

DROP POLICY IF EXISTS "Users can view calendars shared with them" ON calendar_shares;
CREATE POLICY "Users can view calendars shared with them" ON calendar_shares
    FOR SELECT USING (auth.uid()::text = shared_with_user_id::text);

-- Reminders policies
DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
CREATE POLICY "Users can manage own reminders" ON reminders
    FOR ALL USING (auth.uid()::text = user_id::text);

-- User preferences policies
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Relationship group members policies
DROP POLICY IF EXISTS "Users can manage group members for own groups" ON relationship_group_members;
CREATE POLICY "Users can manage group members for own groups" ON relationship_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM relationship_groups 
            WHERE relationship_groups.id = relationship_group_members.group_id 
            AND relationship_groups.user_id::text = auth.uid()::text
        )
    );

-- Permission audit logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON permission_audit_logs;
CREATE POLICY "Users can view own audit logs" ON permission_audit_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Event attachments policies
DROP POLICY IF EXISTS "Users can manage attachments for own events" ON event_attachments;
CREATE POLICY "Users can manage attachments for own events" ON event_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_attachments.event_id 
            AND events.user_id::text = auth.uid()::text
        )
    );

-- Custom holidays policies
DROP POLICY IF EXISTS "Users can manage own holidays" ON custom_holidays;
CREATE POLICY "Users can manage own holidays" ON custom_holidays
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ======================================================================
-- STEP 9: PHASE 3 ENHANCEMENTS
-- ======================================================================

-- Add index to relationships for privacy filtering
CREATE INDEX IF NOT EXISTS idx_relationships_privacy ON relationships(user_id, privacy_level);

-- Add index to relationship_groups for faster lookups
CREATE INDEX IF NOT EXISTS idx_relationship_groups_privacy ON relationship_groups(user_id, is_active);

-- Add index to relationship_group_members for permission checks
CREATE INDEX IF NOT EXISTS idx_group_members_privacy ON relationship_group_members(user_id, group_privacy_level);

-- Add index on events for privacy filtering
CREATE INDEX IF NOT EXISTS idx_events_privacy_user ON events(user_id, privacy_level);

-- ======================================================================
-- STEP 10: PHASE 3 FUNCTIONS FOR PERMISSION INHERITANCE & CONFLICT RESOLUTION
-- ======================================================================

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
  privacy_order TEXT[] := ARRAY['private', 'semi_private', 'visible', 'public'];
  is_owner BOOLEAN;
BEGIN
  -- Check if user is the owner (always full access)
  SELECT user_id = p_user_id INTO is_owner
  FROM events
  WHERE id = p_event_id;
  
  IF is_owner THEN
    RETURN 'visible';
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

-- ======================================================================
-- STEP 11: VERIFICATION
-- ======================================================================

-- Verify the schema structure
SELECT 
    'Schema migration completed successfully' as status,
    NOW() as completed_at,
    'All tables, columns, constraints, and policies created' as changes;

-- List all tables to confirm they exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'user_profiles', 'events', 'contacts', 'contact_tags', 'contact_tag_relationships',
        'relationship_groups', 'relationships', 'event_permissions', 'event_visibility',
        'invitations', 'invitation_tokens', 'calendar_integrations', 'calendar_shares',
        'reminders', 'user_preferences', 'relationship_group_members', 'permission_audit_logs',
        'event_attachments', 'custom_holidays', 'contact_groups', 'contact_group_members'
    )
ORDER BY tablename;