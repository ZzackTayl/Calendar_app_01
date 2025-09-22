-- ======================================================================
-- FIXED DIAGNOSTIC CHECK: What actually exists in the database
-- ======================================================================

-- Step 1: Check what tables exist
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Step 2: Check what policies exist (FIXED column name)
SELECT
    schemaname,
    tablename,
    policyname as polname,
    polcmd,
    polroles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 3: Check what extensions are enabled
SELECT
    name,
    default_version,
    installed_version
FROM pg_available_extensions
WHERE installed_version IS NOT NULL;

-- Step 4: Test auth function
SELECT auth.uid() as current_user_id;

-- Step 5: Check if tables have RLS enabled
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'user_profiles', 'events', 'contacts')
ORDER BY tablename;
