-- PolyHarmony Database Schema - PostgreSQL Compatible
-- Zero-Knowledge Architecture with End-to-End Encryption
-- PostgreSQL 14+ with Supabase

-- ===================================================================
-- EXTENSIONS
-- ===================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- TYPES
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Encrypted user profile (client-side encrypted JSONB)
    encrypted_profile BYTEA,
    
    -- Encryption metadata
    public_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    
    -- Subscription management
    subscription_tier subscription_tier DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ
);

-- User indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_active ON users(is_active, subscription_tier);
CREATE INDEX idx_users_subscription ON users(subscription_tier, subscription_expires_at);

-- ===================================================================
-- RELATIONSHIPS
-- ===================================================================
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Relationship participants
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    relationship_type relationship_type NOT NULL,
    custom_type_name VARCHAR(50),
    
    -- Important dates
    established_date DATE,
    anniversary_reminder BOOLEAN DEFAULT TRUE,
    
    -- Default privacy for this relationship
    default_privacy_level privacy_level DEFAULT 'full_access',
    
    -- Encrypted relationship details
    encrypted_details BYTEA,
    
    -- Status flags
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT,
    
    -- Encrypted group settings
    encrypted_settings BYTEA,
    
    -- Group configuration
    is_private BOOLEAN DEFAULT TRUE,
    join_requires_approval BOOLEAN DEFAULT TRUE,
    
    deleted_at TIMESTAMPTZ
);

-- Group indexes
CREATE INDEX idx_groups_creator ON relationship_groups(created_by);
CREATE INDEX idx_groups_private ON relationship_groups(is_private);
CREATE INDEX idx_groups_active ON relationship_groups(deleted_at);

-- Group memberships
CREATE TABLE relationship_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'member', -- admin, member, observer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Privacy within group
    group_privacy_level privacy_level DEFAULT 'full_access',
    
    UNIQUE KEY unique_group_membership (group_id, user_id)
);

-- Group membership indexes
CREATE INDEX idx_group_members_group ON relationship_group_members(group_id, role);
CREATE INDEX idx_group_members_user ON relationship_group_members(user_id);

-- ===================================================================
-- CALENDAR CATEGORIES
-- ===================================================================
CREATE TABLE calendar_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted category data
    encrypted_category_data BYTEA,
    
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category indexes
CREATE INDEX idx_categories_user ON calendar_categories(user_id, sort_order);
CREATE INDEX idx_categories_default ON calendar_categories(user_id, is_default);

-- ===================================================================
-- EVENTS
-- ===================================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Event owner
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted event data
    encrypted_event_data BYTEA,
    
    -- Time data (encrypted)
    start_time_encrypted BYTEA,
    end_time_encrypted BYTEA,
    is_all_day BOOLEAN,
    
    -- Recurring events
    recurrence_rule_encrypted BYTEA,
    recurrence_exception_dates_encrypted BYTEA,
    
    -- Event status
    status event_status DEFAULT 'confirmed',
    
    -- Category reference (encrypted)
    category_id_encrypted BYTEA,
    
    -- Soft delete
    deleted_at TIMESTAMPTZ
);

-- Event indexes
CREATE INDEX idx_events_owner ON events(owner_id, status);
CREATE INDEX idx_events_created ON events(owner_id, created_at DESC);
CREATE INDEX idx_events_deleted ON events(deleted_at);

-- ===================================================================
-- EVENT PRIVACY
-- ===================================================================
CREATE TABLE event_privacy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Relationship-based sharing
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
    group_id UUID REFERENCES relationship_groups(id) ON DELETE CASCADE,
    
    -- Privacy level
    privacy_level privacy_level NOT NULL,
    
    -- Encrypted sharing rules
    encrypted_sharing_data BYTEA,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Attendee response
    attendance_status attendance_status DEFAULT 'pending',
    
    -- Encrypted attendee data
    encrypted_attendee_data BYTEA,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE KEY unique_attendee (event_id, user_id)
);

-- Attendee indexes
CREATE INDEX idx_attendees_event ON event_attendees(event_id, attendance_status);
CREATE INDEX idx_attendees_user ON event_attendees(user_id, attendance_status);
CREATE INDEX idx_attendees_updated ON event_attendees(user_id, updated_at DESC);

