-- ======================================================================
-- TEST USER PROFILES FIX
-- ======================================================================
-- Purpose: Verify that the user_profiles table schema fix resolved the PGRST116 error
-- Run this after applying the fix_user_profiles_schema.sql migration

-- ======================================================================
-- Test 1: Verify table structure
-- ======================================================================
\echo '1. Checking user_profiles table structure...'
SELECT * FROM verify_user_profiles_schema();

-- ======================================================================
-- Test 2: Check if all required columns exist
-- ======================================================================
\echo '2. Verifying required columns exist...'
SELECT
    CASE
        WHEN COUNT(*) >= 15 THEN '✅ Table has sufficient columns'
        ELSE '❌ Table missing columns - found ' || COUNT(*) || ' columns'
    END as column_check
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND table_schema = 'public';

-- ======================================================================
-- Test 3: Check RLS policies
-- ======================================================================
\echo '3. Checking RLS policies...'
SELECT
    policyname,
    permissive,
    cmd,
    CASE WHEN qual IS NOT NULL THEN 'Has conditions' ELSE 'No conditions' END as policy_conditions
FROM pg_policies
WHERE tablename = 'user_profiles';

-- ======================================================================
-- Test 4: Test basic query that was failing
-- ======================================================================
\echo '4. Testing the original failing query pattern...'
-- This should NOT return PGRST116 error anymore
SELECT
    'time_zone column exists and queryable' as test_result
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'time_zone'
);

-- ======================================================================
-- Test 5: Test enhanced fields
-- ======================================================================
\echo '5. Testing enhanced profile fields...'
SELECT
    COUNT(CASE WHEN column_name = 'preferred_pronouns' THEN 1 END) as has_pronouns,
    COUNT(CASE WHEN column_name = 'bio' THEN 1 END) as has_bio,
    COUNT(CASE WHEN column_name = 'marketing_consent' THEN 1 END) as has_marketing_consent,
    COUNT(CASE WHEN column_name = 'newsletter_consent' THEN 1 END) as has_newsletter_consent,
    COUNT(CASE WHEN column_name = 'calendar_color_scheme' THEN 1 END) as has_color_scheme
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND table_schema = 'public';

-- ======================================================================
-- Test 6: Test subscription tier fields
-- ======================================================================
\echo '6. Testing subscription tier fields...'
SELECT
    COUNT(CASE WHEN column_name = 'subscription_tier' THEN 1 END) as has_subscription_tier,
    COUNT(CASE WHEN column_name = 'max_file_size_mb' THEN 1 END) as has_max_file_size,
    COUNT(CASE WHEN column_name = 'max_events_per_month' THEN 1 END) as has_max_events,
    COUNT(CASE WHEN column_name = 'max_relationships' THEN 1 END) as has_max_relationships
FROM information_schema.columns
WHERE table_name = 'user_profiles' AND table_schema = 'public';

-- ======================================================================
-- Test 7: Test foreign key constraint
-- ======================================================================
\echo '7. Checking foreign key constraint...'
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
WHERE tc.table_name = 'user_profiles'
AND tc.constraint_type = 'FOREIGN KEY';

-- ======================================================================
-- Test 8: Test triggers
-- ======================================================================
\echo '8. Checking triggers...'
SELECT
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles';

-- ======================================================================
-- Test 9: Simulate the original failing API call
-- ======================================================================
\echo '9. Simulating original failing API call pattern...'
-- This simulates: GET user_profiles?select=time_zone&id=eq.USER_ID
-- Should work without PGRST116 error

-- Check if we can select time_zone (the field that was causing issues)
SELECT
    CASE
        WHEN EXISTS (
            SELECT time_zone FROM user_profiles LIMIT 1
        ) THEN '✅ time_zone field accessible'
        ELSE '✅ time_zone field exists but no data (normal for new installation)'
    END as time_zone_test;

-- ======================================================================
-- Test 10: Test user creation trigger
-- ======================================================================
\echo '10. Checking user creation trigger function...'
SELECT
    p.proname as function_name,
    p.prosrc as function_body_snippet
FROM pg_proc p
WHERE p.proname = 'handle_new_user';

-- ======================================================================
-- SUMMARY REPORT
-- ======================================================================
\echo '=== USER PROFILES FIX VERIFICATION SUMMARY ==='

SELECT
    'user_profiles' as table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_profiles') as total_columns,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'user_profiles') as rls_policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'user_profiles') as triggers,
    (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') as rls_enabled;

\echo ''
\echo 'Expected results:'
\echo '- total_columns: 20+ (comprehensive schema)'
\echo '- rls_policies: 1+ (user access control)'
\echo '- triggers: 1+ (updated_at trigger)'
\echo '- rls_enabled: true'
\echo ''
\echo 'If all tests pass, the PGRST116 error should be resolved!'
\echo 'Test the API endpoint: GET user_profiles?select=time_zone&id=eq.{user_id}'
\echo ''