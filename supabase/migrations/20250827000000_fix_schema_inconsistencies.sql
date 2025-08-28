-- ===================================================================
-- CRITICAL SCHEMA FIXES MIGRATION
-- Description: Fixes database schema inconsistencies causing test failures 
--              and data integrity issues
-- Date: 2025-08-27
-- Purpose: 
--   1. Standardize field naming (owner_id vs user_id conflicts)
--   2. Fix privacy enum inconsistencies  
--   3. Add missing foreign key constraints
--   4. Create missing tables referenced by API
--   5. Add proper indexes for performance
-- ===================================================================

-- ===================================================================
-- STEP 1: STANDARDIZE PRIVACY ENUMS
-- ===================================================================

-- Drop existing privacy enum and recreate with standardized values
-- This addresses the inconsistency between old/new privacy levels
DROP TYPE IF EXISTS privacy_level_enum CASCADE;

CREATE TYPE privacy_level_enum AS ENUM (
    'private',      -- Default: Only the owner can see full details
    'visible',      -- Group members can see full details
    'semi_private'  -- Group members see "busy" status only
);

-- Update privacy level constraints across all tables
-- Fix relationships table privacy constraints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relationships') THEN
        -- Remove old constraint
        ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_default_privacy_level_check;
        ALTER TABLE relationships DROP CONSTRAINT IF EXISTS relationships_privacy_level_check;
        
        -- Add new constraint  
        ALTER TABLE relationships ADD CONSTRAINT relationships_privacy_level_check 
        CHECK (default_privacy_level IN ('private', 'visible', 'semi_private'));
        
        -- Update existing data to new values
        UPDATE relationships SET default_privacy_level = 'visible' 
        WHERE default_privacy_level IN ('full_access');
        
        UPDATE relationships SET default_privacy_level = 'private'
        WHERE default_privacy_level IN ('limited_access');
        
        UPDATE relationships SET default_privacy_level = 'semi_private'
        WHERE default_privacy_level IN ('busy_only', 'hidden');
        
        -- Set default for any remaining invalid values
        UPDATE relationships SET default_privacy_level = 'private'
        WHERE default_privacy_level NOT IN ('private', 'visible', 'semi_private');
        
        -- Update column default
        ALTER TABLE relationships ALTER COLUMN default_privacy_level SET DEFAULT 'private';
    END IF;
END $$;

-- Fix event_permissions table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_permissions') THEN
        -- Remove old constraint
        ALTER TABLE event_permissions DROP CONSTRAINT IF EXISTS event_permissions_permission_level_check;
        
        -- Add new constraint
        ALTER TABLE event_permissions ADD CONSTRAINT event_permissions_permission_level_check 
        CHECK (permission_level IN ('private', 'visible', 'semi_private'));
        
        -- Update existing data
        UPDATE event_permissions SET permission_level = 'visible' 
        WHERE permission_level IN ('full_access');
        
        UPDATE event_permissions SET permission_level = 'private'
        WHERE permission_level IN ('limited_access');
        
        UPDATE event_permissions SET permission_level = 'semi_private'
        WHERE permission_level IN ('busy_only', 'hidden');
        
        -- Set default for any remaining invalid values
        UPDATE event_permissions SET permission_level = 'private'
        WHERE permission_level NOT IN ('private', 'visible', 'semi_private');
        
        -- Update column default
        ALTER TABLE event_permissions ALTER COLUMN permission_level SET DEFAULT 'private';
    END IF;
END $$;

-- ===================================================================
-- STEP 2: STANDARDIZE FIELD NAMING (CRITICAL FIX)
-- ===================================================================

-- DECISION: Use 'user_id' for general user ownership, 'owner_id' for event ownership
-- This maintains API consistency and follows database conventions

-- Fix contacts table (if exists) - API uses user_id, ensure consistency
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        -- Ensure contacts table uses user_id (should already be correct)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contacts' AND column_name = 'user_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'contacts' AND column_name = 'owner_id'
        ) THEN
            -- Rename owner_id to user_id if needed
            ALTER TABLE contacts RENAME COLUMN owner_id TO user_id;
        END IF;
    END IF;
END $$;

-- Events table uses owner_id (keep as is, API already expects this)
-- Relationships table uses user_id (keep as is, this is correct)

-- ===================================================================
-- STEP 3: CREATE MISSING TABLES REFERENCED BY API
-- ===================================================================

