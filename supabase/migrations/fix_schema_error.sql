-- Fix for ERROR: 42883: function set_reminders_updated_at() does not exist
-- This fixes the specific trigger that's causing the migration to fail

-- First, ensure the generic set_updated_at function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the incorrect trigger if it exists
DROP TRIGGER IF EXISTS trg_reminders_updated ON reminders;

-- Create the correct trigger using the existing set_updated_at function
CREATE TRIGGER trg_reminders_updated
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();