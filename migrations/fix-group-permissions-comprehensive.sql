-- ======================================================================
-- COMPREHENSIVE GROUP PERMISSIONS FIX MIGRATION
-- ======================================================================
-- This migration fixes:
-- 1. Ensures group_member_permissions table exists with correct structure
-- 2. Updates helper functions to include group-based permission checks
-- 3. Corrects any inconsistencies in table/column names
-- 4. Adds missing indexes and constraints
-- ======================================================================

BEGIN;

-- ======================================================================
-- STEP 1: ENSURE group_member_permissions TABLE EXISTS
-- ======================================================================
-- Check if the table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_member_permissions'
    ) THEN
        CREATE TABLE group_member_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            
            -- Permission relationship
            group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            
            -- Permission level
            permission_level privacy_level NOT NULL DEFAULT 'limited_access',
            
            -- Detailed visibility flags
            can_see_details BOOLEAN DEFAULT true,
            can_see_location BOOLEAN DEFAULT true, 
            can_see_description BOOLEAN DEFAULT true,
            can_see_attendees BOOLEAN DEFAULT true,
            
            -- Notification preferences
            notify_on_events BOOLEAN DEFAULT true,
            notify_on_changes BOOLEAN DEFAULT false,
            
            -- Constraints
            CONSTRAINT group_permission_unique UNIQUE (group_id, user_id, target_user_id),
            CONSTRAINT no_self_permission CHECK (user_id != target_user_id)
        );
        
        -- Create indexes
        CREATE INDEX idx_group_member_permissions_group ON group_member_permissions(group_id);
        CREATE INDEX idx_group_member_permissions_user ON group_member_permissions(user_id);
        CREATE INDEX idx_group_member_permissions_target ON group_member_permissions(target_user_id);
        CREATE INDEX idx_group_member_permissions_composite ON group_member_permissions(group_id, user_id, target_user_id);
        
        RAISE NOTICE 'Created group_member_permissions table';
    ELSE
        RAISE NOTICE 'group_member_permissions table already exists';
    END IF;
END $$;

-- ======================================================================
-- STEP 2: ENABLE RLS ON group_member_permissions IF NOT ALREADY ENABLED
-- ======================================================================
ALTER TABLE group_member_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own group permissions" ON group_member_permissions;
DROP POLICY IF EXISTS "Users can manage their own group permissions" ON group_member_permissions;

-- Recreate policies
CREATE POLICY "Users can view their own group permissions" ON group_member_permissions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can manage their own group permissions" ON group_member_permissions
    FOR ALL USING (auth.uid() = user_id);

-- ======================================================================
-- STEP 3: UPDATE HELPER FUNCTIONS TO INCLUDE GROUP PERMISSIONS
-- ======================================================================

-- Drop and recreate the can_view_user_calendar function with group support
DROP FUNCTION IF EXISTS can_view_user_calendar(UUID, UUID);

