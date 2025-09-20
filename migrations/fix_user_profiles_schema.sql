-- ======================================================================
-- FIX USER_PROFILES SCHEMA MISMATCH MIGRATION
-- ======================================================================
-- Purpose: Fixes the user_profiles table to match the EnhancedUserProfile TypeScript type
-- Issue: The current user_profiles table schema doesn't match the expected TypeScript interface
-- This causes PGRST116 errors when querying for fields that don't exist

-- ======================================================================
-- STEP 1: BACKUP EXISTING DATA
-- ======================================================================
-- Create backup table to preserve existing user_profiles data
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Create backup table with current data
        DROP TABLE IF EXISTS user_profiles_backup;
        CREATE TABLE user_profiles_backup AS SELECT * FROM user_profiles;
        RAISE NOTICE 'Created backup of existing user_profiles data';
    END IF;
END $$;

-- ======================================================================
-- STEP 2: ENSURE REQUIRED ENUMS EXIST
-- ======================================================================
-- Calendar color scheme enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_color_scheme') THEN
        CREATE TYPE calendar_color_scheme AS ENUM (
            'default', 'vibrant', 'pastel', 'monochrome', 'dark', 'custom'
        );
    END IF;
END $$;

-- Onboarding source enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'onboarding_source') THEN
        CREATE TYPE onboarding_source AS ENUM (
            'direct', 'referral', 'social_media', 'search', 'blog', 'newsletter', 'other'
        );
    END IF;
END $$;

-- ======================================================================
-- STEP 3: DROP AND RECREATE user_profiles TABLE WITH CORRECT SCHEMA
-- ======================================================================
-- Drop existing table and recreate with proper schema
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
    -- Core identity fields
    id UUID PRIMARY KEY, -- Maps to Supabase auth.users.id

    -- Basic profile information
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',

    -- Notification preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,

    -- Extended profile fields (matching EnhancedUserProfile interface)
    preferred_pronouns TEXT,
    bio TEXT,
    relationship_preferences JSONB DEFAULT '{}'::jsonb,
    calendar_color_scheme calendar_color_scheme DEFAULT 'default',
    onboarding_source onboarding_source,
    marketing_consent BOOLEAN DEFAULT FALSE,
    newsletter_consent BOOLEAN DEFAULT FALSE,

    -- Additional fields from consolidated schema
    username TEXT UNIQUE,
    email_consent BOOLEAN DEFAULT FALSE,
    email_preferences JSONB DEFAULT '{"updates": false, "notifications": false, "tips": false}'::jsonb,
    beta_participant BOOLEAN DEFAULT FALSE,
    data_collection_consent BOOLEAN DEFAULT FALSE,
    selected_calendars TEXT[] DEFAULT '{}',
    onboarding_completed BOOLEAN DEFAULT FALSE,

    -- Subscription tier fields (from subscription migration)
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'pro')),
    max_file_size_mb INTEGER DEFAULT 3,
    max_events_per_month INTEGER DEFAULT 100,
    max_relationships INTEGER DEFAULT 10,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT username_min_length CHECK (char_length(username) >= 3 OR username IS NULL),
    CONSTRAINT bio_max_length CHECK (char_length(bio) <= 500 OR bio IS NULL),
    CONSTRAINT pronouns_max_length CHECK (char_length(preferred_pronouns) <= 50 OR preferred_pronouns IS NULL)
);

-- ======================================================================
-- STEP 4: RESTORE EXISTING DATA WITH SCHEMA MAPPING
-- ======================================================================
-- Restore data from backup, mapping old fields to new schema
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles_backup') THEN
        INSERT INTO user_profiles (
            id,
            full_name,
            avatar_url,
            time_zone,
            default_calendar_view,
            email_notifications,
            push_notifications,
            username,
            email_consent,
            email_preferences,
            beta_participant,
            data_collection_consent,
            selected_calendars,
            onboarding_completed,
            created_at,
            updated_at
        )
        SELECT
            id,
            full_name,
            avatar_url,
            COALESCE(time_zone, 'UTC'),
            COALESCE(default_calendar_view, 'month'),
            COALESCE(email_notifications, TRUE),
            COALESCE(push_notifications, TRUE),
            username,
            COALESCE(email_consent, FALSE),
            COALESCE(email_preferences, '{"updates": false, "notifications": false, "tips": false}'::jsonb),
            COALESCE(beta_participant, FALSE),
            COALESCE(data_collection_consent, FALSE),
            COALESCE(selected_calendars, '{}'),
            COALESCE(onboarding_completed, FALSE),
            COALESCE(created_at, NOW()),
            COALESCE(updated_at, NOW())
        FROM user_profiles_backup
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            avatar_url = EXCLUDED.avatar_url,
            time_zone = EXCLUDED.time_zone,
            default_calendar_view = EXCLUDED.default_calendar_view,
            email_notifications = EXCLUDED.email_notifications,
            push_notifications = EXCLUDED.push_notifications,
            updated_at = NOW();

        RAISE NOTICE 'Restored % rows from backup', (SELECT COUNT(*) FROM user_profiles_backup);
    END IF;