-- Contact Tags table (referenced by contacts API)
CREATE TABLE IF NOT EXISTS contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE (user_id, name),
    CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Contact Groups table (referenced by contacts API)
CREATE TABLE IF NOT EXISTS contact_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints  
    UNIQUE (user_id, name),
    CHECK (length(name) > 0 AND length(name) <= 100)
);

-- Contact Tag Relationships (many-to-many)
CREATE TABLE IF NOT EXISTS contact_tag_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE (contact_id, tag_id)
);

-- Contact Group Relationships (many-to-many)
CREATE TABLE IF NOT EXISTS contact_group_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    group_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE (contact_id, group_id)
);

-- Contact Activity Log (referenced by contacts API)
CREATE TABLE IF NOT EXISTS contact_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL,
    user_id UUID NOT NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('created', 'updated', 'deleted', 'viewed')),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update contacts table structure to match API expectations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        -- Add missing columns that API expects
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS first_name TEXT;
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_name TEXT;
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company TEXT;
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
        ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
        
        -- Migrate data if 'name' column exists but first_name/last_name don't have data
        UPDATE contacts SET 
            first_name = COALESCE(first_name, split_part(name, ' ', 1)),
            last_name = COALESCE(last_name, NULLIF(substring(name from '\s+(.*)'), ''))
        WHERE name IS NOT NULL AND (first_name IS NULL OR last_name IS NULL);
    END IF;
END $$;

-- ===================================================================
-- STEP 4: ADD MISSING FOREIGN KEY CONSTRAINTS
-- ===================================================================

-- Add foreign key constraints to ensure referential integrity

-- Contact tables foreign keys
DO $$
BEGIN
    -- contact_tags foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_tags') THEN
        ALTER TABLE contact_tags DROP CONSTRAINT IF EXISTS fk_contact_tags_user_id;
        -- Note: Will add FK to auth.users when auth system is clarified
    END IF;
    
    -- contact_groups foreign key  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_groups') THEN
        ALTER TABLE contact_groups DROP CONSTRAINT IF EXISTS fk_contact_groups_user_id;
        -- Note: Will add FK to auth.users when auth system is clarified
    END IF;
    
    -- contact_tag_relationships foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_tag_relationships') 
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_tags') THEN
        ALTER TABLE contact_tag_relationships DROP CONSTRAINT IF EXISTS fk_contact_tag_rel_contact;
        ALTER TABLE contact_tag_relationships DROP CONSTRAINT IF EXISTS fk_contact_tag_rel_tag;
        
        ALTER TABLE contact_tag_relationships 
        ADD CONSTRAINT fk_contact_tag_rel_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
        
        ALTER TABLE contact_tag_relationships 
        ADD CONSTRAINT fk_contact_tag_rel_tag 
        FOREIGN KEY (tag_id) REFERENCES contact_tags(id) ON DELETE CASCADE;
    END IF;
    
    -- contact_group_relationships foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_group_relationships')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') 
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_groups') THEN
        ALTER TABLE contact_group_relationships DROP CONSTRAINT IF EXISTS fk_contact_group_rel_contact;
        ALTER TABLE contact_group_relationships DROP CONSTRAINT IF EXISTS fk_contact_group_rel_group;
        
        ALTER TABLE contact_group_relationships 
        ADD CONSTRAINT fk_contact_group_rel_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
        
        ALTER TABLE contact_group_relationships 
        ADD CONSTRAINT fk_contact_group_rel_group 
        FOREIGN KEY (group_id) REFERENCES contact_groups(id) ON DELETE CASCADE;
    END IF;
    
    -- contact_activity_log foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_activity_log')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        ALTER TABLE contact_activity_log DROP CONSTRAINT IF EXISTS fk_contact_activity_contact;
        
        ALTER TABLE contact_activity_log 
        ADD CONSTRAINT fk_contact_activity_contact 
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix existing event-related foreign keys
DO $$
BEGIN
    -- events table foreign keys (ensure proper cascading)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relationships') THEN
        ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_relationship;
        
        ALTER TABLE events 
        ADD CONSTRAINT fk_events_relationship 
        FOREIGN KEY (relationship_id) REFERENCES relationships(id) ON DELETE SET NULL;
    END IF;
    
    -- reminders foreign key to events (should cascade delete)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reminders')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        ALTER TABLE reminders DROP CONSTRAINT IF EXISTS fk_reminders_event;
        
        ALTER TABLE reminders 
        ADD CONSTRAINT fk_reminders_event 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ===================================================================
