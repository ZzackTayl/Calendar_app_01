-- Privacy Model Migration Script
-- Migrates from 4-level privacy system to 3-tier connection system
-- with event-level privacy overrides

-- ===================================================================
-- STEP 1: Create New Enum Types
-- ===================================================================

-- New connection tier enum (replaces privacy_level)
CREATE TYPE connection_tier AS ENUM (
    'private',     -- See nothing (maps from 'hidden')
    'busy_only',   -- See free/busy blocks only (maps from 'busy_only' + 'limited_access')
    'details'      -- See all event details (maps from 'full_access')
);

-- Event privacy override enum
CREATE TYPE event_privacy_override AS ENUM (
    'default',     -- Use connection tier
    'private'      -- Hide from everyone except explicit participants
);

-- ===================================================================
-- STEP 2: Add New Columns to Existing Tables
-- ===================================================================

-- Add event privacy override to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS privacy_override event_privacy_override DEFAULT 'default';

-- Add connection tier to relationships table (replaces default_privacy_level)
ALTER TABLE relationships 
ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';

-- Add connection tier to relationship_group_members table
ALTER TABLE relationship_group_members 
ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';

-- ===================================================================
-- STEP 3: Migrate Existing Data
-- ===================================================================

-- Migrate relationships table
UPDATE relationships 
SET connection_tier = CASE 
    WHEN default_privacy_level = 'hidden' THEN 'private'::connection_tier
    WHEN default_privacy_level = 'busy_only' THEN 'busy_only'::connection_tier
    WHEN default_privacy_level = 'limited_access' THEN 'busy_only'::connection_tier
    WHEN default_privacy_level = 'full_access' THEN 'details'::connection_tier
    ELSE 'details'::connection_tier  -- Default fallback
END
WHERE default_privacy_level IS NOT NULL;

-- Migrate relationship_group_members table
UPDATE relationship_group_members 
SET connection_tier = CASE 
    WHEN group_privacy_level = 'hidden' THEN 'private'::connection_tier
    WHEN group_privacy_level = 'busy_only' THEN 'busy_only'::connection_tier
    WHEN group_privacy_level = 'limited_access' THEN 'busy_only'::connection_tier
    WHEN group_privacy_level = 'full_access' THEN 'details'::connection_tier
    ELSE 'details'::connection_tier  -- Default fallback
END
WHERE group_privacy_level IS NOT NULL;

-- Migrate event_privacy table
UPDATE event_privacy 
SET privacy_level = CASE 
    WHEN privacy_level = 'hidden' THEN 'private'::privacy_level
    WHEN privacy_level = 'busy_only' THEN 'busy_only'::privacy_level
    WHEN privacy_level = 'limited_access' THEN 'busy_only'::privacy_level
    WHEN privacy_level = 'full_access' THEN 'details'::privacy_level
    ELSE 'details'::privacy_level  -- Default fallback
END
WHERE privacy_level IS NOT NULL;

-- ===================================================================
-- STEP 4: Update Privacy Level Enum (if needed)
-- ===================================================================

-- Note: We're keeping the existing privacy_level enum for backward compatibility
-- but adding the new connection_tier enum for the new system

-- ===================================================================
-- STEP 5: Create Indexes for Performance
-- ===================================================================

-- Index for connection tier lookups
CREATE INDEX IF NOT EXISTS idx_relationships_connection_tier 
ON relationships(user_id, connection_tier) 
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_group_members_connection_tier 
ON relationship_group_members(group_id, connection_tier);

CREATE INDEX IF NOT EXISTS idx_events_privacy_override 
ON events(privacy_override) 
WHERE privacy_override = 'private';

-- ===================================================================
-- STEP 6: Create Helper Functions
-- ===================================================================

-- Function to get connection tier between two users
CREATE OR REPLACE FUNCTION get_connection_tier(
    viewer_id UUID,
    owner_id UUID
) RETURNS connection_tier AS $$
DECLARE
    tier connection_tier;
