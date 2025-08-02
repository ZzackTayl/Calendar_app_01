-- Universal SQL Schema - Works on PostgreSQL, MySQL, SQL Server
-- PolyHarmony Calendar Database Schema

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    encrypted_profile BLOB,
    public_key TEXT NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free'
);

-- Relationships table
CREATE TABLE relationships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    partner_id UUID NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    default_privacy_level VARCHAR(20) DEFAULT 'full_access',
    encrypted_details BLOB,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, partner_id),
    CHECK(user_id != partner_id)
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    encrypted_event_data BLOB,
    start_time_encrypted BLOB,
    end_time_encrypted BLOB,
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event privacy table
CREATE TABLE event_privacy (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    relationship_id UUID,
    group_id UUID,
    privacy_level VARCHAR(20) NOT NULL
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX idx_events_owner ON events(owner_id, created_at DESC);
CREATE INDEX idx_event_privacy_event ON event_privacy(event_id);