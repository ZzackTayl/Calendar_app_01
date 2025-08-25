-- Migration to update privacy levels to new simplified system
-- From: full_access, limited_access, busy_only, hidden
-- To: visible, private, semi_private

-- ===================================================================
-- UPDATE PRIVACY LEVEL ENUM
-- ===================================================================

-- Drop the old enum and create the new one
DROP TYPE IF EXISTS privacy_level_enum CASCADE;

CREATE TYPE privacy_level_enum AS ENUM (
    'visible',      -- All events, including those outside this group, can see my calendar
    'private',      -- Group only sees full details of events they are invited to
    'semi_private'  -- People in this group only see full details for events they are invited to, and see "busy" for other events
);

-- ===================================================================
-- UPDATE RELATIONSHIPS TABLE
-- ===================================================================

-- Update the relationships table to use new privacy levels
ALTER TABLE relationships 
DROP CONSTRAINT IF EXISTS relationships_default_privacy_level_check;

ALTER TABLE relationships 
ADD CONSTRAINT relationships_default_privacy_level_check 
CHECK (default_privacy_level IN ('visible', 'private', 'semi_private'));

-- Update existing data to map old values to new ones
UPDATE relationships 
SET default_privacy_level = 'visible' 
WHERE default_privacy_level = 'full_access';

UPDATE relationships 
SET default_privacy_level = 'private' 
WHERE default_privacy_level = 'limited_access';

UPDATE relationships 
SET default_privacy_level = 'semi_private' 
WHERE default_privacy_level IN ('busy_only', 'hidden');

-- Set default to 'private' for any remaining old values
UPDATE relationships 
SET default_privacy_level = 'private' 
WHERE default_privacy_level NOT IN ('visible', 'private', 'semi_private');

-- ===================================================================
-- UPDATE RELATIONSHIP GROUP MEMBERS TABLE
-- ===================================================================

-- Update the relationship_group_members table
ALTER TABLE relationship_group_members 
DROP CONSTRAINT IF EXISTS relationship_group_members_privacy_level_check;

ALTER TABLE relationship_group_members 
ADD CONSTRAINT relationship_group_members_privacy_level_check 
CHECK (privacy_level IN ('visible', 'private', 'semi_private'));

-- Update existing data
UPDATE relationship_group_members 
SET privacy_level = 'visible' 
WHERE privacy_level = 'full_access';

UPDATE relationship_group_members 
SET privacy_level = 'private' 
WHERE privacy_level = 'limited_access';

UPDATE relationship_group_members 
SET privacy_level = 'semi_private' 
WHERE privacy_level IN ('busy_only', 'hidden');

-- Set default to 'private' for any remaining old values
UPDATE relationship_group_members 
SET privacy_level = 'private' 
WHERE privacy_level NOT IN ('visible', 'private', 'semi_private');

-- ===================================================================
-- UPDATE EVENT PERMISSIONS TABLE
-- ===================================================================

-- Update the event_permissions table
ALTER TABLE event_permissions 
DROP CONSTRAINT IF EXISTS event_permissions_permission_level_check;

ALTER TABLE event_permissions 
ADD CONSTRAINT event_permissions_permission_level_check 
CHECK (permission_level IN ('visible', 'private', 'semi_private'));

-- Update existing data
UPDATE event_permissions 
SET permission_level = 'visible' 
WHERE permission_level = 'full_access';

UPDATE event_permissions 
SET permission_level = 'private' 
WHERE permission_level = 'limited_access';

UPDATE event_permissions 
SET permission_level = 'semi_private' 
WHERE permission_level IN ('busy_only', 'hidden');

-- Set default to 'private' for any remaining old values
UPDATE event_permissions 
SET permission_level = 'private' 
WHERE permission_level NOT IN ('visible', 'private', 'semi_private');

-- ===================================================================
-- UPDATE CONTACTS TABLE (if it has privacy_level)
-- ===================================================================

-- Check if contacts table has privacy_level column and update if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'privacy_level'
    ) THEN
        ALTER TABLE contacts 
        DROP CONSTRAINT IF EXISTS contacts_privacy_level_check;
        
        ALTER TABLE contacts 
        ADD CONSTRAINT contacts_privacy_level_check 
        CHECK (privacy_level IN ('visible', 'private', 'semi_private'));
        
        -- Update existing data
        UPDATE contacts 
        SET privacy_level = 'visible' 
        WHERE privacy_level = 'full_access';
        
        UPDATE contacts 
        SET privacy_level = 'private' 
        WHERE privacy_level = 'limited_access';
        
        UPDATE contacts 
        SET privacy_level = 'semi_private' 
        WHERE privacy_level IN ('busy_only', 'hidden');
        
        -- Set default to 'private' for any remaining old values
        UPDATE contacts 
        SET privacy_level = 'private' 
        WHERE privacy_level NOT IN ('visible', 'private', 'semi_private');
    END IF;
END $$;

-- ===================================================================
-- SET DEFAULT VALUES
-- ===================================================================

-- Set default privacy level to 'private' for new relationships
ALTER TABLE relationships 
ALTER COLUMN default_privacy_level SET DEFAULT 'private';

-- Set default privacy level to 'private' for new group members
ALTER TABLE relationship_group_members 
ALTER COLUMN privacy_level SET DEFAULT 'private';

-- Set default permission level to 'private' for new event permissions
ALTER TABLE event_permissions 
ALTER COLUMN permission_level SET DEFAULT 'private';