CREATE OR REPLACE FUNCTION can_view_user_calendar(viewer_id UUID, calendar_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Owner can always view their own calendar
    IF viewer_id = calendar_owner_id THEN
        RETURN true;
    END IF;
    
    -- Check if there's an active relationship with appropriate connection tier
    IF EXISTS (
        SELECT 1 FROM relationships r
        WHERE ((r.user_id = viewer_id AND r.partner_id = calendar_owner_id)
           OR (r.partner_id = viewer_id AND r.user_id = calendar_owner_id))
        AND r.is_active = true
        AND r.connection_tier IN ('details', 'busy_only')
    ) THEN
        RETURN true;
    END IF;
    
    -- Check group-based permissions
    IF EXISTS (
        SELECT 1 
        FROM group_member_permissions gmp
        WHERE gmp.user_id = viewer_id
        AND gmp.target_user_id = calendar_owner_id
        AND gmp.can_see_details = true
        AND EXISTS (
            -- Verify both users are active members of the same group
            SELECT 1 FROM relationship_group_members gm1
            JOIN relationship_group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = viewer_id
            AND gm2.user_id = calendar_owner_id
            AND gm1.group_id = gmp.group_id
            AND gm1.left_at IS NULL
            AND gm2.left_at IS NULL
        )
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the can_view_event_details function with group support
DROP FUNCTION IF EXISTS can_view_event_details(UUID, UUID);

CREATE OR REPLACE FUNCTION can_view_event_details(event_id UUID, viewer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    event_owner UUID;
    event_privacy_override event_privacy_override;
    connection_tier_level connection_tier;
BEGIN
    -- Get event owner and privacy settings
    SELECT user_id, privacy_override 
    INTO event_owner, event_privacy_override
    FROM events WHERE id = event_id;
    
    -- Event owner can always see details
    IF viewer_id = event_owner THEN
        RETURN true;
    END IF;
    
    -- Check for explicit private event permissions
    IF event_privacy_override = 'private' THEN
        -- Check if viewer has explicit permission through event_permissions
        IF EXISTS (
            SELECT 1 FROM event_permissions ep
            WHERE ep.event_id = event_id
            AND (
                -- Direct relationship permission
                (ep.relationship_id IN (
                    SELECT id FROM relationships
                    WHERE ((user_id = viewer_id AND partner_id = event_owner)
                        OR (partner_id = viewer_id AND user_id = event_owner))
                    AND is_active = true
                ))
                OR
                -- Group permission
                (ep.group_id IN (
                    SELECT gm.group_id 
                    FROM relationship_group_members gm
                    WHERE gm.user_id = viewer_id 
                    AND gm.left_at IS NULL
                ))
            )
        ) THEN
            RETURN true;
        END IF;
        RETURN false;
    END IF;
    
    -- For non-private events, check relationship connection tier
    SELECT COALESCE(r.connection_tier, 'private') 
    INTO connection_tier_level
    FROM relationships r
    WHERE ((r.user_id = viewer_id AND r.partner_id = event_owner)
       OR (r.partner_id = viewer_id AND r.user_id = event_owner))
    AND r.is_active = true;
    
    -- Direct relationship with details tier
    IF connection_tier_level = 'details' THEN
        RETURN true;
    END IF;
    
    -- Check group-based permissions for event details
    IF EXISTS (
        SELECT 1 
        FROM group_member_permissions gmp
        WHERE gmp.user_id = viewer_id
        AND gmp.target_user_id = event_owner
        AND gmp.can_see_details = true
        AND EXISTS (
            -- Verify both users are active members of the same group
            SELECT 1 FROM relationship_group_members gm1
            JOIN relationship_group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = viewer_id
            AND gm2.user_id = event_owner
            AND gm1.group_id = gmp.group_id
            AND gm1.left_at IS NULL
            AND gm2.left_at IS NULL
        )
    ) THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- STEP 4: CREATE OR UPDATE GROUP PERMISSION HELPER FUNCTION
-- ======================================================================
DROP FUNCTION IF EXISTS check_group_permission(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION check_group_permission(
    p_user_id UUID,
    p_target_user_id UUID,
    p_permission_type TEXT DEFAULT 'view_calendar'
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if users share a group with appropriate permissions
    RETURN EXISTS (
        SELECT 1 
        FROM group_member_permissions gmp
        WHERE gmp.user_id = p_user_id
        AND gmp.target_user_id = p_target_user_id
        AND (
            (p_permission_type = 'view_calendar' AND gmp.can_see_details = true)
            OR (p_permission_type = 'view_location' AND gmp.can_see_location = true)
            OR (p_permission_type = 'view_description' AND gmp.can_see_description = true)
            OR (p_permission_type = 'view_attendees' AND gmp.can_see_attendees = true)
        )
        AND EXISTS (
            -- Verify both users are active members of the same group
            SELECT 1 FROM relationship_group_members gm1
            JOIN relationship_group_members gm2 ON gm1.group_id = gm2.group_id
            WHERE gm1.user_id = p_user_id
            AND gm2.user_id = p_target_user_id
            AND gm1.group_id = gmp.group_id
            AND gm1.left_at IS NULL
            AND gm2.left_at IS NULL
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- STEP 5: UPDATE TRIGGERS FOR group_member_permissions
-- ======================================================================
DROP TRIGGER IF EXISTS update_group_member_permissions_updated_at ON group_member_permissions;
CREATE TRIGGER update_group_member_permissions_updated_at 
    BEFORE UPDATE ON group_member_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- STEP 6: GRANT PERMISSIONS TO AUTHENTICATED USERS
-- ======================================================================
GRANT EXECUTE ON FUNCTION check_group_permission(UUID, UUID, TEXT) TO authenticated;

-- ======================================================================
-- STEP 7: UPDATE RLS POLICIES FOR EVENTS TABLE TO USE NEW FUNCTIONS
-- ======================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Partners can view events based on relationship" ON events;

-- Recreate with group support
CREATE POLICY "Partners can view events based on relationship or group" ON events
    FOR SELECT USING (
        auth.uid() = user_id OR
        (can_view_user_calendar(auth.uid(), user_id) AND 
         (privacy_override = 'default' OR privacy_override IS NULL))
    );

-- ======================================================================
-- STEP 8: ADD MISSING FOREIGN KEY CONSTRAINTS IF THEY DON'T EXIST
-- ======================================================================
DO $$
BEGIN
    -- Check and add foreign key for group_member_permissions to users (user_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'group_member_permissions' 
        AND constraint_name = 'group_member_permissions_user_id_fkey'
    ) THEN
        ALTER TABLE group_member_permissions 
        ADD CONSTRAINT group_member_permissions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for group_member_permissions to users (target_user_id)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'group_member_permissions' 
        AND constraint_name = 'group_member_permissions_target_user_id_fkey'
    ) THEN
        ALTER TABLE group_member_permissions 
        ADD CONSTRAINT group_member_permissions_target_user_id_fkey 
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    -- Check and add foreign key for group_member_permissions to relationship_groups
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'group_member_permissions' 
        AND constraint_name = 'group_member_permissions_group_id_fkey'
    ) THEN
        ALTER TABLE group_member_permissions 
        ADD CONSTRAINT group_member_permissions_group_id_fkey 
        FOREIGN KEY (group_id) REFERENCES relationship_groups(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ======================================================================
-- STEP 9: VERIFY AND LOG MIGRATION RESULTS
-- ======================================================================
DO $$
DECLARE
    table_exists BOOLEAN;
    func_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_member_permissions'
    ) INTO table_exists;
    
    -- Check functions exist
    SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'check_group_permission'
    ) INTO func_exists;
    
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'group_member_permissions';
    
    RAISE NOTICE 'Migration Summary:';
    RAISE NOTICE '  - group_member_permissions table exists: %', table_exists;
    RAISE NOTICE '  - check_group_permission function exists: %', func_exists;
    RAISE NOTICE '  - RLS policies on group_member_permissions: %', policy_count;
    
    -- Verify critical components
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Failed to create group_member_permissions table';
    END IF;
    
    IF NOT func_exists THEN
        RAISE EXCEPTION 'Failed to create check_group_permission function';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- ======================================================================
-- POST-MIGRATION VERIFICATION QUERIES (Run these manually)
-- ======================================================================
/*
-- 1. Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'group_member_permissions'
ORDER BY ordinal_position;

-- 2. Verify indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'group_member_permissions';

-- 3. Verify foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'group_member_permissions'
AND tc.constraint_type = 'FOREIGN KEY';

-- 4. Test the updated functions
-- This should return true for the same user
SELECT can_view_user_calendar('YOUR_USER_ID'::UUID, 'YOUR_USER_ID'::UUID);

-- This should check both relationships and group permissions
SELECT can_view_user_calendar('USER1_ID'::UUID, 'USER2_ID'::UUID);
*/
