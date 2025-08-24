-- Invitation System Migration
-- Creates all necessary tables for the invitation system
-- Run this migration to ensure the invitation system is properly set up

-- ===================================================================
-- INVITATION TYPES
-- ===================================================================

-- Create invitation status enum if not exists
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM (
        'pending',
        'accepted',
        'declined',
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create invitation type enum if not exists
DO $$ BEGIN
    CREATE TYPE invitation_type AS ENUM (
        'friend_request',
        'group_invitation',
        'relationship_invitation'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create connection setup status enum if not exists
DO $$ BEGIN
    CREATE TYPE connection_setup_status AS ENUM (
        'pending',
        'completed',
        'skipped'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create group invitation status enum if not exists
DO $$ BEGIN
    CREATE TYPE group_invitation_status AS ENUM (
        'pending',
        'accepted',
        'declined',
        'expired',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create group member role enum if not exists
DO $$ BEGIN
    CREATE TYPE group_member_role AS ENUM (
        'creator',
        'admin',
        'member'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ===================================================================
-- INDIVIDUAL INVITATIONS
-- ===================================================================

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Invitation details
    invitation_type invitation_type NOT NULL DEFAULT 'friend_request',
    sender_id UUID NOT NULL,
    recipient_email TEXT NOT NULL,
    recipient_phone TEXT,
    
    -- Invitation content
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    
    -- Status tracking
    status invitation_status DEFAULT 'pending',
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    
    -- Recipient user (filled when invitation is accepted by registered user)
    recipient_user_id UUID,
    
    -- Constraints
    CHECK (expires_at > created_at),
    CHECK (sender_id != recipient_user_id)
);

-- Create indexes for invitations
CREATE INDEX IF NOT EXISTS idx_invitations_sender ON invitations(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_email ON invitations(recipient_email, status);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_phone ON invitations(recipient_phone, status) WHERE recipient_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at, status);
CREATE INDEX IF NOT EXISTS idx_invitations_recipient_user ON invitations(recipient_user_id, status) WHERE recipient_user_id IS NOT NULL;

-- ===================================================================
-- CONNECTION SETUPS
-- ===================================================================

-- Create connection setups table
CREATE TABLE IF NOT EXISTS connection_setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Users involved
    user_a_id UUID NOT NULL,
    user_b_id UUID NOT NULL,
    
    -- Setup status
    setup_status connection_setup_status DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    
    -- Individual permissions (always exists)
    user_a_to_b_individual_permission TEXT DEFAULT 'limited_access',
    user_b_to_a_individual_permission TEXT DEFAULT 'limited_access',
    
    -- Group permissions (only if assigned to group)
    user_a_to_b_group_permission TEXT,
    user_b_to_a_group_permission TEXT,
    assigned_group_id UUID,
    
    -- Optional relationship details
    relationship_type TEXT,
    custom_relationship_name TEXT,
    
    -- Constraints
    CHECK (user_a_id != user_b_id),
    UNIQUE (user_a_id, user_b_id)
);

-- Create indexes for connection setups
CREATE INDEX IF NOT EXISTS idx_connection_setups_user_a ON connection_setups(user_a_id);
CREATE INDEX IF NOT EXISTS idx_connection_setups_user_b ON connection_setups(user_b_id);
CREATE INDEX IF NOT EXISTS idx_connection_setups_status ON connection_setups(setup_status);

-- ===================================================================
-- INVITATION TOKENS (for secure links)
-- ===================================================================

-- Create invitation tokens table
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Token details
    invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the actual token
    
    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT,
    
    -- Constraints
    CHECK (expires_at > created_at)
);

-- Create indexes for invitation tokens
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_hash ON invitation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_invitation ON invitation_tokens(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expires ON invitation_tokens(expires_at);

-- ===================================================================
-- GROUP INVITATIONS
-- ===================================================================

-- Create group invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Invitation details
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL,
    invitee_email TEXT NOT NULL,
    invitee_phone TEXT,
    
    -- Invitation content
    message TEXT,
    
    -- Status tracking
    status group_invitation_status DEFAULT 'pending',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    
    -- Recipient user (filled when invitation is accepted by registered user)
    invitee_user_id UUID,
    
    -- Constraints
    CHECK (expires_at > created_at),
    CHECK (inviter_id != invitee_user_id),
    UNIQUE (group_id, invitee_email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for group invitations
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_inviter ON group_invitations(inviter_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_email ON group_invitations(invitee_email, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_invitee_user ON group_invitations(invitee_user_id, status) WHERE invitee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_group_invitations_expires ON group_invitations(expires_at, status);

-- ===================================================================
-- GROUP MEMBERS
-- ===================================================================

-- Create group members table if not exists
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Group membership
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role group_member_role DEFAULT 'member',
    
    -- Membership timeline
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- Member permissions within the group
    can_invite_members BOOLEAN DEFAULT FALSE,
    can_edit_group_info BOOLEAN DEFAULT FALSE,
    can_remove_members BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CHECK (left_at IS NULL OR left_at > joined_at),
    UNIQUE (group_id, user_id, left_at) DEFERRABLE INITIALLY DEFERRED
);

-- Create indexes for group members
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id, left_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id, left_at);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(group_id, role, left_at);

-- ===================================================================
-- GROUP MEMBER PERMISSIONS
-- ===================================================================

-- Create group member permissions table
CREATE TABLE IF NOT EXISTS group_member_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Permission mapping
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- The user who has these permissions
    target_user_id UUID NOT NULL, -- The user these permissions apply to
    
    -- Permission levels
    permission_level TEXT DEFAULT 'limited_access',
    
    -- Specific permissions
    can_see_details BOOLEAN DEFAULT TRUE,
    can_see_location BOOLEAN DEFAULT TRUE,
    can_see_description BOOLEAN DEFAULT TRUE,
    can_see_attendees BOOLEAN DEFAULT TRUE,
    
    -- Notification preferences
    notify_on_events BOOLEAN DEFAULT TRUE,
    notify_on_changes BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CHECK (user_id != target_user_id),
    UNIQUE (group_id, user_id, target_user_id)
);

-- Create indexes for group member permissions
CREATE INDEX IF NOT EXISTS idx_group_member_perms_group ON group_member_permissions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_member_perms_user ON group_member_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_group_member_perms_target ON group_member_permissions(target_user_id);

-- ===================================================================
-- GROUP INVITATION TOKENS
-- ===================================================================

-- Create group invitation tokens table
CREATE TABLE IF NOT EXISTS group_invitation_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Token details
    invitation_id UUID NOT NULL REFERENCES group_invitations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT,
    
    -- Constraints
    CHECK (expires_at > created_at)
);

-- Create indexes for group invitation tokens
CREATE INDEX IF NOT EXISTS idx_group_invitation_tokens_hash ON group_invitation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_group_invitation_tokens_invitation ON group_invitation_tokens(invitation_id);
CREATE INDEX IF NOT EXISTS idx_group_invitation_tokens_expires ON group_invitation_tokens(expires_at);

-- ===================================================================
-- NOTIFICATION PREFERENCES
-- ===================================================================

-- Create invitation notification preferences table
CREATE TABLE IF NOT EXISTS invitation_notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Notification channels
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
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_invitation_notification_preferences_user ON invitation_notification_preferences(user_id);

-- ===================================================================
-- TRIGGERS
-- ===================================================================

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
CREATE TRIGGER update_invitations_updated_at 
    BEFORE UPDATE ON invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connection_setups_updated_at ON connection_setups;
CREATE TRIGGER update_connection_setups_updated_at 
    BEFORE UPDATE ON connection_setups 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_invitations_updated_at ON group_invitations;
CREATE TRIGGER update_group_invitations_updated_at 
    BEFORE UPDATE ON group_invitations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_members_updated_at ON group_members;
CREATE TRIGGER update_group_members_updated_at 
    BEFORE UPDATE ON group_members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_member_permissions_updated_at ON group_member_permissions;
CREATE TRIGGER update_group_member_permissions_updated_at 
    BEFORE UPDATE ON group_member_permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invitation_notification_preferences_updated_at ON invitation_notification_preferences;
CREATE TRIGGER update_invitation_notification_preferences_updated_at 
    BEFORE UPDATE ON invitation_notification_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- UTILITY FUNCTIONS
-- ===================================================================

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update expired individual invitations
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    -- Update expired group invitations
    UPDATE group_invitations 
    SET status = 'expired' 
    WHERE status = 'pending' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS affected_rows = affected_rows + ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Function to create default invitation preferences for new users
CREATE OR REPLACE FUNCTION create_default_invitation_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO invitation_notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: The trigger for creating default preferences would need to be added 
-- to whatever table represents your users (likely handled by Supabase Auth)

-- ===================================================================
-- VIEWS
-- ===================================================================

-- View for pending invitations with sender info
CREATE OR REPLACE VIEW pending_invitations_view AS
SELECT 
    i.id,
    i.invitation_type,
    i.recipient_email,
    i.recipient_phone,
    i.message,
    i.expires_at,
    i.created_at,
    i.sender_id,
    -- You would join with your users table here
    i.recipient_user_id,
    i.status
FROM invitations i
WHERE i.status = 'pending' 
AND i.expires_at > NOW();

-- View for pending group invitations with group info
CREATE OR REPLACE VIEW pending_group_invitations_view AS
SELECT 
    gi.id,
    gi.group_id,
    gi.inviter_id,
    gi.invitee_email,
    gi.invitee_phone,
    gi.message,
    gi.expires_at,
    gi.created_at,
    gi.invitee_user_id,
    gi.status,
    rg.group_name,
    rg.description as group_description,
    rg.color as group_color
FROM group_invitations gi
JOIN relationship_groups rg ON gi.group_id = rg.id
WHERE gi.status = 'pending' 
AND gi.expires_at > NOW();

-- ===================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================================================

-- Enable RLS on all invitation tables
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you may need to adjust these based on your auth setup)
-- Note: These assume you have auth.uid() available from Supabase Auth

-- Invitations policies
CREATE POLICY "Users can view invitations they sent" ON invitations
    FOR SELECT USING (auth.uid() = sender_id);

CREATE POLICY "Users can view invitations sent to them" ON invitations
    FOR SELECT USING (auth.uid() = recipient_user_id);

CREATE POLICY "Users can create invitations" ON invitations
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update invitations they sent" ON invitations
    FOR UPDATE USING (auth.uid() = sender_id);

-- Connection setups policies
CREATE POLICY "Users can view their connection setups" ON connection_setups
    FOR SELECT USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

CREATE POLICY "Users can manage their connection setups" ON connection_setups
    FOR ALL USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);

-- Group invitations policies
CREATE POLICY "Group members can view group invitations" ON group_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm 
            WHERE gm.group_id = group_invitations.group_id 
            AND gm.user_id = auth.uid() 
            AND gm.left_at IS NULL
        )
        OR auth.uid() = invitee_user_id
    );

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON invitation_notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE invitations IS 'Individual user invitations for friend requests and relationships';
COMMENT ON TABLE connection_setups IS 'Tracks the setup process after invitation acceptance';
COMMENT ON TABLE invitation_tokens IS 'Secure tokens for invitation links';
COMMENT ON TABLE group_invitations IS 'Group membership invitations';
COMMENT ON TABLE group_members IS 'Group membership records';
COMMENT ON TABLE group_member_permissions IS 'Permissions between group members';
COMMENT ON TABLE group_invitation_tokens IS 'Secure tokens for group invitation links';
COMMENT ON TABLE invitation_notification_preferences IS 'User preferences for invitation notifications';

-- Migration complete
SELECT 'Invitation system migration completed successfully' as status;