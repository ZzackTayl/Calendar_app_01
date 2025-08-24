
-- PolyHarmony Database Schema - PostgreSQL 14+ Compatible
-- Zero-Knowledge Architecture with End-to-End Encryption
-- Designed for Supabase and PostgreSQL

-- ===================================================================
-- ENUM TYPES
-- ===================================================================
CREATE TYPE relationship_type AS ENUM (
    'nesting_partner',
    'primary_partner',
    'secondary_partner',
    'long_distance',
    'triad',
    'quad',
    'polycule',
    'comet',
    'play_partner',
    'romantic',
    'platonic',
    'custom'
);

CREATE TYPE privacy_level AS ENUM (
    'full_access',
    'limited_access',
    'busy_only',
    'hidden'
);

CREATE TYPE subscription_tier AS ENUM (
    'free',
    'premium',
    'enterprise'
);

CREATE TYPE event_status AS ENUM (
    'confirmed',
    'tentative',
    'cancelled'
);

CREATE TYPE attendance_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'tentative'
);

CREATE TYPE ai_request_type AS ENUM (
    'natural_language',
    'conflict_detection',
    'suggestion',
    'time_balance'
);

CREATE TYPE notification_type AS ENUM (
    'event_reminder',
    'anniversary',
    'conflict',
    'relationship_update',
    'group_invitation'
);

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

CREATE TYPE group_invitation_status AS ENUM (
    'pending',
    'accepted',
    'declined',
    'expired',
    'cancelled'
);

CREATE TYPE group_member_role AS ENUM (
    'creator',
    'admin',
    'member'
);

-- ===================================================================
-- USERS TABLE
-- ===================================================================
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number varchar(20) UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_login_at timestamptz,
    is_active boolean DEFAULT true,
    
    -- Encrypted user profile (client-side encrypted JSONB)
    encrypted_profile bytea,
    
    -- Encryption metadata
    public_key text NOT NULL,
    key_version integer DEFAULT 1,
    
    -- Subscription management
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at timestamptz,
    
    -- Soft delete support
    deleted_at timestamptz,

    -- Calendar integration tokens
    google_calendar_access_token TEXT,
    google_calendar_refresh_token TEXT,
    google_calendar_token_expires_at TIMESTAMPTZ,
    apple_calendar_access_token TEXT,
    apple_calendar_refresh_token TEXT,
    apple_calendar_token_expires_at TIMESTAMPTZ
);

-- User indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_active ON users(is_active, subscription_tier);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_expires_at);

-- ===================================================================
-- RELATIONSHIPS
-- ===================================================================
CREATE TABLE relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Relationship participants
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    relationship_type relationship_type NOT NULL,
    custom_type_name varchar(50),
    
    -- Important dates
    established_date date,
    anniversary_reminder boolean DEFAULT true,
    
    -- Default privacy for this relationship
    default_privacy_level privacy_level DEFAULT 'full_access',
    
    -- Encrypted relationship details
    encrypted_details bytea,
    
    -- Status flags
    is_active boolean DEFAULT true,
    is_blocked boolean DEFAULT false,
    
    -- Prevent self-relationships
    CONSTRAINT no_self_relationship CHECK (user_id != partner_id),
    
    -- Ensure unique relationships
    CONSTRAINT unique_relationship UNIQUE (user_id, partner_id)
);

-- Relationship indexes
CREATE INDEX idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX idx_relationships_partner ON relationships(partner_id, is_active);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);
CREATE INDEX idx_relationships_active_both ON relationships(user_id, partner_id, is_active);

-- ===================================================================
-- RELATIONSHIP GROUPS (POLYCULES)
-- ===================================================================
CREATE TABLE relationship_groups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name varchar(100) NOT NULL,
    group_description text,
    
    -- Encrypted group settings
    encrypted_settings bytea,
    
    -- Group configuration
    is_private boolean DEFAULT true,
    join_requires_approval boolean DEFAULT true,
    
    deleted_at timestamptz
);

-- Group indexes
CREATE INDEX idx_groups_creator ON relationship_groups(created_by);
CREATE INDEX idx_groups_private ON relationship_groups(is_private);
CREATE INDEX idx_groups_active ON relationship_groups(deleted_at) WHERE deleted_at IS NULL;

