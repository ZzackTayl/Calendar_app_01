-- Migration: Add user_master_keys table for secure key derivation
-- This table stores key derivation metadata (but not the actual master keys)

CREATE TABLE IF NOT EXISTS user_master_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_derivation_metadata JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure one master key metadata per user
  UNIQUE(user_id)
);

-- Add index for fast user lookups
CREATE INDEX idx_user_master_keys_user_id ON user_master_keys(user_id);

-- Row Level Security
ALTER TABLE user_master_keys ENABLE ROW LEVEL SECURITY;

-- Users can only access their own master key metadata
CREATE POLICY "Users can manage their own master key metadata" ON user_master_keys
  FOR ALL USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE user_master_keys IS 'Stores key derivation metadata for user master keys (not the keys themselves)';
COMMENT ON COLUMN user_master_keys.key_derivation_metadata IS 'JSON metadata including algorithm, salt, parameters, and derivedAt timestamp';
COMMENT ON COLUMN user_master_keys.user_id IS 'User who owns this master key metadata';

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_master_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_master_keys_updated_at
  BEFORE UPDATE ON user_master_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_user_master_keys_updated_at();
