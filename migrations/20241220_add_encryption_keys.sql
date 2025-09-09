-- Create enum for key types
CREATE TYPE key_type AS ENUM ('relationship', 'group', 'event', 'master');

-- Create enum for access reasons (audit trail)
CREATE TYPE access_reason AS ENUM ('relationship', 'group', 'invitation', 'event_override', 'owner');

-- Create table for storing encrypted keys
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_type key_type NOT NULL,
  key_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL, -- The actual key, encrypted with owner's master key
  metadata JSONB NOT NULL DEFAULT '{}', -- Additional metadata about the key
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for tracking who has access to which keys
CREATE TABLE key_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id UUID NOT NULL REFERENCES encryption_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_by UUID NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  access_reason access_reason NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES users(id),
  
  -- Ensure unique access per user per key (unless revoked)
  CONSTRAINT unique_key_access UNIQUE (key_id, user_id, revoked)
);

-- Create indexes for performance
CREATE INDEX idx_encryption_keys_type ON encryption_keys(key_type);
CREATE INDEX idx_encryption_keys_owner ON encryption_keys(key_owner_id);
CREATE INDEX idx_encryption_keys_metadata_entity ON encryption_keys USING gin((metadata->'entityId'));
CREATE INDEX idx_key_access_user ON key_access(user_id);
CREATE INDEX idx_key_access_key ON key_access(key_id);
CREATE INDEX idx_key_access_expires ON key_access(expires_at) WHERE expires_at IS NOT NULL;

-- Add encrypted field columns to existing tables
-- These will store field-level encrypted data

-- Events table - add encrypted versions of sensitive fields
ALTER TABLE events ADD COLUMN IF NOT EXISTS description_encrypted TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS location_encrypted TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS notes_encrypted TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES encryption_keys(id);

-- Users table - add encrypted versions of sensitive fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_details_encrypted JSONB;

-- Groups table - add encryption key reference
ALTER TABLE groups ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES encryption_keys(id);

-- Relationships table - add encryption key reference
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES encryption_keys(id);

-- Row Level Security Policies

-- encryption_keys table policies
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- Users can only see keys they have access to
CREATE POLICY "Users can view keys they have access to" ON encryption_keys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM key_access
      WHERE key_access.key_id = encryption_keys.id
      AND key_access.user_id = auth.uid()
      AND (key_access.expires_at IS NULL OR key_access.expires_at > NOW())
      AND NOT key_access.revoked
    )
  );

-- Only key owners can update their keys
CREATE POLICY "Key owners can update their keys" ON encryption_keys
  FOR UPDATE
  USING (key_owner_id = auth.uid());

-- key_access table policies
ALTER TABLE key_access ENABLE ROW LEVEL SECURITY;

-- Users can see their own access records
CREATE POLICY "Users can view their key access" ON key_access
  FOR SELECT
  USING (user_id = auth.uid() OR granted_by = auth.uid());

-- Only grantors can insert access records
CREATE POLICY "Grantors can grant key access" ON key_access
  FOR INSERT
  WITH CHECK (granted_by = auth.uid());

-- Only grantors can revoke access they granted
CREATE POLICY "Grantors can revoke access" ON key_access
  FOR UPDATE
  USING (granted_by = auth.uid())
  WITH CHECK (granted_by = auth.uid());

-- Function to automatically cleanup expired key access
CREATE OR REPLACE FUNCTION cleanup_expired_key_access()
RETURNS void AS $$
BEGIN
  UPDATE key_access
  SET revoked = TRUE,
      revoked_at = NOW(),
      revoked_by = user_id
  WHERE expires_at < NOW()
    AND NOT revoked;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to cleanup expired access (requires pg_cron extension)
-- This would be set up separately in production
-- SELECT cron.schedule('cleanup-expired-keys', '0 * * * *', 'SELECT cleanup_expired_key_access();');