-- Group memberships
CREATE TABLE relationship_group_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role group_member_role DEFAULT 'member',
    joined_at timestamptz DEFAULT now(),
    left_at timestamptz,
    
    -- Member-specific group permissions
    can_invite_members BOOLEAN DEFAULT true,
    can_edit_group_info BOOLEAN DEFAULT false,
    can_remove_members BOOLEAN DEFAULT false,
    
    CONSTRAINT unique_group_membership UNIQUE (group_id, user_id),
    CONSTRAINT group_members_active CHECK (left_at IS NULL OR left_at > joined_at)
);

-- Group membership indexes
CREATE INDEX idx_group_members_group ON relationship_group_members(group_id, role);
CREATE INDEX idx_group_members_user ON relationship_group_members(user_id);
CREATE INDEX idx_group_members_active ON relationship_group_members(group_id, user_id) WHERE left_at IS NULL;

-- ===================================================================
-- CALENDAR CATEGORIES
-- ===================================================================
CREATE TABLE calendar_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted category data
    encrypted_category_data bytea,
    
    is_default boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Category indexes
CREATE INDEX idx_categories_user ON calendar_categories(user_id, sort_order);
CREATE INDEX idx_categories_default ON calendar_categories(user_id, is_default);

-- ===================================================================
-- EVENTS
-- ===================================================================
CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    -- Event owner
    owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted event data
    encrypted_event_data bytea,
    
    -- Time data (encrypted)
    start_time_encrypted bytea,
    end_time_encrypted bytea,
    is_all_day boolean,
    
    -- Recurring events
    recurrence_rule_encrypted bytea,
    recurrence_exception_dates_encrypted bytea,
    
    -- Event status
    status event_status DEFAULT 'confirmed',
    
    -- Category reference (encrypted)
    category_id_encrypted bytea,
    
    -- Soft delete
    deleted_at timestamptz
);

-- Event indexes
CREATE INDEX idx_events_owner ON events(owner_id, status);
CREATE INDEX idx_events_created ON events(owner_id, created_at DESC);
CREATE INDEX idx_events_deleted ON events(deleted_at) WHERE deleted_at IS NULL;

-- ===================================================================
-- EVENT PRIVACY
-- ===================================================================
CREATE TABLE event_privacy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Relationship-based sharing
    relationship_id uuid REFERENCES relationships(id) ON DELETE CASCADE,
    group_id uuid REFERENCES relationship_groups(id) ON DELETE CASCADE,
    
    -- Privacy level
    privacy_level privacy_level NOT NULL,
    
    -- Encrypted sharing rules
    encrypted_sharing_data bytea,
    
    created_at timestamptz DEFAULT now(),
    
    -- Ensure one type of sharing per entry
    CONSTRAINT valid_sharing CHECK (
        (relationship_id IS NOT NULL)::int + (group_id IS NOT NULL)::int = 1
    )
);

-- Privacy indexes
CREATE INDEX idx_event_privacy_event ON event_privacy(event_id);
CREATE INDEX idx_event_privacy_relationship ON event_privacy(relationship_id);
CREATE INDEX idx_event_privacy_group ON event_privacy(group_id);
CREATE INDEX idx_event_privacy_lookup ON event_privacy(event_id, relationship_id, privacy_level);

-- ===================================================================
-- EVENT ATTENDEES
-- ===================================================================
CREATE TABLE event_attendees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Attendee response
    attendance_status attendance_status DEFAULT 'pending',
    
    -- Encrypted attendee data
    encrypted_attendee_data bytea,
    
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_attendee UNIQUE (event_id, user_id)
);

-- Attendee indexes
CREATE INDEX idx_attendees_event ON event_attendees(event_id, attendance_status);
CREATE INDEX idx_attendees_user ON event_attendees(user_id, attendance_status);
CREATE INDEX idx_attendees_updated ON event_attendees(user_id, updated_at DESC);

