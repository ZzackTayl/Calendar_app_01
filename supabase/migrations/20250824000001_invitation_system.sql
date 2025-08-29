-- Invitation System Migration
-- Date: 2025-08-24
-- Purpose: Create invitation system tables and relationships

-- Invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    invitation_type TEXT DEFAULT 'relationship',
    message TEXT,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    recipient_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation tokens table (for secure links)
CREATE TABLE invitation_tokens (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_invitations_sender ON invitations(sender_id);
CREATE INDEX idx_invitations_recipient_email ON invitations(recipient_email);
CREATE INDEX idx_invitations_recipient_phone ON invitations(recipient_phone);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitation_tokens_invitation ON invitation_tokens(invitation_id);
CREATE INDEX idx_invitation_tokens_token ON invitation_tokens(token_hash);