-- Fix for the missing set_reminders_updated_at() function error
-- This script corrects the trigger to use the existing set_updated_at() function

-- First, ensure the set_updated_at function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the incorrect trigger if it exists
DROP TRIGGER IF EXISTS trg_reminders_updated ON reminders;

-- Create the correct trigger using set_updated_at()
DO $$ BEGIN
    CREATE TRIGGER trg_reminders_updated
    BEFORE UPDATE ON reminders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;