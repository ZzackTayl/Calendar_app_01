-- Enhanced MVP Schema for PolyHarmony Calendar Application
-- This schema extends the base MVP schema with additional tables and fields
-- needed to support the full feature set described in Project_MVP.md

-- ===================================================================
-- EXTENSIONS
-- ===================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ===================================================================
-- ENUM TYPES
-- ===================================================================
-- Privacy level enum (extended)
DO $$ BEGIN
    CREATE TYPE privacy_level_enum AS ENUM (
        'full_access',    -- Full event details are visible
        'limited_access', -- Limited details are visible
        'busy_only',      -- Only busy/free status is visible
        'hidden'          -- Event is completely hidden
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Event status enum
DO $$ BEGIN
    CREATE TYPE event_status_enum AS ENUM (
        'confirmed',
        'tentative',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ===================================================================
-- USERS EXTENSION (optional, uses Supabase Auth as primary source)
-- ===================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month', -- 'month', 'week', 'day', 'agenda'
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- ===================================================================
-- ENHANCED RELATIONSHIPS & GROUPS
-- ===================================================================

-- Keep existing relationships table, add default_privacy_level
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS default_privacy_level TEXT 
    DEFAULT 'full_access'
    CHECK (default_privacy_level IN ('full_access', 'limited_access', 'busy_only', 'hidden'));

-- Enhanced relationship groups
ALTER TABLE relationship_groups
ADD COLUMN IF NOT EXISTS color TEXT;

-- ===================================================================
-- CONTACTS (New table for external contacts)
-- ===================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- owner (auth user id)
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    color TEXT, -- Optional color for visual identification
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, email) -- Prevent duplicate contacts with same email
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(user_id, email) WHERE email IS NOT NULL;

-- Contact group memberships
CREATE TABLE IF NOT EXISTS contact_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_members_contact ON contact_group_members(contact_id);

-- ===================================================================
-- ENHANCED EVENTS
-- ===================================================================

-- Add new fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
ADD COLUMN IF NOT EXISTS recurrence_exception_dates TEXT[],
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed' 
    CHECK (status IN ('confirmed', 'tentative', 'cancelled')),
ADD COLUMN IF NOT EXISTS external_calendar_id TEXT,
ADD COLUMN IF NOT EXISTS external_calendar_source TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS visible_to_contacts UUID[],
ADD COLUMN IF NOT EXISTS visible_to_groups UUID[];

-- ===================================================================
-- EVENT ATTACHMENTS
-- ===================================================================
CREATE TABLE IF NOT EXISTS event_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL, -- Supabase auth user id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_attachments_event ON event_attachments(event_id);

-- ===================================================================
-- GRANULAR EVENT PERMISSIONS (for more advanced privacy controls)
-- ===================================================================
CREATE TABLE IF NOT EXISTS event_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Only one of these should be set (relationship, contact or group)
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    group_id UUID REFERENCES relationship_groups(id) ON DELETE CASCADE,
    
    permission_level TEXT NOT NULL
        CHECK (permission_level IN ('full_access', 'limited_access', 'busy_only', 'hidden')),
    
    -- Fields for custom display (when limited_access)
    custom_title TEXT,
    custom_description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure only one target type is specified
    CHECK (
        (relationship_id IS NOT NULL)::INTEGER + 
        (contact_id IS NOT NULL)::INTEGER + 
        (group_id IS NOT NULL)::INTEGER = 1
    )
);

CREATE INDEX IF NOT EXISTS idx_event_permissions_event ON event_permissions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_permissions_relationship ON event_permissions(relationship_id) 
    WHERE relationship_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_permissions_contact ON event_permissions(contact_id) 
    WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_permissions_group ON event_permissions(group_id) 
    WHERE group_id IS NOT NULL;



-- ===================================================================
-- REMINDERS
-- ===================================================================
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- owner (auth user id)
    reminder_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL DEFAULT 'notification'
        CHECK (type IN ('notification', 'email', 'sms')),
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_time ON reminders(user_id, reminder_time) 
    WHERE sent = FALSE;

-- ===================================================================
-- CUSTOM HOLIDAYS
-- ===================================================================
CREATE TABLE IF NOT EXISTS custom_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- owner (auth user id)
    name TEXT NOT NULL,
    date DATE NOT NULL,
    recurring BOOLEAN DEFAULT TRUE, -- Occurs yearly
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_holidays_user ON custom_holidays(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_holidays_date ON custom_holidays(date);

-- ===================================================================
-- TRIGGERS for updated_at
-- ===================================================================
-- Add trigger for new tables
DO $$ BEGIN
    CREATE TRIGGER trg_user_profiles_updated
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_contacts_updated
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_contact_group_members_updated
    BEFORE UPDATE ON contact_group_members
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_event_attachments_updated
    BEFORE UPDATE ON event_attachments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_event_permissions_updated
    BEFORE UPDATE ON event_permissions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;



DO $$ BEGIN
    CREATE TRIGGER trg_reminders_updated
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_custom_holidays_updated
    BEFORE UPDATE ON custom_holidays
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- MIGRATION FUNCTION
-- ===================================================================
-- Create a function to help migrate data from old format to new
CREATE OR REPLACE FUNCTION migrate_event_visibility() 
RETURNS VOID AS $$
DECLARE
    event_rec RECORD;
    rel_id UUID;
BEGIN
    -- For each event with visible_to_relationships
    FOR event_rec IN 
        SELECT id, visible_to_relationships 
        FROM events 
        WHERE privacy_level = 'custom' 
        AND visible_to_relationships IS NOT NULL 
        AND array_length(visible_to_relationships, 1) > 0
    LOOP
        -- Create permission records for each relationship
        FOREACH rel_id IN ARRAY event_rec.visible_to_relationships
        LOOP
            -- Only insert if not already exists
            INSERT INTO event_permissions (event_id, relationship_id, permission_level)
            VALUES (event_rec.id, rel_id, 'full_access')
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
