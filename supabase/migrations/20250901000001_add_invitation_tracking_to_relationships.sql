-- Migration: Add invitation tracking fields to relationships table
-- Created: 2025-09-01
-- Description: Adds fields to track invitation status for relationship connections

-- Add invitation tracking columns to relationships table
ALTER TABLE relationships 
ADD COLUMN invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
ADD COLUMN invitation_status VARCHAR(20) CHECK (invitation_status IN ('pending', 'sent', 'accepted', 'declined')),
ADD COLUMN invitation_sent_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_status ON relationships(invitation_status) WHERE invitation_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_sent_at ON relationships(invitation_sent_at) WHERE invitation_sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_id ON relationships(invitation_id) WHERE invitation_id IS NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN relationships.invitation_id IS 'Links to the invitation record if one was sent for this relationship';
COMMENT ON COLUMN relationships.invitation_status IS 'Status of invitation: pending (not yet sent), sent (email sent), accepted (user joined), declined (user rejected)';
COMMENT ON COLUMN relationships.invitation_sent_at IS 'Timestamp when invitation email was last sent';