-- Add subscription tier support to user_profiles
-- This migration adds support for free/premium user tiers

-- Add subscription_tier column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' 
CHECK (subscription_tier IN ('free', 'premium', 'pro'));

-- Add subscription-related columns for future use
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS max_events_per_month INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS max_relationships INTEGER DEFAULT 10;

-- Update max_file_size_mb based on tier
UPDATE user_profiles 
SET max_file_size_mb = CASE 
    WHEN subscription_tier IN ('premium', 'pro') THEN 10 
    ELSE 3 
END;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_tier ON user_profiles(subscription_tier);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.subscription_tier IS 'User subscription level: free (3MB uploads), premium/pro (10MB uploads)';
COMMENT ON COLUMN user_profiles.max_file_size_mb IS 'Maximum file upload size in MB based on subscription tier';
COMMENT ON COLUMN user_profiles.max_events_per_month IS 'Monthly event limit based on subscription tier';
COMMENT ON COLUMN user_profiles.max_relationships IS 'Maximum number of relationships based on subscription tier';
