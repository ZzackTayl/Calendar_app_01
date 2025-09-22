-- Fix for missing calendar_color_scheme column in user_profiles table
-- This resolves the PGRST204 error

-- Add the missing column
ALTER TABLE user_profiles ADD COLUMN calendar_color_scheme TEXT DEFAULT 'default';

-- Add constraint to ensure valid values
ALTER TABLE user_profiles ADD CONSTRAINT chk_calendar_color_scheme
    CHECK (calendar_color_scheme IN ('default', 'colorblind_friendly', 'high_contrast'));