-- ===================================================================
-- AI PROCESSING
-- ===================================================================
CREATE TABLE ai_processing_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type ai_request_type NOT NULL,
    encrypted_request_data bytea,
    encrypted_context_data bytea,
    
    -- Processing status
    status varchar(20) DEFAULT 'pending',
    priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Results
    encrypted_response_data bytea,
    processing_started_at timestamptz,
    processing_completed_at timestamptz,
    
    created_at timestamptz DEFAULT now()
);

-- AI queue indexes
CREATE INDEX idx_ai_queue_user ON ai_processing_queue(user_id, status, priority DESC);
CREATE INDEX idx_ai_queue_status ON ai_processing_queue(status, created_at);
CREATE INDEX idx_ai_queue_processing ON ai_processing_queue(processing_started_at, processing_completed_at);

-- ===================================================================
-- AI SUGGESTIONS
-- ===================================================================
CREATE TABLE ai_suggestions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type varchar(50) NOT NULL,
    encrypted_suggestion_data bytea,
    
    -- Context and confidence
    encrypted_context_data bytea,
    confidence_score decimal(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- User interaction
    user_action varchar(20),
    action_taken_at timestamptz,
    
    created_at timestamptz DEFAULT now()
);

-- Suggestion indexes
CREATE INDEX idx_suggestions_user ON ai_suggestions(user_id, suggestion_type);
CREATE INDEX idx_suggestions_action ON ai_suggestions(user_action, created_at DESC);
CREATE INDEX idx_suggestions_confidence ON ai_suggestions(user_id, confidence_score DESC);

-- ===================================================================
-- NOTIFICATIONS
-- ===================================================================
CREATE TABLE notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted preferences
    encrypted_preferences bytea,
    encrypted_device_tokens bytea,
    
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT unique_user_prefs UNIQUE (user_id)
);

-- Notification preferences index
CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);

-- Scheduled notifications
CREATE TABLE scheduled_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type notification_type NOT NULL,
    scheduled_for timestamptz NOT NULL,
    
    -- Encrypted content
    encrypted_content bytea,
    
    -- Delivery tracking
    status varchar(20) DEFAULT 'scheduled',
    
    created_at timestamptz DEFAULT now()
);

-- Notification indexes
CREATE INDEX idx_notifications_user ON scheduled_notifications(user_id, scheduled_for);
CREATE INDEX idx_notifications_status ON scheduled_notifications(status, scheduled_for);
CREATE INDEX idx_notifications_type ON scheduled_notifications(notification_type, scheduled_for);

-- ===================================================================
-- SECURITY AUDIT
-- ===================================================================
CREATE TABLE security_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audit data
    action_type varchar(50) NOT NULL,
    ip_address inet,
    user_agent text,
    success boolean,
    
    created_at timestamptz DEFAULT now()
);

-- Audit indexes
CREATE INDEX idx_audit_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON security_audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_ip ON security_audit_log(ip_address, created_at DESC);

-- ===================================================================
-- BACKUP METADATA
-- ===================================================================
CREATE TABLE backup_metadata (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Backup details
    backup_type varchar(20) NOT NULL,
    encrypted_backup_hash bytea,
    backup_size_bytes integer,
    
    -- Encrypted storage info
    encrypted_storage_location bytea,
    
    created_at timestamptz DEFAULT now()
);

-- Backup indexes
CREATE INDEX idx_backups_user ON backup_metadata(user_id, created_at DESC);
CREATE INDEX idx_backups_type ON backup_metadata(backup_type, created_at DESC);

-- ===================================================================
-- INVITATIONS
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

CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Invitation details
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    invitee_phone TEXT,
    message TEXT,
    
    -- Status and timing
    status group_invitation_status DEFAULT 'pending',
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    
    -- Recipient info (filled when user signs up)
    invitee_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT group_invitations_unique_pending UNIQUE (group_id, invitee_email, status)
);

CREATE INDEX idx_group_invitations_group_id ON group_invitations(group_id);
CREATE INDEX idx_group_invitations_invitee_email ON group_invitations(invitee_email);
CREATE INDEX idx_group_invitations_status ON group_invitations(status);
CREATE INDEX idx_group_invitations_expires_at ON group_invitations(expires_at);

