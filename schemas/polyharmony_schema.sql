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
    deleted_at timestamptz
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
    
    role varchar(20) DEFAULT 'member', -- admin, member, observer
    joined_at timestamptz DEFAULT now(),
    
    -- Privacy within group
    group_privacy_level privacy_level DEFAULT 'full_access',
    
    CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Group membership indexes
CREATE INDEX idx_group_members_group ON relationship_group_members(group_id, role);
CREATE INDEX idx_group_members_user ON relationship_group_members(user_id);

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
-- UPDATE TRIGGERS
-- ===================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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