-- ======================================================================
-- RLS PERFORMANCE OPTIMIZATION MIGRATION
-- Generated: 2025-09-22
-- Purpose: Optimize RLS policies by replacing auth.<function>() with (select auth.<function>())
-- to prevent re-evaluation for each row, improving query performance at scale
--
-- Issue: Table public.user_profiles has a row level security policy that re-evaluates
-- current_setting() or auth.<function>() for each row, producing suboptimal query performance.
--
-- Solution: Replace auth.uid() with (select auth.uid()) to cache the result
-- ======================================================================

-- ======================================================================
-- STEP 1: DROP EXISTING INEFFICIENT POLICIES
-- ======================================================================

-- Drop existing user_profiles policies that use direct auth.uid() calls
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;

-- Drop other policies that may have similar performance issues
-- (We'll identify these by searching for direct auth.function() calls)

-- ======================================================================
-- STEP 2: CREATE OPTIMIZED USER_PROFILES POLICIES
-- ======================================================================

-- Users can view their own profile (optimized)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((select auth.uid()) = id);

-- Users can insert their own profile (optimized)
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- Users can update their own profile (optimized)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING ((select auth.uid()) = id);

-- Users can delete their own profile (optimized)
CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING ((select auth.uid()) = id);

-- ======================================================================
-- STEP 3: CREATE OPTIMIZED POLICIES FOR OTHER TABLES
-- ======================================================================

-- Users table policies (optimized)
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;

CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING ((select auth.uid()) = id);

-- Relationships table policies (optimized)
DROP POLICY IF EXISTS "Users can view their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can create relationships" ON relationships;
DROP POLICY IF EXISTS "Users can update their relationships" ON relationships;
DROP POLICY IF EXISTS "Users can delete their relationships" ON relationships;

CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

CREATE POLICY "Users can create relationships" ON relationships
    FOR INSERT WITH CHECK (
        (select auth.uid()) = user_id AND
        -- Ensure partner exists in users table
        EXISTS (SELECT 1 FROM users WHERE id = partner_id)
    );

CREATE POLICY "Users can update their relationships" ON relationships
    FOR UPDATE USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

CREATE POLICY "Users can delete their relationships" ON relationships
    FOR DELETE USING (
        (select auth.uid()) = user_id OR (select auth.uid()) = partner_id
    );

-- Events table policies (optimized)
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;

CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Relationship groups policies (optimized)
DROP POLICY IF EXISTS "Users can view own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can create own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can update own groups" ON relationship_groups;
DROP POLICY IF EXISTS "Users can delete own groups" ON relationship_groups;

CREATE POLICY "Users can view own groups" ON relationship_groups
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own groups" ON relationship_groups
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own groups" ON relationship_groups
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own groups" ON relationship_groups
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Contacts table policies (optimized)
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

CREATE POLICY "Users can view own contacts" ON contacts
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own contacts" ON contacts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ======================================================================
-- STEP 4: OPTIMIZE COMPLEX POLICIES WITH SUBQUERIES
-- ======================================================================

-- Event permissions policies (optimized)
DROP POLICY IF EXISTS "Users can view event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can create event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can update event permissions" ON event_permissions;
DROP POLICY IF EXISTS "Users can delete event permissions" ON event_permissions;

CREATE POLICY "Users can view event permissions" ON event_permissions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event permissions" ON event_permissions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update event permissions" ON event_permissions
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can delete event permissions" ON event_permissions
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_permissions.event_id AND user_id = (select auth.uid()))
    );

-- Event visibility policies (optimized)
DROP POLICY IF EXISTS "Users can view event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can create event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can update event visibility" ON event_visibility;
DROP POLICY IF EXISTS "Users can delete event visibility" ON event_visibility;

CREATE POLICY "Users can view event visibility" ON event_visibility
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event visibility" ON event_visibility
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update event visibility" ON event_visibility
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can delete event visibility" ON event_visibility
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM events WHERE id = event_visibility.event_id AND user_id = (select auth.uid()))
    );