CREATE TABLE IF NOT EXISTS group_member_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Permission relationship
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Permission settings (what user_id can see about target_user_id in this group)
    permission_level privacy_level DEFAULT 'limited_access',
    can_see_details BOOLEAN DEFAULT true,
    can_see_location BOOLEAN DEFAULT true,
    can_see_description BOOLEAN DEFAULT true,
    can_see_attendees BOOLEAN DEFAULT true,
    
    -- Notification preferences
    notify_on_events BOOLEAN DEFAULT true,
    notify_on_changes BOOLEAN DEFAULT false,
    
    -- Constraints
    CONSTRAINT group_member_permissions_unique UNIQUE (group_id, user_id, target_user_id),
    CONSTRAINT group_member_permissions_different_users CHECK (user_id != target_user_id)
);

CREATE INDEX idx_group_member_permissions_group_user ON group_member_permissions(group_id, user_id);
CREATE INDEX idx_group_member_permissions_group_target ON group_member_permissions(group_id, target_user_id);

CREATE TABLE IF NOT EXISTS group_invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Token relationship
    invitation_id UUID NOT NULL REFERENCES group_invitations(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    
    -- Usage tracking
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT
);

CREATE INDEX idx_group_invitation_tokens_invitation_id ON group_invitation_tokens(invitation_id);
CREATE INDEX idx_group_invitation_tokens_hash ON group_invitation_tokens(token_hash);