END $$;

-- ======================================================================
-- STEP 5: CREATE INDEXES FOR PERFORMANCE
-- ======================================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- ======================================================================
-- STEP 6: ADD FOREIGN KEY CONSTRAINTS
-- ======================================================================
-- Add foreign key constraint to users table
ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS fk_user_profiles_id;
ALTER TABLE user_profiles
    ADD CONSTRAINT fk_user_profiles_id
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE;

-- ======================================================================
-- STEP 7: ENABLE ROW LEVEL SECURITY AND CREATE POLICIES
-- ======================================================================
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON user_profiles;

-- Create comprehensive RLS policies
CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (auth.uid() = id);

-- ======================================================================
-- STEP 8: CREATE/UPDATE TRIGGERS
-- ======================================================================
-- Drop existing trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Create updated_at trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- STEP 9: UPDATE USER CREATION TRIGGER
-- ======================================================================
-- Update the handle_new_user function to work with new schema
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create user profile if it doesn't exist
  INSERT INTO user_profiles (
    id,
    full_name,
    time_zone,
    default_calendar_view,
    email_notifications,
    push_notifications,
    marketing_consent,
    newsletter_consent,
    subscription_tier,
    max_file_size_mb,
    max_events_per_month,
    max_relationships,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'UTC',
    'month',
    true,
    true,
    false,
    false,
    'free',
    3,
    100,
    10,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create entry in users table for easier querying
  INSERT INTO users (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ======================================================================
-- STEP 10: GRANT PERMISSIONS
-- ======================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ======================================================================
-- STEP 11: CLEANUP AND VERIFICATION
-- ======================================================================
-- Clean up backup table after successful migration
DROP TABLE IF EXISTS user_profiles_backup;

-- Verification function
CREATE OR REPLACE FUNCTION verify_user_profiles_schema()
RETURNS TABLE(
    field_name TEXT,
    exists_in_table BOOLEAN,
    data_type TEXT,
    is_nullable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.column_name::TEXT as field_name,
        true as exists_in_table,
        c.data_type::TEXT,
        c.is_nullable::BOOLEAN
    FROM information_schema.columns c
    WHERE c.table_name = 'user_profiles'
    AND c.table_schema = 'public'
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- ======================================================================
-- STEP 12: FINAL VERIFICATION AND LOGGING
-- ======================================================================
DO $$
DECLARE
    table_exists BOOLEAN;
    column_count INTEGER;
    policy_count INTEGER;
    trigger_count INTEGER;
BEGIN
    -- Check table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
    ) INTO table_exists;

    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND table_schema = 'public';

    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'user_profiles';

    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'user_profiles';

    RAISE NOTICE '=== USER_PROFILES SCHEMA FIX COMPLETED ===';
    RAISE NOTICE 'Table exists: %', table_exists;
    RAISE NOTICE 'Column count: %', column_count;
    RAISE NOTICE 'RLS policies: %', policy_count;
    RAISE NOTICE 'Triggers: %', trigger_count;

    -- Verify critical components
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Failed to create user_profiles table';
    END IF;

    IF column_count < 15 THEN
        RAISE WARNING 'user_profiles table may be missing columns (found: %)', column_count;
    END IF;

    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Run: SELECT * FROM verify_user_profiles_schema(); to see all fields';
END $$;

-- ======================================================================
-- POST-MIGRATION NOTES
-- ======================================================================
/*
VERIFICATION QUERIES TO RUN:

1. Check table structure:
SELECT * FROM verify_user_profiles_schema();

2. Test user profile creation:
SELECT handle_new_user() FROM auth.users LIMIT 1;

3. Verify RLS policies:
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies WHERE tablename = 'user_profiles';

4. Test basic query (should not return PGRST116 error):
SELECT time_zone FROM user_profiles WHERE id = '[your-user-id]';

5. Test enhanced fields:
SELECT preferred_pronouns, bio, marketing_consent, calendar_color_scheme
FROM user_profiles WHERE id = '[your-user-id]';
*/