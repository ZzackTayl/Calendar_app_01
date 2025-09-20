-- Fix User Profiles Table Structure and Create Missing Profile
-- This script addresses the PGRST116 errors by ensuring proper table structure
-- and creating a profile for the user experiencing the issue

-- First, ensure the user_profiles table has all required columns
DO $$
BEGIN
  -- Add columns if they don't exist
  BEGIN
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC';
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT true;
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  EXCEPTION
    WHEN duplicate_column THEN
      RAISE NOTICE 'Columns already exist, skipping...';
  END;
END
$$;

-- Create or update the user profile for the specific user experiencing issues
INSERT INTO user_profiles (
  id,
  time_zone,
  email_notifications,
  push_notifications,
  created_at,
  updated_at
) VALUES (
  '8d46e542-e016-4b0a-92e7-d8c4aaa1c13a',
  'UTC',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  time_zone = COALESCE(user_profiles.time_zone, 'UTC'),
  email_notifications = COALESCE(user_profiles.email_notifications, true),
  push_notifications = COALESCE(user_profiles.push_notifications, true),
  updated_at = NOW();

-- Ensure RLS policies allow users to read their own profiles
CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user profile creation if it doesn't exist
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (
    id,
    full_name,
    time_zone,
    email_notifications,
    push_notifications,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'UTC',
    true,
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the fix by showing the user profile
SELECT
  id,
  time_zone,
  email_notifications,
  push_notifications,
  created_at,
  updated_at
FROM user_profiles
WHERE id = '8d46e542-e016-4b0a-92e7-d8c4aaa1c13a';

-- Show confirmation message
SELECT 'User profile fix completed successfully!' as status;