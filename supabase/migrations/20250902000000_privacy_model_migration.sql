-- Privacy Model Migration Script
-- Migrates from 4-level privacy system to 3-tier connection system
-- with event-level privacy overrides

-- ===================================================================
-- STEP 1: Create New Enum Types
-- ===================================================================

-- New connection tier enum (replaces privacy_level)
DO $$ 
BEGIN
    CREATE TYPE connection_tier AS ENUM (
        'private',     -- See nothing (maps from 'hidden')
        'busy_only',   -- See free/busy blocks only (maps from 'busy_only' + 'limited_access')
        'details'      -- See all event details (maps from 'full_access')
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Event privacy override enum
DO $$ 
BEGIN
    CREATE TYPE event_privacy_override AS ENUM (
        'default',     -- Use connection tier
        'private'      -- Hide from everyone except explicit participants
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ===================================================================
-- STEP 2: Add New Columns to Existing Tables
-- ===================================================================

-- Add event privacy override to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS privacy_override event_privacy_override DEFAULT 'default';

-- Add connection tier to relationships table (replaces default_privacy_level)
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';

-- Add connection tier to relationship_group_members table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationship_group_members') THEN
        ALTER TABLE relationship_group_members 
        ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';
    END IF;
END $$;

-- ===================================================================
-- STEP 3: Migrate Existing Data
-- ===================================================================

-- Migrate relationships table
UPDATE relationships 
SET connection_tier = CASE 
    WHEN default_privacy_level = 'private' THEN 'private'::connection_tier
    WHEN default_privacy_level = 'visible' THEN 'details'::connection_tier
    WHEN default_privacy_level = 'semi_private' THEN 'busy_only'::connection_tier
    WHEN default_privacy_level = 'public' THEN 'details'::connection_tier
    ELSE 'details'::connection_tier  -- Default fallback
END
WHERE default_privacy_level IS NOT NULL;

-- Migrate relationship_group_members table (if it exists and has the right column)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationship_group_members') 
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'relationship_group_members' AND column_name = 'group_privacy_level') THEN
        UPDATE relationship_group_members 
        SET connection_tier = CASE 
            WHEN group_privacy_level = 'private' THEN 'private'::connection_tier
            WHEN group_privacy_level = 'visible' THEN 'details'::connection_tier
            WHEN group_privacy_level = 'semi_private' THEN 'busy_only'::connection_tier
            WHEN group_privacy_level = 'public' THEN 'details'::connection_tier
            ELSE 'details'::connection_tier  -- Default fallback
        END
        WHERE group_privacy_level IS NOT NULL;
    END IF;
END $$;

-- Migrate event_visibility table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_visibility') THEN
        UPDATE event_visibility 
        SET privacy_level = CASE 
            WHEN privacy_level = 'private' THEN 'private'::privacy_level_enum
            WHEN privacy_level = 'visible' THEN 'public'::privacy_level_enum
            WHEN privacy_level = 'semi_private' THEN 'semi_private'::privacy_level_enum
            WHEN privacy_level = 'public' THEN 'public'::privacy_level_enum
            ELSE 'private'::privacy_level_enum  -- Default fallback
        END
        WHERE privacy_level IS NOT NULL;
    END IF;
END $$;

-- ===================================================================
-- STEP 4: Create Indexes for Performance
-- ===================================================================

-- Index for connection tier lookups
CREATE INDEX IF NOT EXISTS idx_relationships_connection_tier 
ON relationships(user_id, connection_tier) 
WHERE is_active = TRUE;

-- Index for group members connection tier (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationship_group_members') THEN
        CREATE INDEX IF NOT EXISTS idx_group_members_connection_tier 
        ON relationship_group_members(group_id, connection_tier);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_privacy_override 
ON events(privacy_override) 
WHERE privacy_override = 'private';

-- ===================================================================
-- STEP 5: Create Helper Functions
-- ===================================================================

-- Function to get connection tier between two users
CREATE OR REPLACE FUNCTION get_connection_tier(
    user_id UUID,
    target_user_id UUID
) RETURNS connection_tier AS $$
DECLARE
    result connection_tier;
BEGIN
    -- Check direct relationships
    SELECT connection_tier INTO result
    FROM relationships
    WHERE (user_id = $1 AND partner_id = $2) 
       OR (user_id = $2 AND partner_id = $1)
    AND is_active = TRUE
    LIMIT 1;
    
    -- If no direct relationship, check group relationships (if table exists)
    IF result IS NULL AND EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationship_group_members') THEN
        SELECT rgm.connection_tier INTO result
        FROM relationship_group_members rgm
        JOIN relationship_groups rg ON rgm.group_id = rg.id
        WHERE rg.user_id = $1 
        AND EXISTS (
            SELECT 1 FROM relationship_group_members rgm2
            WHERE rgm2.group_id = rg.id 
            AND rgm2.relationship_id IN (
                SELECT id FROM relationships 
                WHERE user_id = $2 AND is_active = TRUE
            )
        )
        LIMIT 1;
    END IF;
    
    -- Default to private if no connection found
    RETURN COALESCE(result, 'private'::connection_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view event details
CREATE OR REPLACE FUNCTION can_view_event_details(
    event_id UUID,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    event_user_id UUID;
    event_privacy_override_val event_privacy_override;
    connection_tier_val connection_tier;
BEGIN
    -- Get event owner and privacy override
    SELECT e.user_id, e.privacy_override INTO event_user_id, event_privacy_override_val
    FROM events e
    WHERE e.id = $1;
    
    -- If event doesn't exist, return false
    IF event_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If user is the event owner, always allow
    IF event_user_id = $2 THEN
        RETURN TRUE;
    END IF;
    
    -- If event is private override, check explicit permissions
    IF event_privacy_override_val = 'private' THEN
        RETURN EXISTS (
            SELECT 1 FROM event_permissions ep
            WHERE ep.event_id = $1
            AND ep.relationship_id IN (
                SELECT id FROM relationships 
                WHERE (user_id = event_user_id AND partner_id = $2)
                   OR (user_id = $2 AND partner_id = event_user_id)
                AND is_active = TRUE
            )
        );
    END IF;
    
    -- Otherwise, check connection tier
    connection_tier_val := get_connection_tier(event_user_id, $2);
    RETURN connection_tier_val = 'details';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view event at all
CREATE OR REPLACE FUNCTION can_view_event(
    event_id UUID,
    user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    event_user_id UUID;
    event_privacy_override_val event_privacy_override;
    connection_tier_val connection_tier;
BEGIN
    -- Get event owner and privacy override
    SELECT e.user_id, e.privacy_override INTO event_user_id, event_privacy_override_val
    FROM events e
    WHERE e.id = $1;
    
    -- If event doesn't exist, return false
    IF event_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If user is the event owner, always allow
    IF event_user_id = $2 THEN
        RETURN TRUE;
    END IF;
    
    -- If event is private override, check explicit permissions
    IF event_privacy_override_val = 'private' THEN
        RETURN EXISTS (
            SELECT 1 FROM event_permissions ep
            WHERE ep.event_id = $1
            AND ep.relationship_id IN (
                SELECT id FROM relationships 
                WHERE (user_id = event_user_id AND partner_id = $2)
                   OR (user_id = $2 AND partner_id = event_user_id)
                AND is_active = TRUE
            )
        );
    END IF;
    
    -- Otherwise, check connection tier
    connection_tier_val := get_connection_tier(event_user_id, $2);
    RETURN connection_tier_val IN ('busy_only', 'details');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- STEP 6: Create Privacy-Aware Events View
-- ===================================================================

-- View that filters events based on privacy settings
CREATE OR REPLACE VIEW events_with_privacy AS
SELECT 
    e.*,
    can_view_event(e.id, auth.uid()) as can_view,
    can_view_event_details(e.id, auth.uid()) as can_view_details
FROM events e
WHERE can_view_event(e.id, auth.uid());

-- ===================================================================
-- STEP 7: Add Row Level Security Policies
-- ===================================================================

-- Enable RLS on events_with_privacy view
ALTER VIEW events_with_privacy SET (security_invoker = true);

-- Add RLS policy for events table
DROP POLICY IF EXISTS "Users can view events based on privacy" ON events;
CREATE POLICY "Users can view events based on privacy" ON events
    FOR SELECT USING (can_view_event(id, auth.uid()));

-- Add RLS policy for relationships table
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (user_id = auth.uid() OR partner_id = auth.uid());

-- Add RLS policy for relationship_groups table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'relationship_groups') THEN
        DROP POLICY IF EXISTS "Users can view their groups" ON relationship_groups;
        CREATE POLICY "Users can view their groups" ON relationship_groups
            FOR SELECT USING (user_id = auth.uid());
    END IF;
END $$;

-- ===================================================================
-- STEP 8: Cleanup and Documentation
-- ===================================================================

-- Add comments for documentation
COMMENT ON FUNCTION get_connection_tier(UUID, UUID) IS 'Get the connection tier between two users for privacy enforcement';
COMMENT ON FUNCTION can_view_event_details(UUID, UUID) IS 'Check if a user can view detailed event information';
COMMENT ON FUNCTION can_view_event(UUID, UUID) IS 'Check if a user can view an event at all (including busy-only)';
COMMENT ON VIEW events_with_privacy IS 'Privacy-aware view of events with access control';

-- Note: We're keeping the old privacy_level_enum for backward compatibility
-- but the new system uses connection_tier for relationships and privacy_override for events
