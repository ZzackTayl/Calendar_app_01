-- PRODUCTION-SAFE RLS POLICIES
-- This SQL file contains only the core RLS policies needed to fix relationship access issues
-- It uses conditional logic to only apply policies to tables that exist

-- ===================================================================
-- HELPER FUNCTIONS
-- ===================================================================

-- Function to safely check if table exists
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = table_exists.table_name
    );
END;
$$;

-- Function to safely execute DDL only if table exists
CREATE OR REPLACE FUNCTION safe_ddl(table_name text, ddl_query text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    IF table_exists(table_name) THEN
        EXECUTE ddl_query;
        RETURN 'SUCCESS: Applied to ' || table_name;
    ELSE
        RETURN 'SKIPPED: Table ' || table_name || ' does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'ERROR on ' || table_name || ': ' || SQLERRM;
END;
$$;

-- ===================================================================
-- RELATIONSHIPS TABLE (HIGHEST PRIORITY)
-- ===================================================================

-- Only apply if relationships table exists
DO $$
BEGIN
    -- Enable RLS on relationships table
    IF table_exists('relationships') THEN
        ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing broad policy
        DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;
        
        -- Create granular policies
        CREATE POLICY "Users can view own relationships" ON relationships 
        FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can create own relationships" ON relationships 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own relationships" ON relationships 
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own relationships" ON relationships 
        FOR DELETE USING (auth.uid() = user_id);
        
        -- Partner access policy (handles both UUID and text partner_id)
        CREATE POLICY "Partners can view shared relationships" ON relationships 
        FOR SELECT USING (
            (auth.uid()::text = partner_id OR auth.uid() = partner_id::uuid) 
            AND partner_id IS NOT NULL
        );
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to relationships table';
    ELSE
        RAISE NOTICE 'SKIPPED: relationships table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying relationships policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- USERS TABLE
-- ===================================================================

DO $$
BEGIN
    IF table_exists('users') THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON users;
        DROP POLICY IF EXISTS "Users can update own profile" ON users;
        
        -- Create user policies
        CREATE POLICY "Users can view own profile" ON users 
        FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own profile" ON users 
        FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to users table';
    ELSE
        RAISE NOTICE 'SKIPPED: users table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying users policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- EVENTS TABLE
-- ===================================================================

DO $$
BEGIN
    IF table_exists('events') THEN
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can manage own events" ON events;
        
        -- Create events policy
        CREATE POLICY "Users can manage own events" ON events 
        FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to events table';
    ELSE
        RAISE NOTICE 'SKIPPED: events table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying events policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- CONTACTS TABLE
-- ===================================================================

DO $$
BEGIN
    IF table_exists('contacts') THEN
        ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can manage own contacts" ON contacts;
        
        -- Create contacts policy
        CREATE POLICY "Users can manage own contacts" ON contacts 
        FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to contacts table';
    ELSE
        RAISE NOTICE 'SKIPPED: contacts table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying contacts policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- INVITATIONS TABLE
-- ===================================================================

DO $$
BEGIN
    IF table_exists('invitations') THEN
        ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view sent invitations" ON invitations;
        DROP POLICY IF EXISTS "Users can view received invitations" ON invitations;
        
        -- Create invitation policies
        CREATE POLICY "Users can view sent invitations" ON invitations 
        FOR SELECT USING (auth.uid() = sender_id);
        
        CREATE POLICY "Users can view received invitations" ON invitations 
        FOR SELECT USING (
            auth.uid()::text = recipient_email OR 
            auth.uid() = recipient_id
        );
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to invitations table';
    ELSE
        RAISE NOTICE 'SKIPPED: invitations table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying invitations policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- RELATIONSHIP_GROUPS TABLE (if exists)
-- ===================================================================

DO $$
BEGIN
    IF table_exists('relationship_groups') THEN
        ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can manage own relationship groups" ON relationship_groups;
        
        -- Create relationship groups policy
        CREATE POLICY "Users can manage own relationship groups" ON relationship_groups 
        FOR ALL USING (auth.uid() = user_id);
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to relationship_groups table';
    ELSE
        RAISE NOTICE 'SKIPPED: relationship_groups table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying relationship_groups policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- RELATIONSHIP_GROUP_MEMBERS TABLE (if exists)
-- ===================================================================

DO $$
BEGIN
    IF table_exists('relationship_group_members') THEN
        ALTER TABLE relationship_group_members ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own group memberships" ON relationship_group_members;
        DROP POLICY IF EXISTS "Users can manage own group memberships" ON relationship_group_members;
        
        -- Create group membership policies
        CREATE POLICY "Users can manage own group memberships" ON relationship_group_members 
        FOR ALL USING (
            auth.uid() IN (
                SELECT user_id FROM relationship_groups WHERE id = group_id
            )
        );
        
        RAISE NOTICE 'SUCCESS: Applied RLS policies to relationship_group_members table';
    ELSE
        RAISE NOTICE 'SKIPPED: relationship_group_members table does not exist';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR applying relationship_group_members policies: %', SQLERRM;
END
$$;

-- ===================================================================
-- VERIFICATION QUERY
-- ===================================================================

-- Show all applied policies
SELECT 
    'VERIFICATION: Applied RLS Policies' as status,
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('relationships', 'users', 'events', 'contacts', 'invitations', 'relationship_groups', 'relationship_group_members')
ORDER BY tablename, policyname;

-- Clean up helper functions
DROP FUNCTION IF EXISTS table_exists(text);
DROP FUNCTION IF EXISTS safe_ddl(text, text);

-- Success message
DO $$
BEGIN
    RAISE NOTICE '================================';
    RAISE NOTICE 'PRODUCTION-SAFE RLS MIGRATION COMPLETED';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Applied RLS policies only to existing tables.';
    RAISE NOTICE 'The relationships table access issue should now be fixed.';
    RAISE NOTICE 'Check the verification query results above.';
END
$$;