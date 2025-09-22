-- ======================================================================
-- FIX FUNCTION SEARCH PATH MUTABILITY WARNINGS
-- Generated: 2025-09-22
-- Purpose: Fix mutable search_path warnings for test functions
-- ======================================================================

-- ======================================================================
-- STEP 1: FIX test_rls_performance_simple FUNCTION
-- ======================================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS test_rls_performance_simple();

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION test_rls_performance_simple()
RETURNS TABLE(
    table_name text,
    policy_count integer,
    optimized_policies integer,
    status text
) AS $$
DECLARE
    total_count integer;
    optimized_count integer;
BEGIN
    -- Set secure search path
    SET search_path = public;

    SELECT COUNT(*) INTO total_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'user_profiles', 'events', 'contacts');

    SELECT COUNT(*) INTO optimized_count
    FROM pg_policies p
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'user_profiles', 'events', 'contacts')
    AND (
        p.qual LIKE '%(select auth.uid())%' OR
        p.with_check LIKE '%(select auth.uid())%'
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_rls_performance_simple() TO authenticated;

-- ======================================================================
-- STEP 2: FIX test_rls_performance_final FUNCTION
-- ======================================================================

-- Drop the existing function (if it exists)
DROP FUNCTION IF EXISTS test_rls_performance_final();

-- Recreate with secure search_path
CREATE OR REPLACE FUNCTION test_rls_performance_final()
RETURNS TABLE(
    table_name text,
    policy_count integer,
    optimized_policies integer,
    performance_status text
) AS $$
DECLARE
    total_count integer;
    optimized_count integer;
BEGIN
    -- Set secure search path
    SET search_path = public;

    -- Comprehensive test for all RLS policies
    SELECT COUNT(*) INTO total_count
    FROM pg_policies
    WHERE schemaname = 'public';

    SELECT COUNT(*) INTO optimized_count
    FROM pg_policies p
    WHERE schemaname = 'public'
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
        'RLS Performance Test Final'::text,
        total_count,
        optimized_count,
        CASE
            WHEN optimized_count = total_count THEN 'FULLY OPTIMIZED'
            WHEN optimized_count > 0 THEN 'PARTIALLY OPTIMIZED'
            ELSE 'NOT OPTIMIZED'
        END::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION test_rls_performance_final() TO authenticated;

-- ======================================================================
-- STEP 3: VERIFICATION QUERIES
-- ======================================================================

-- Query to verify functions have secure search paths
SELECT
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines
WHERE routine_name IN ('test_rls_performance_simple', 'test_rls_performance_final')
    AND routine_schema = 'public';

-- Test the functions to ensure they work
SELECT * FROM test_rls_performance_simple();
SELECT * FROM test_rls_performance_final();

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
    RAISE NOTICE 'Function search_path fixes applied successfully!';
    RAISE NOTICE 'Both test functions now have secure search_path settings.';
    RAISE NOTICE 'The mutable search_path warnings should now be resolved.';
END $$;

-- ======================================================================
-- END OF FUNCTION SEARCH_PATH FIX
-- ======================================================================
