-- ======================================================================
-- SIMPLIFIED RLS PERFORMANCE FIX - Step by Step
-- Use this if the comprehensive version fails due to missing tables
-- ======================================================================

-- Step 1: First, let's check what tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Step 2: Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 3: Create missing tables if needed (basic structure)
-- Only run these if tables don't exist

-- Users table (if missing)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    phone_number TEXT UNIQUE,
    full_name TEXT,
    display_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_privacy_level TEXT DEFAULT 'private',
    is_active BOOLEAN DEFAULT true,
    subscription_tier TEXT DEFAULT 'free',
    profile_data JSONB DEFAULT '{}',
    public_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles table (if missing)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    username TEXT UNIQUE,
    email_consent BOOLEAN DEFAULT FALSE,
    email_preferences JSONB DEFAULT '{"updates": false, "notifications": false, "tips": false}'::jsonb,
    beta_participant BOOLEAN DEFAULT FALSE,
    data_collection_consent BOOLEAN DEFAULT FALSE,
    selected_calendars TEXT[] DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table (if missing)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    time_zone TEXT DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT false,
    privacy_level TEXT DEFAULT 'private',
    relationship_id UUID,
    color TEXT DEFAULT '#3B82F6',
    status TEXT DEFAULT 'confirmed',
    recurrence_rule TEXT,
    event_data JSONB DEFAULT '{}',
    google_calendar_id TEXT,
    google_event_id TEXT,
    caldav_uid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table (if missing)
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone_number TEXT,
    company TEXT,
    job_title TEXT,
    avatar_url TEXT,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    contact_data JSONB DEFAULT '{}',
    name TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================================================
-- Step 4: Now apply the RLS optimizations
-- ======================================================================

-- Drop existing policies (only if they exist)
DROP POLICY IF EXISTS "Users can view own record" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own events" ON events;
DROP POLICY IF EXISTS "Users can create own events" ON events;
DROP POLICY IF EXISTS "Users can update own events" ON events;
DROP POLICY IF EXISTS "Users can delete own events" ON events;
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can create own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

-- Create optimized policies
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can delete own profile" ON user_profiles
    FOR DELETE USING ((select auth.uid()) = id);

CREATE POLICY "Users can view own events" ON events
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own events" ON events
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own events" ON events
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own events" ON events
    FOR DELETE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view own contacts" ON contacts
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create own contacts" ON contacts
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own contacts" ON contacts
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own contacts" ON contacts
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ======================================================================
-- Step 5: Test the optimization
-- ======================================================================

-- Create a simple test function
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

-- Run the test
SELECT * FROM test_rls_performance_simple();

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Simplified RLS Performance Fix Applied Successfully!';
    RAISE NOTICE 'Core policies have been optimized for better performance.';
    RAISE NOTICE 'Use: SELECT * FROM test_rls_performance_simple(); to verify.';
END $$;
