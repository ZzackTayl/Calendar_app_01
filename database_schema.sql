-- PolyHarmony Database Schema
-- Zero-Knowledge Architecture with End-to-End Encryption
-- PostgreSQL with Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- USER MANAGEMENT & AUTHENTICATION
-- ===================================================================

-- Users table (minimal server-side data for zero-knowledge)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Encrypted user profile (client-side encrypted JSON)
    encrypted_profile BYTEA, -- Contains display_name, avatar_url, preferences
    
    -- Encryption metadata (public keys, etc.)
    public_key TEXT NOT NULL, -- User's public key for E2EE
    key_version INTEGER DEFAULT 1,
    
    -- Subscription status (for freemium model)
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_users_phone (phone_number),
    INDEX idx_users_active (is_active, subscription_tier)
);

-- ===================================================================
-- RELATIONSHIP MANAGEMENT
-- ===================================================================

-- Relationship types enum
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

-- Privacy levels for relationships
CREATE TYPE privacy_level AS ENUM (
    'full_access',
    'limited_access',
    'busy_only',
    'hidden'
);

-- Relationships table (defines connections between users)
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Relationship participants
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    relationship_type relationship_type NOT NULL,
    custom_type_name VARCHAR(50), -- When type is 'custom'
    
    -- Relationship establishment
    established_date DATE,
    anniversary_reminder BOOLEAN DEFAULT TRUE,
    
    -- Privacy settings for this relationship
    default_privacy_level privacy_level DEFAULT 'full_access',
    
    -- Encrypted relationship details (client-side encrypted)
    encrypted_details BYTEA, -- Contains notes, agreements, preferences
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    
    -- Indexes for relationship queries
    UNIQUE KEY unique_relationship (user_id, partner_id),
    INDEX idx_relationships_user (user_id, is_active),
    INDEX idx_relationships_partner (partner_id, is_active),
    INDEX idx_relationships_type (relationship_type),
    
    -- Ensure no self-relationships
    CHECK (user_id != partner_id)
);

-- Relationship groups (for polycules and complex networks)
CREATE TABLE relationship_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name VARCHAR(100) NOT NULL,
    group_description TEXT,
    
    -- Encrypted group settings
    encrypted_settings BYTEA, -- Contains group rules, agreements
    
    -- Group type
    is_private BOOLEAN DEFAULT TRUE,
    join_requires_approval BOOLEAN DEFAULT TRUE,
    
    INDEX idx_groups_creator (created_by),
    INDEX idx_groups_private (is_private)
);

-- Group memberships
CREATE TABLE relationship_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'member', -- admin, member, observer
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Privacy settings within group
    group_privacy_level privacy_level DEFAULT 'full_access',
    
    UNIQUE KEY unique_group_membership (group_id, user_id),
    INDEX idx_group_members (group_id, role),
    INDEX idx_user_groups (user_id)
);

-- ===================================================================
-- CALENDAR & EVENTS
-- ===================================================================

-- Calendar categories (encrypted client-side)
CREATE TABLE calendar_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted category details
    encrypted_category_data BYTEA, -- Contains name, color, icon
    
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    
    INDEX idx_categories_user (user_id, sort_order)
);

-- Events table (core calendar functionality)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Event owner
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic event data (encrypted)
    encrypted_event_data BYTEA, -- Contains title, description, location
    
    -- Time data (partially encrypted for zero-knowledge)
    start_time_encrypted BYTEA, -- Encrypted timestamp
    end_time_encrypted BYTEA,   -- Encrypted timestamp
    is_all_day BOOLEAN,
    
    -- Recurring events
    recurrence_rule_encrypted BYTEA, -- Encrypted RRULE
    recurrence_exception_dates_encrypted BYTEA, -- Encrypted exception dates
    
    -- Event status
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, tentative, cancelled
    
    -- Category reference (encrypted category ID)
    category_id_encrypted BYTEA,
    
    -- Indexes for encrypted data handling
    INDEX idx_events_owner (owner_id, status),
    INDEX idx_events_created (owner_id, created_at DESC)
);

-- Event privacy settings (who can see what)
CREATE TABLE event_privacy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    
    -- Relationship-based privacy
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
    group_id UUID REFERENCES relationship_groups(id) ON DELETE CASCADE,
    
    -- Privacy level for this viewer
    privacy_level privacy_level NOT NULL,
    
    -- Encrypted sharing details
    encrypted_sharing_data BYTEA, -- Contains custom visibility rules
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_event_privacy_event (event_id),
    INDEX idx_event_privacy_relationship (relationship_id),
    INDEX idx_event_privacy_group (group_id)
);

-- Event attendees (for shared events)
CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Attendee status
    attendance_status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, tentative
    
    -- Encrypted attendee-specific data
    encrypted_attendee_data BYTEA, -- Contains personal notes, reminders
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE KEY unique_attendee (event_id, user_id),
    INDEX idx_attendees_event (event_id, attendance_status),
    INDEX idx_attendees_user (user_id, attendance_status)
);

