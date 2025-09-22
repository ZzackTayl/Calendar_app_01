-- Add the missing calendar_color_scheme column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN calendar_color_scheme TEXT DEFAULT 'default';

-- Add constraint for the column
ALTER TABLE user_profiles ADD CONSTRAINT chk_calendar_color_scheme
    CHECK (calendar_color_scheme IN ('default', 'colorblind_friendly', 'high_contrast'));