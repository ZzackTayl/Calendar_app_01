-- Add onboarding-related fields to user_profiles table
-- This extends the user_profiles table with fields needed for the enhanced onboarding flow

-- Add username field to user_profiles
ALTER TABLE IF EXISTS user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_preferences JSONB DEFAULT '{"updates": false, "notifications": false, "tips": false}'::jsonb,
ADD COLUMN IF NOT EXISTS beta_participant BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_collection_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS selected_calendars TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for username for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;

-- Add constraints
ALTER TABLE IF EXISTS user_profiles 
ADD CONSTRAINT IF NOT EXISTS username_min_length CHECK (char_length(username) >= 3);

-- Add missing columns to relationships table for onboarding
ALTER TABLE IF EXISTS relationships
ADD COLUMN IF NOT EXISTS partner_name TEXT,
ADD COLUMN IF NOT EXISTS partner_email TEXT,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Create index for partner email
CREATE INDEX IF NOT EXISTS idx_relationships_partner_email ON relationships(partner_email) WHERE partner_email IS NOT NULL;

-- Comment the tables
COMMENT ON COLUMN user_profiles.username IS 'Unique username chosen during onboarding';
COMMENT ON COLUMN user_profiles.email_consent IS 'User consent to receive emails';
COMMENT ON COLUMN user_profiles.email_preferences IS 'JSON object with email preference settings';
COMMENT ON COLUMN user_profiles.beta_participant IS 'Whether user agreed to participate in beta testing';
COMMENT ON COLUMN user_profiles.data_collection_consent IS 'Whether user consents to anonymous data collection';
COMMENT ON COLUMN user_profiles.selected_calendars IS 'Array of calendar providers selected for integration';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';

COMMENT ON COLUMN relationships.partner_name IS 'Name of the partner in this relationship';
COMMENT ON COLUMN relationships.partner_email IS 'Email of the partner for invitations';
COMMENT ON COLUMN relationships.color IS 'Color associated with this relationship for calendar display';