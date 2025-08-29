-- Enhanced MVP Schema Migration
-- Date: 2025-08-22
-- Purpose: Create enhanced MVP schema with additional tables and fields

-- User profiles table
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
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

-- Contact group members table
CREATE TABLE contact_group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, contact_id)
);

-- Event attachments table
CREATE TABLE event_attachments (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event permissions table
CREATE TABLE event_permissions (
    id UUID PRIMARY KEY,
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

-- Reminders table
CREATE TABLE reminders (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom holidays table
CREATE TABLE custom_holidays (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    recurring BOOLEAN DEFAULT TRUE,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_user_profiles_id ON user_profiles(id);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX idx_contact_group_members_contact ON contact_group_members(contact_id);
CREATE INDEX idx_event_attachments_event ON event_attachments(event_id);
CREATE INDEX idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);
CREATE INDEX idx_event_permissions_event ON event_permissions(event_id);
CREATE INDEX idx_reminders_event ON reminders(event_id);
CREATE INDEX idx_custom_holidays_user ON custom_holidays(user_id);
CREATE INDEX idx_custom_holidays_date ON custom_holidays(date);