BEGIN
    -- Check direct relationship
    SELECT connection_tier INTO tier
    FROM relationships 
    WHERE user_id = viewer_id 
      AND partner_id = owner_id 
      AND is_active = TRUE
    LIMIT 1;
    
    -- If no direct relationship, check group memberships
    IF tier IS NULL THEN
        SELECT rgm.connection_tier INTO tier
        FROM relationship_group_members rgm1
        JOIN relationship_group_members rgm2 ON rgm1.group_id = rgm2.group_id
        WHERE rgm1.user_id = viewer_id 
          AND rgm2.user_id = owner_id
        ORDER BY rgm1.connection_tier DESC  -- Prefer most permissive tier
        LIMIT 1;
    END IF;
    
    -- Default to private if no relationship found
    RETURN COALESCE(tier, 'private'::connection_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view event details
CREATE OR REPLACE FUNCTION can_view_event_details(
    viewer_id UUID,
    event_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    event_owner_id UUID;
    event_override event_privacy_override;
    connection_tier_val connection_tier;
BEGIN
    -- Get event owner and privacy override
    SELECT owner_id, privacy_override 
    INTO event_owner_id, event_override
    FROM events 
    WHERE id = event_id;
    
    -- Owner can always see their own events
    IF viewer_id = event_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if viewer is explicit participant
    IF EXISTS (
        SELECT 1 FROM event_attendees 
        WHERE event_id = can_view_event_details.event_id 
          AND user_id = viewer_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if viewer is in explicit sharing list
    IF EXISTS (
        SELECT 1 FROM event_privacy ep
        JOIN relationships r ON ep.relationship_id = r.id
        WHERE ep.event_id = can_view_event_details.event_id
          AND r.user_id = viewer_id
          AND r.partner_id = event_owner_id
          AND ep.privacy_level = 'details'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- If event is private, no one else can see details
    IF event_override = 'private' THEN
        RETURN FALSE;
    END IF;
    
    -- Check connection tier
    connection_tier_val := get_connection_tier(viewer_id, event_owner_id);
    
    RETURN connection_tier_val = 'details';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can view event at all (including busy_only)
CREATE OR REPLACE FUNCTION can_view_event(
    viewer_id UUID,
    event_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    event_owner_id UUID;
    event_override event_privacy_override;
    connection_tier_val connection_tier;
BEGIN
    -- Get event owner and privacy override
    SELECT owner_id, privacy_override 
    INTO event_owner_id, event_override
    FROM events 
    WHERE id = event_id;
    
    -- Owner can always see their own events
    IF viewer_id = event_owner_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if viewer is explicit participant
    IF EXISTS (
        SELECT 1 FROM event_attendees 
        WHERE event_id = can_view_event.event_id 
          AND user_id = viewer_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if viewer is in explicit sharing list
    IF EXISTS (
        SELECT 1 FROM event_privacy ep
        JOIN relationships r ON ep.relationship_id = r.id
        WHERE ep.event_id = can_view_event.event_id
          AND r.user_id = viewer_id
          AND r.partner_id = event_owner_id
          AND ep.privacy_level IN ('details', 'busy_only')
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- If event is private, no one else can see it
    IF event_override = 'private' THEN
        RETURN FALSE;
    END IF;
    
    -- Check connection tier
    connection_tier_val := get_connection_tier(viewer_id, event_owner_id);
    
    RETURN connection_tier_val IN ('details', 'busy_only');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- STEP 7: Create Views for Easy Querying
-- ===================================================================

-- View for events with privacy information
CREATE OR REPLACE VIEW events_with_privacy AS
SELECT 
    e.*,
    e.privacy_override,
    CASE 
        WHEN e.privacy_override = 'private' THEN 'private'
        ELSE 'default'
    END as effective_privacy
FROM events e
WHERE e.deleted_at IS NULL;

-- ===================================================================
-- STEP 8: Add Constraints
-- ===================================================================

-- Ensure connection_tier is not null
ALTER TABLE relationships 
ALTER COLUMN connection_tier SET NOT NULL;

ALTER TABLE relationship_group_members 
ALTER COLUMN connection_tier SET NOT NULL;

-- ===================================================================
-- STEP 9: Create Migration Log
-- ===================================================================

-- Log the migration
INSERT INTO security_audit_log (action_type, success, created_at)
VALUES ('privacy_model_migration', TRUE, NOW());

-- ===================================================================
-- STEP 10: Verification Queries
-- ===================================================================

-- Verify migration results
SELECT 
    'relationships' as table_name,
    connection_tier,
    COUNT(*) as count
FROM relationships 
GROUP BY connection_tier
UNION ALL
SELECT 
    'group_members' as table_name,
    connection_tier,
    COUNT(*) as count
FROM relationship_group_members 
GROUP BY connection_tier
UNION ALL
SELECT 
    'event_privacy' as table_name,
    privacy_level::text as connection_tier,
    COUNT(*) as count
FROM event_privacy 
GROUP BY privacy_level;

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TYPE connection_tier IS 'Three-tier privacy system: private (see nothing), busy_only (see time blocks), details (see all)';
COMMENT ON TYPE event_privacy_override IS 'Event-level privacy override: default (use connection tier), private (hide from everyone except participants)';
COMMENT ON FUNCTION get_connection_tier IS 'Returns the connection tier between two users based on relationships and group memberships';
COMMENT ON FUNCTION can_view_event_details IS 'Checks if a user can view full event details based on privacy rules';
COMMENT ON FUNCTION can_view_event IS 'Checks if a user can view an event at all (including busy_only level)';