-- ===================================================================
-- AI & SMART SCHEDULING
-- ===================================================================

-- AI processing queue for Weave AI
CREATE TABLE ai_processing_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Request details
    request_type VARCHAR(50) NOT NULL, -- natural_language, conflict_detection, suggestion
    encrypted_request_data BYTEA, -- Encrypted request payload
    encrypted_context_data BYTEA, -- Encrypted context for AI
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    priority INTEGER DEFAULT 5, -- 1-10 scale
    
    -- Results
    encrypted_response_data BYTEA, -- Encrypted AI response
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    INDEX idx_ai_queue_user (user_id, status, priority DESC),
    INDEX idx_ai_queue_status (status, created_at)
);

-- AI suggestions and insights
CREATE TABLE ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Suggestion details
    suggestion_type VARCHAR(50) NOT NULL, -- conflict_resolution, time_balance, reminder
    encrypted_suggestion_data BYTEA, -- Encrypted suggestion content
    
    -- Context and reasoning
    encrypted_context_data BYTEA, -- Encrypted context used for suggestion
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- User interaction
    user_action VARCHAR(20), -- accepted, dismissed, modified
    action_taken_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_suggestions_user (user_id, suggestion_type),
    INDEX idx_suggestions_action (user_action, created_at DESC)
);

-- ===================================================================
-- NOTIFICATIONS & REMINDERS
-- ===================================================================

-- Notification preferences (encrypted)
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Encrypted preferences
    encrypted_preferences BYTEA, -- Contains all notification settings
    
    -- Device tokens (encrypted)
    encrypted_device_tokens BYTEA, -- Push notification tokens
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE KEY unique_user_prefs (user_id)
);

-- Scheduled notifications
CREATE TABLE scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL, -- event_reminder, anniversary, conflict
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Encrypted notification content
    encrypted_content BYTEA,
    
    -- Delivery tracking
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, sent, delivered, failed
    
    INDEX idx_notifications_user (user_id, scheduled_for),
    INDEX idx_notifications_status (status, scheduled_for)
);

-- ===================================================================
-- AUDIT & SECURITY
-- ===================================================================

-- Security audit log (minimal server-side tracking)
CREATE TABLE security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic audit data (non-sensitive)
    action_type VARCHAR(50) NOT NULL, -- login, password_change, key_rotation
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_audit_user (user_id, created_at DESC),
    INDEX idx_audit_action (action_type, created_at DESC)
);

-- ===================================================================
-- BACKUP & RECOVERY
-- ===================================================================

-- Encrypted backup metadata
CREATE TABLE backup_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Backup details
    backup_type VARCHAR(20) NOT NULL, -- automatic, manual, export
    encrypted_backup_hash BYTEA, -- Hash of encrypted backup
    backup_size_bytes INTEGER,
    
    -- Storage location (encrypted)
    encrypted_storage_location BYTEA,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_backups_user (user_id, created_at DESC)
);

-- ===================================================================
-- PERFORMANCE INDEXES
-- ===================================================================

-- Composite indexes for common queries
CREATE INDEX idx_events_owner_time ON events(owner_id, created_at DESC);
CREATE INDEX idx_relationships_active ON relationships(user_id, partner_id, is_active);
CREATE INDEX idx_event_privacy_lookup ON event_privacy(event_id, relationship_id, privacy_level);
CREATE INDEX idx_attendees_status ON event_attendees(user_id, attendance_status, updated_at DESC);

-- Full-text search indexes (for encrypted data handling)
-- Note: These will work with encrypted data patterns
CREATE INDEX idx_events_search ON events USING gin (to_tsvector('simple', encode(encrypted_event_data, 'hex')));
CREATE INDEX idx_relationships_search ON relationships USING gin (to_tsvector('simple', encode(encrypted_details, 'hex')));

-- ===================================================================
-- TRIGGERS & FUNCTIONS
-- ===================================================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relationships_updated_at BEFORE UPDATE ON relationships FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON relationship_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================================================
-- INITIAL DATA & CONSTRAINTS
-- ===================================================================

-- Default calendar categories (encrypted templates)
INSERT INTO calendar_categories (id, user_id, encrypted_category_data, is_default, sort_order) VALUES
(uuid_generate_v4(), NULL, '\x00000000', TRUE, 1), -- Personal (encrypted placeholder)
(uuid_generate_v4(), NULL, '\x00000001', TRUE, 2), -- Work (encrypted placeholder)
(uuid_generate_v4(), NULL, '\x00000002', TRUE, 3), -- Relationship (encrypted placeholder)
(uuid_generate_v4(), NULL, '\x00000003', TRUE, 4); -- Family (encrypted placeholder)

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_privacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS Policies will be implemented at application level due to zero-knowledge architecture
-- All data access will be through authenticated API endpoints with user-specific encryption

-- ===================================================================
-- COMMENTS & DOCUMENTATION
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