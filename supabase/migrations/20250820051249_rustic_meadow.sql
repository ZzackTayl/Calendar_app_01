/*
  # Fix relationships table schema

  1. Schema Updates
    - Add missing columns to relationships table
    - Add partner_name column for non-registered partners
    - Add color column for calendar display
    - Add notes column for relationship details
    - Update privacy_level to match app expectations

  2. Data Migration
    - Preserve existing data
    - Set default values for new columns

  3. Indexes
    - Add performance indexes for new columns
*/

-- Add missing columns to relationships table
DO $$
BEGIN
  -- Add partner_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'partner_name'
  ) THEN
    ALTER TABLE relationships ADD COLUMN partner_name TEXT;
  END IF;

  -- Add partner_email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'partner_email'
  ) THEN
    ALTER TABLE relationships ADD COLUMN partner_email TEXT;
  END IF;

  -- Add color column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'color'
  ) THEN
    ALTER TABLE relationships ADD COLUMN color TEXT DEFAULT '#3B82F6';
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'notes'
  ) THEN
    ALTER TABLE relationships ADD COLUMN notes TEXT;
  END IF;

  -- Add start_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE relationships ADD COLUMN start_date DATE;
  END IF;

  -- Add privacy_level column if it doesn't exist (for backward compatibility)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'relationships' AND column_name = 'privacy_level'
  ) THEN
    ALTER TABLE relationships ADD COLUMN privacy_level TEXT DEFAULT 'limited_access';
  END IF;
END $$;

-- Update constraints to allow either partner_id OR partner_name
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS no_self_relationship;
ALTER TABLE relationships ADD CONSTRAINT no_self_relationship 
  CHECK (user_id != partner_id OR partner_id IS NULL);

-- Make partner_id nullable since we can have non-registered partners
ALTER TABLE relationships ALTER COLUMN partner_id DROP NOT NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_relationships_partner_name ON relationships(partner_name);
CREATE INDEX IF NOT EXISTS idx_relationships_partner_email ON relationships(partner_email);
CREATE INDEX IF NOT EXISTS idx_relationships_color ON relationships(color);

-- Update relationship_type to support custom types (remove enum constraint temporarily)
ALTER TABLE relationships ALTER COLUMN relationship_type TYPE TEXT;

-- Add comment for clarity
COMMENT ON COLUMN relationships.partner_name IS 'Name of partner (for non-registered users)';
COMMENT ON COLUMN relationships.partner_email IS 'Email of partner (for invitations)';
COMMENT ON COLUMN relationships.color IS 'Calendar color for this relationship';
COMMENT ON COLUMN relationships.notes IS 'Personal notes about this relationship';