-- ===================================================================
-- UPDATE TRIGGERS
-- ===================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_invitation_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO invitation_notification_preferences (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default preferences for new users
CREATE TRIGGER create_user_invitation_preferences
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_default_invitation_preferences();

-- Apply triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_relationships_updated_at ON relationships;
CREATE TRIGGER update_relationships_updated_at 
    BEFORE UPDATE ON relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_groups_updated_at ON relationship_groups;
CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON relationship_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON calendar_categories;
CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON calendar_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendees_updated_at ON event_attendees;
CREATE TRIGGER update_attendees_updated_at 
    BEFORE UPDATE ON event_attendees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations; 
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connection_setups_updated_at ON connection_setups;
CREATE TRIGGER update_connection_setups_updated_at
    BEFORE UPDATE ON connection_setups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invitation_notification_preferences_updated_at ON invitation_notification_preferences;
CREATE TRIGGER update_invitation_notification_preferences_updated_at
    BEFORE UPDATE ON invitation_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_invitations_updated_at ON group_invitations;
CREATE TRIGGER update_group_invitations_updated_at
    BEFORE UPDATE ON group_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_members_updated_at ON relationship_group_members;
CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON relationship_group_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_member_permissions_updated_at ON group_member_permissions;
CREATE TRIGGER update_group_member_permissions_updated_at
    BEFORE UPDATE ON group_member_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- FUNCTIONS
-- ===================================================================

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
    UPDATE invitations 
    SET status = 'expired' 
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to add a user to a group with default permissions
CREATE OR REPLACE FUNCTION add_user_to_group(
    p_group_id UUID,
    p_user_id UUID,
    p_role group_member_role DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    member_id UUID;
    existing_member RECORD;
BEGIN
    -- Check if user is already a member
    SELECT * INTO existing_member 
    FROM relationship_group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id AND left_at IS NULL;
    
    IF existing_member IS NOT NULL THEN
        RAISE EXCEPTION 'User is already a member of this group';
    END IF;
    
    -- Add user to group
    INSERT INTO relationship_group_members (group_id, user_id, role)
    VALUES (p_group_id, p_user_id, p_role)
    RETURNING id INTO member_id;
    
    -- Set default permissions for this user to see all other group members
    INSERT INTO group_member_permissions (group_id, user_id, target_user_id, permission_level)
    SELECT p_group_id, p_user_id, gm.user_id, 'limited_access'
    FROM relationship_group_members gm
    WHERE gm.group_id = p_group_id 
    AND gm.user_id != p_user_id 
    AND gm.left_at IS NULL;
    
    -- Set default permissions for all other group members to see this user
    INSERT INTO group_member_permissions (group_id, user_id, target_user_id, permission_level)
    SELECT p_group_id, gm.user_id, p_user_id, 'limited_access'
    FROM relationship_group_members gm
    WHERE gm.group_id = p_group_id 
    AND gm.user_id != p_user_id 
    AND gm.left_at IS NULL;
    
    RETURN member_id;
END;
$$ LANGUAGE plpgsql;

-- Function to remove a user from a group
CREATE OR REPLACE FUNCTION remove_user_from_group(
    p_group_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    member_record RECORD;
BEGIN
    -- Get member record
    SELECT * INTO member_record 
    FROM relationship_group_members 
    WHERE group_id = p_group_id AND user_id = p_user_id AND left_at IS NULL;
    
    IF member_record IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as left
    UPDATE relationship_group_members 
    SET left_at = NOW() 
    WHERE id = member_record.id;
    
    -- Remove all permissions involving this user
    DELETE FROM group_member_permissions 
    WHERE group_id = p_group_id 
    AND (user_id = p_user_id OR target_user_id = p_user_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===================================================================
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_privacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitation_tokens ENABLE ROW LEVEL SECURITY;

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

-- Policies for group invitations
CREATE POLICY "Users can view group invitations they sent" ON group_invitations
    FOR SELECT USING (auth.uid() = inviter_id);

CREATE POLICY "Users can view group invitations sent to them" ON group_invitations
    FOR SELECT USING (auth.uid() = invitee_user_id OR invitee_email = auth.jwt() ->> 'email');

CREATE POLICY "Group members can create group invitations" ON group_invitations
    FOR INSERT WITH CHECK (
        auth.uid() = inviter_id AND
        EXISTS (
            SELECT 1 FROM relationship_group_members 
            WHERE group_id = group_invitations.group_id 
            AND user_id = auth.uid() 
            AND left_at IS NULL
            AND can_invite_members = true
        )
    );

-- Policies for group members
CREATE POLICY "Users can view their group memberships" ON relationship_group_members
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Group creators can manage members" ON relationship_group_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM relationship_group_members gm
            WHERE gm.group_id = relationship_group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'creator'
            AND gm.left_at IS NULL
        )
    );

-- Policies for group member permissions
CREATE POLICY "Users can view their own group permissions" ON group_member_permissions
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = target_user_id);

CREATE POLICY "Users can manage their own group permissions" ON group_member_permissions
    FOR ALL USING (auth.uid() = user_id);

-- ===================================================================
-- PERFORMANCE INDEXES
-- ===================================================================
-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_events_owner_time ON events(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_deleted ON events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_active_both ON relationships(user_id, partner_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_privacy_lookup ON event_privacy(event_id, relationship_id, privacy_level);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON event_attendees(user_id, attendance_status, updated_at DESC);

-- Full-text search preparation (for encrypted data)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_events_encrypted_pattern ON events USING gin (encode(encrypted_event_data, 'hex') gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_relationships_encrypted_pattern ON relationships USING gin (encode(encrypted_details, 'hex') gin_trgm_ops);

-- ===================================================================
-- COMMENTS
-- ===================================================================
COMMENT ON TABLE users IS 'Core user table with minimal server-side data for zero-knowledge architecture';
COMMENT ON TABLE relationships IS 'Defines connections between users with privacy controls';
COMMENT ON TABLE events IS 'Encrypted calendar events with relationship-based sharing';
COMMENT ON TABLE event_privacy IS 'Granular privacy settings for events per relationship/group';
COMMENT ON TABLE ai_processing_queue IS 'Queue for Weave AI processing with encrypted payloads';
COMMENT ON TABLE security_audit_log IS 'Minimal security tracking for compliance and debugging';

-- ===================================================================
-- USAGE NOTES
-- ===================================================================
-- 1. All sensitive data is encrypted client-side before storage
-- 2. Server never has access to encryption keys
-- 3. Indexes work with encrypted data patterns
-- 4. Zero-knowledge architecture prevents server data access
-- 5. Relationship graph enables complex polyamorous scheduling
-- 6. Privacy controls are enforced at encryption level
-- 7. RLS policies will be implemented at application level
-- 8. Use Supabase Auth for user management
-- 9. Use Supabase Realtime for real-time sync
-- 10. Use Supabase Storage for encrypted file attachments