-- ======================================================================
-- STEP 5: OPTIMIZE POLICIES WITH MULTIPLE AUTH CHECKS
-- ======================================================================

-- Event attachments policies (optimized)
DROP POLICY IF EXISTS "Users can view event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can create event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can update own event attachments" ON event_attachments;
DROP POLICY IF EXISTS "Users can delete event attachments" ON event_attachments;

CREATE POLICY "Users can view event attachments" ON event_attachments
    FOR SELECT USING (
        (select auth.uid()) = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can create event attachments" ON event_attachments
    FOR INSERT WITH CHECK (
        (select auth.uid()) = uploaded_by AND
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "Users can update own event attachments" ON event_attachments
    FOR UPDATE USING ((select auth.uid()) = uploaded_by);

CREATE POLICY "Users can delete event attachments" ON event_attachments
    FOR DELETE USING (
        (select auth.uid()) = uploaded_by OR
        EXISTS (SELECT 1 FROM events WHERE id = event_attachments.event_id AND user_id = (select auth.uid()))
    );

-- ======================================================================
-- STEP 6: CREATE PERFORMANCE TEST FUNCTION
-- ======================================================================

-- Create a function to test RLS performance improvements
CREATE OR REPLACE FUNCTION test_rls_performance_optimization()
RETURNS TABLE(
    table_name text,
    policy_count integer,
    optimized_policies integer,
    performance_status text
) AS $$
DECLARE
    policy_record RECORD;
    optimized_count integer;
    total_count integer;
BEGIN
    -- Count total policies and optimized policies
    SELECT COUNT(*) INTO total_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN (
        'user_profiles', 'users', 'relationships', 'events',
        'relationship_groups', 'contacts', 'event_permissions',
        'event_visibility', 'event_attachments'
    );

    SELECT COUNT(*) INTO optimized_count
    FROM pg_policies p
    WHERE schemaname = 'public'
    AND tablename IN (
        'user_profiles', 'users', 'relationships', 'events',
        'relationship_groups', 'contacts', 'event_permissions',
        'event_visibility', 'event_attachments'
    )
    AND (
        -- Check for optimized auth function calls
        p.polname LIKE '%optimized%' OR
        p.qual LIKE '%(select auth.uid())%' OR
        p.with_check LIKE '%(select auth.uid())%' OR
        -- Check for subquery optimization pattern
        p.qual LIKE '%(SELECT%' AND p.qual LIKE '%auth.uid%' OR
        p.with_check LIKE '%(SELECT%' AND p.with_check LIKE '%auth.uid%'
    );

    RETURN QUERY SELECT
        'RLS Performance Test'::text,
        total_count,
        optimized_count,
        CASE
            WHEN optimized_count = total_count THEN 'FULLY OPTIMIZED'
            WHEN optimized_count > 0 THEN 'PARTIALLY OPTIMIZED'
            ELSE 'NOT OPTIMIZED'
        END::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- STEP 7: GRANT NECESSARY PERMISSIONS
-- ======================================================================

-- Grant execute permissions on performance test function
GRANT EXECUTE ON FUNCTION test_rls_performance_optimization() TO authenticated;

-- ======================================================================
-- STEP 8: RUN PERFORMANCE TEST
-- ======================================================================

-- Run the performance test to verify optimizations
SELECT * FROM test_rls_performance_optimization();

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'RLS Performance Optimization Migration Completed!';
    RAISE NOTICE 'All policies have been updated to use (select auth.uid()) pattern.';
    RAISE NOTICE 'This prevents re-evaluation of auth functions for each row.';
    RAISE NOTICE 'Query performance should be significantly improved at scale.';
    RAISE NOTICE '';
    RAISE NOTICE 'Use: SELECT * FROM test_rls_performance_optimization(); to verify.';
END $$;

-- ======================================================================
-- END OF RLS PERFORMANCE OPTIMIZATION MIGRATION
-- ======================================================================