-- STEP 5: ADD PERFORMANCE INDEXES
-- ===================================================================

-- Contact-related indexes
CREATE INDEX IF NOT EXISTS idx_contact_tags_user_name ON contact_tags(user_id, name);
CREATE INDEX IF NOT EXISTS idx_contact_groups_user_name ON contact_groups(user_id, name);
CREATE INDEX IF NOT EXISTS idx_contact_tag_rel_contact ON contact_tag_relationships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tag_rel_tag ON contact_tag_relationships(tag_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_rel_contact ON contact_group_relationships(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_group_rel_group ON contact_group_relationships(group_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_log_contact ON contact_activity_log(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_log_user ON contact_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_activity_log_type ON contact_activity_log(activity_type);

-- Enhanced indexes for existing tables
DO $$
BEGIN
    -- Contacts table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        CREATE INDEX IF NOT EXISTS idx_contacts_user_name ON contacts(user_id, first_name, last_name);
        CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company) WHERE company IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(user_id, is_favorite) WHERE is_favorite = true;
    END IF;
    
    -- Events table indexes (if missing)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        CREATE INDEX IF NOT EXISTS idx_events_owner_time ON events(owner_id, start_time);
        CREATE INDEX IF NOT EXISTS idx_events_privacy_level ON events(privacy_level);
        CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    END IF;
END $$;

-- ===================================================================
-- STEP 6: ADD UPDATED_AT TRIGGERS
-- ===================================================================

-- Ensure updated_at triggers exist for new tables
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for new tables
DO $$ BEGIN
    CREATE TRIGGER trg_contact_tags_updated
    BEFORE UPDATE ON contact_tags
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_contact_groups_updated
    BEFORE UPDATE ON contact_groups  
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- STEP 7: DATA MIGRATION AND CLEANUP
-- ===================================================================

-- Clean up any orphaned data that violates new constraints
DO $$
BEGIN
    -- Remove any event_permissions with invalid permission levels
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_permissions') THEN
        DELETE FROM event_permissions 
        WHERE permission_level NOT IN ('private', 'visible', 'semi_private');
    END IF;
    
    -- Remove any relationships with invalid privacy levels
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relationships') THEN
        UPDATE relationships SET default_privacy_level = 'private'
        WHERE default_privacy_level IS NULL OR default_privacy_level NOT IN ('private', 'visible', 'semi_private');
    END IF;
END $$;

-- ===================================================================
-- STEP 8: ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on new tables
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_groups ENABLE ROW LEVEL SECURITY; 
ALTER TABLE contact_tag_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_group_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_activity_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for new tables
-- Note: These assume Supabase auth.uid() is available

-- Contact tags policies
CREATE POLICY "Users can manage their contact tags" ON contact_tags
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Contact groups policies  
CREATE POLICY "Users can manage their contact groups" ON contact_groups
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Contact relationships policies
CREATE POLICY "Users can manage contact tag relationships" ON contact_tag_relationships
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts 
            WHERE contacts.id = contact_tag_relationships.contact_id 
            AND contacts.user_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Users can manage contact group relationships" ON contact_group_relationships  
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contacts
            WHERE contacts.id = contact_group_relationships.contact_id
            AND contacts.user_id::text = auth.uid()::text  
        )
    );

-- Contact activity log policies
CREATE POLICY "Users can view their contact activity" ON contact_activity_log
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert activity logs" ON contact_activity_log
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- ===================================================================
-- VERIFICATION AND COMMENTS  
-- ===================================================================

-- Add helpful comments
COMMENT ON TABLE contact_tags IS 'User-defined tags for organizing contacts';
COMMENT ON TABLE contact_groups IS 'User-defined groups for organizing contacts';
COMMENT ON TABLE contact_tag_relationships IS 'Many-to-many relationship between contacts and tags';
COMMENT ON TABLE contact_group_relationships IS 'Many-to-many relationship between contacts and groups';
COMMENT ON TABLE contact_activity_log IS 'Audit log for contact-related activities';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Schema inconsistencies migration completed successfully at %', NOW();
    RAISE NOTICE 'Fixed: Privacy enum standardization, field naming consistency, missing FK constraints, missing tables';
END $$;

-- Migration validation query (for debugging)
SELECT 
    'Schema Fix Migration Completed' as status,
    NOW() as completed_at,
    'Fixed privacy enums, field naming, FK constraints, and added missing tables' as changes;