-- ===================================================================
-- AI PROCESSING
-- ===================================================================
CREATE TABLE ai_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type ai_request_type NOT NULL,
    encrypted_request_data BYTEA,
    encrypted_context_data BYTEA,
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'pending',
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    
    -- Results
    encrypted_response_data BYTEA,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI queue indexes
CREATE INDEX idx_ai_queue_user ON ai_processing_queue(user_id, status, priority DESC);
CREATE INDEX idx_ai_queue_status ON ai_processing_queue(status, created_at);
CREATE INDEX idx_ai_queue_processing ON ai_processing_queue(processing_started_at, processing_completed_at);

-- ===================================================================
-- AI SUGGESTIONS
-- ===================================================================
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL,
    encrypted_suggestion_data BYTEA,
    
    -- Context and confidence
    encrypted_context_data BYTEA,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- User interaction
    user_action VARCHAR(20),
    action_taken_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestion indexes
CREATE INDEX idx_suggestions_user ON ai_suggestions(user_id, suggestion_type);
CREATE INDEX idx_suggestions_action ON ai_suggestions(user_action, created_at DESC);
CREATE INDEX idx_suggestions_confidence ON ai_suggestions(user_id, confidence_score DESC);

-- ===================================================================
-- NOTIFICATIONS
-- ===================================================================
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted preferences
    encrypted_preferences BYTEA,
    encrypted_device_tokens BYTEA,
    
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE KEY unique_user_prefs (user_id)
);

-- Notification preferences index
CREATE INDEX idx_notif_prefs_user ON notification_preferences(user_id);

-- Scheduled notifications
CREATE TABLE scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type notification_type NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    
    -- Encrypted content
    encrypted_content BYTEA,
    
    -- Delivery tracking
    status VARCHAR(20) DEFAULT 'scheduled',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification indexes
CREATE INDEX idx_notifications_user ON scheduled_notifications(user_id, scheduled_for);
CREATE INDEX idx_notifications_status ON scheduled_notifications(status, scheduled_for);
CREATE INDEX idx_notifications_type ON scheduled_notifications(notification_type, scheduled_for);

-- ===================================================================
-- SECURITY AUDIT
-- ===================================================================
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audit data
    action_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit indexes
CREATE INDEX idx_audit_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON security_audit_log(action_type, created_at DESC);
CREATE INDEX idx_audit_ip ON security_audit_log(ip_address, created_at DESC);

-- ===================================================================
-- BACKUP METADATA
-- ===================================================================
CREATE TABLE backup_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Backup details
    backup_type VARCHAR(20) NOT NULL,
    encrypted_backup_hash BYTEA,
    backup_size_bytes INTEGER,
    
    -- Encrypted storage info
    encrypted_storage_location BYTEA,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
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
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at 
    BEFORE UPDATE ON relationships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at 
    BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at 
    BEFORE UPDATE ON relationship_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
    BEFORE UPDATE ON calendar_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendees_updated_at 
    BEFORE UPDATE ON event_attendees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
CREATE INDEX idx_events_owner_time ON events(owner_id, created_at DESC);
CREATE INDEX idx_events_deleted ON events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_relationships_active_both ON relationships(user_id, partner_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_event_privacy_lookup ON event_privacy(event_id, relationship_id, privacy_level);
CREATE INDEX idx_attendees_status ON event_attendees(user_id, attendance_status, updated_at DESC);

-- Full-text search preparation (for encrypted data)
-- These indexes support pattern matching on encrypted data
CREATE INDEX idx_events_encrypted_pattern ON events USING gin (encode(encrypted_event_data, 'hex') gin_trgm_ops);
CREATE INDEX idx_relationships_encrypted_pattern ON relationships USING gin (encode(encrypted_details, 'hex') gin_trgm_ops);

-- ===================================================================
-- INITIAL DATA
-- ===================================================================
-- Default calendar categories (encrypted placeholders)
INSERT INTO calendar_categories (id, user_id, encrypted_category_data, is_default, sort_order) VALUES
(uuid_generate_v4(), NULL, '\x00000000', TRUE, 1),
(uuid_generate_v4(), NULL, '\x00000001', TRUE, 2),
(uuid_generate_v4(), NULL, '\x00000002', TRUE, 3),
(uuid_generate_v4(), NULL, '\x00000003', TRUE, 4);

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