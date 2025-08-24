-- Friend Invitation System Schema
-- Extends the existing PolyHarmony schema with invitation functionality

-- ===================================================================
-- INVITATION TYPES
-- ===================================================================

CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'cancelled'
);

CREATE TYPE invitation_type AS ENUM (
    'friend_request',
    'group_invitation',
    'relationship_invitation'
);

CREATE TYPE connection_setup_status AS ENUM (
    'pending',
    'completed',
    'skipped'
);

-- ===================================================================
-- INVITATIONS TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Invitation details
    invitation_type invitation_type NOT NULL DEFAULT 'friend_request',
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT,
    
    -- Invitation content
    message TEXT, -- Optional personal message
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Status tracking
    status invitation_status DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    
    -- Recipient user (if they sign up)
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_invitations_sender ON invitations(sender_id, status);
CREATE INDEX idx_invitations_recipient_email ON invitations(recipient_email, status);
CREATE INDEX idx_invitations_recipient_phone ON invitations(recipient_phone, status);
CREATE INDEX idx_invitations_expires ON invitations(expires_at, status);
CREATE INDEX idx_invitations_recipient_user ON invitations(recipient_user_id, status);

-- ===================================================================
-- CONNECTION SETUP TABLE
-- ===================================================================

CREATE TABLE IF NOT EXISTS connection_setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Connection participants
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Setup status
    setup_status connection_setup_status DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    
    -- Permission settings (if completed)
    user_a_to_b_permission privacy_level DEFAULT 'limited_access',
    user_b_to_a_permission privacy_level DEFAULT 'limited_access',
    
    -- Group assignment (if any)
    assigned_group_id UUID REFERENCES relationship_groups(id) ON DELETE SET NULL,
    
    -- Relationship type (if established)
    relationship_type relationship_type,
    custom_relationship_name TEXT,
    
    CONSTRAINT unique_connection_setup UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_connection_setups_user_a ON connection_setups(user_a_id, setup_status);
CREATE INDEX idx_connection_setups_user_b ON connection_setups(user_b_id, setup_status);
CREATE INDEX idx_connection_setups_status ON connection_setups(setup_status);

-- ===================================================================
-- INVITATION TOKENS (for secure invitation links)
-- ===================================================================

CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Token details
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT
);

CREATE INDEX idx_invitation_tokens_hash ON invitation_tokens(token_hash);
CREATE INDEX idx_invitation_tokens_invitation ON invitation_tokens(invitation_id);
CREATE INDEX idx_invitation_tokens_expires ON invitation_tokens(expires_at);

-- ===================================================================
-- NOTIFICATION PREFERENCES FOR INVITATIONS
-- ===================================================================

CREATE TABLE IF NOT EXISTS invitation_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification settings
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    
    -- Auto-accept settings
    auto_accept_from_contacts BOOLEAN DEFAULT FALSE,
    auto_accept_from_groups BOOLEAN DEFAULT FALSE,
    
    -- Privacy settings
    allow_invitations_from_public BOOLEAN DEFAULT TRUE,
    require_approval_for_connections BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- ===================================================================
-- TRIGGERS AND FUNCTIONS
-- ===================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connection_setups_updated_at 
    BEFORE UPDATE ON connection_setups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invitation_notification_preferences_updated_at 
    BEFORE UPDATE ON invitation_notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- VIEWS FOR COMMON QUERIES
-- ===================================================================

-- View for pending invitations
CREATE OR REPLACE VIEW pending_invitations_view AS
SELECT 
    i.id,
    i.invitation_type,
    i.sender_id,
    u1.phone_number as sender_phone,
    i.recipient_email,
    i.recipient_phone,
    i.message,
    i.expires_at,
    i.created_at,
    CASE 
        WHEN i.recipient_user_id IS NOT NULL THEN 'registered'
        ELSE 'unregistered'
    END as recipient_status
FROM invitations i
JOIN users u1 ON i.sender_id = u1.id
WHERE i.status = 'pending' AND i.expires_at > NOW();

-- View for connection setup status
CREATE OR REPLACE VIEW connection_setup_status_view AS
SELECT 
    cs.id,
    cs.user_a_id,
    u1.phone_number as user_a_phone,
    cs.user_b_id,
    u2.phone_number as user_b_phone,
    cs.setup_status,
    cs.user_a_to_b_permission,
    cs.user_b_to_a_permission,
    cs.assigned_group_id,
    rg.group_name,
    cs.relationship_type,
    cs.completed_at
FROM connection_setups cs
JOIN users u1 ON cs.user_a_id = u1.id
JOIN users u2 ON cs.user_b_id = u2.id
LEFT JOIN relationship_groups rg ON cs.assigned_group_id = rg.id;

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on invitation tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Users can view invitations they sent" ON invitations
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can view invitations sent to them" ON invitations
    FOR SELECT USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations they sent" ON invitations
    FOR UPDATE USING (auth.uid() = sender_id);

-- Policies for connection setups
CREATE POLICY "Users can view their connection setups" ON connection_setups
    FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can create connection setups" ON connection_setups
    FOR INSERT WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can update their connection setups" ON connection_setups
    FOR UPDATE USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Policies for notification preferences
CREATE POLICY "Users can manage their own notification preferences" ON invitation_notification_preferences
    FOR ALL USING (auth.uid() = user_id);