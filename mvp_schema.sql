-- PolyHarmony MVP Schema - PostgreSQL/Supabase
-- Simplified for fast development with TEXT fields
-- Privacy controls included (core requirement)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE, -- Optional for Supabase auth
    display_name TEXT,
    profile_data TEXT, -- JSON string of profile info
    public_key TEXT, -- For future encryption
    subscription_tier VARCHAR(20) DEFAULT 'free',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationship groups (like "work friends", "close partners")
CREATE TABLE relationship_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships table
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES relationship_groups(id) ON DELETE SET NULL,
    relationship_type VARCHAR(50) NOT NULL,
    default_privacy_level VARCHAR(20) DEFAULT 'full_access',
    relationship_details TEXT, -- JSON string of relationship info
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, partner_id),
    CHECK(user_id != partner_id)
);

-- Events table
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location TEXT,
    event_data TEXT, -- JSON string for additional event info
    status VARCHAR(20) DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event privacy table (CORE FEATURE)
CREATE TABLE event_privacy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
    group_id UUID REFERENCES relationship_groups(id) ON DELETE CASCADE,
    privacy_level VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Either relationship_id OR group_id should be set, not both
    CHECK (
        (relationship_id IS NOT NULL AND group_id IS NULL) OR 
        (relationship_id IS NULL AND group_id IS NOT NULL)
    )
);

-- Essential indexes for performance
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_groups_user ON relationship_groups(user_id);

CREATE INDEX idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX idx_relationships_partner ON relationships(partner_id, is_active);
CREATE INDEX idx_relationships_group ON relationships(group_id) WHERE group_id IS NOT NULL;

CREATE INDEX idx_events_owner_time ON events(owner_id, start_time);
CREATE INDEX idx_events_time_range ON events(start_time, end_time);

CREATE INDEX idx_event_privacy_event ON event_privacy(event_id);
CREATE INDEX idx_event_privacy_relationship ON event_privacy(relationship_id) WHERE relationship_id IS NOT NULL;
CREATE INDEX idx_event_privacy_group ON event_privacy(group_id) WHERE group_id IS NOT NULL;

-- Basic data validation
ALTER TABLE users ADD CONSTRAINT valid_subscription_tier 
    CHECK (subscription_tier IN ('free', 'premium', 'enterprise'));

ALTER TABLE events ADD CONSTRAINT valid_event_status 
    CHECK (status IN ('confirmed', 'tentative', 'cancelled'));

ALTER TABLE event_privacy ADD CONSTRAINT valid_privacy_level 
    CHECK (privacy_level IN ('full_access', 'limited_access', 'busy_only', 'hidden'));

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with phone-based authentication';
COMMENT ON TABLE relationship_groups IS 'User-defined groups for organizing relationships';
COMMENT ON TABLE relationships IS 'Connections between users with privacy settings';
COMMENT ON TABLE events IS 'Calendar events with privacy controls';
COMMENT ON TABLE event_privacy IS 'Granular privacy settings per relationship/group';