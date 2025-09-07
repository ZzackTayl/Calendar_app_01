-- Comprehensive Database Schema Analysis
-- Run this in Supabase SQL Editor to understand current state

-- 1. List all existing tables
SELECT 
    'EXISTING_TABLES' as category,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Check RLS status on existing tables
SELECT 
    'RLS_STATUS' as category,
    schemaname || '.' || tablename as table_name,
    CASE 
        WHEN rowsecurity = true THEN 'RLS_ENABLED'
        ELSE 'RLS_DISABLED'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- 3. Count policies per table
SELECT 
    'POLICY_COUNT' as category,
    tablename as table_name,
    COUNT(*) || '_POLICIES' as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Check for critical functions
SELECT 
    'FUNCTIONS' as category,
    proname as table_name,
    'EXISTS' as status
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND proname IN ('can_view_user_calendar', 'can_view_event_details', 'verify_rls_policies')
ORDER BY proname;

-- 5. Check enum types
SELECT 
    'ENUMS' as category,
    typname as table_name,
    'EXISTS' as status
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY typname
ORDER BY typname;
