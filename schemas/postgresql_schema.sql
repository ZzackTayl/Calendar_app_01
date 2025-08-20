-- PolyHarmony Database Schema - PostgreSQL 14+ Compatible
-- Zero-Knowledge Architecture with End-to-End Encryption
-- Optimized for Supabase and PostgreSQL

-- ===================================================================
-- EXTENSIONS
-- ===================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================================================
-- ENUM TYPES
-- ===================================================================
DO $$ BEGIN
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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE privacy_level AS ENUM (
        'full_access',
        'limited_access',
        'busy_only',
        'hidden'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'free',
        'premium',
        'enterprise'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM (
        'confirmed',
        'tentative',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'pending',
        'accepted',
        'declined',
        'tentative'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ai_request_type AS ENUM (
        'natural_language',
        'conflict_detection',
        'suggestion',
        'time_balance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'event_reminder',
        'anniversary',
        'conflict',
        'relationship_update',
        'group_invitation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================================================================
-- USERS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS users (
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
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active, subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_subscription ON users(subscription_tier, subscription_expires_at);

-- ===================================================================
-- RELATIONSHIPS
-- ===================================================================
CREATE TABLE IF NOT EXISTS relationships (
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
CREATE INDEX IF NOT EXISTS idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_relationships_partner ON relationships(partner_id, is_active);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_active_both ON relationships(user_id, partner_id, is_active);

-- ===================================================================
-- RELATIONSHIP GROUPS (POLYCULES)
-- ===================================================================
CREATE TABLE IF NOT EXISTS relationship_groups (
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
CREATE INDEX IF NOT EXISTS idx_groups_creator ON relationship_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_private ON relationship_groups(is_private);
CREATE INDEX IF NOT EXISTS idx_groups_active ON relationship_groups(deleted_at);

-- Group memberships
CREATE TABLE IF NOT EXISTS relationship_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    role VARCHAR(20) DEFAULT 'member', -- admin, member, observer
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Privacy within group
    group_privacy_level privacy_level DEFAULT 'full_access',
    
    CONSTRAINT unique_group_membership UNIQUE (group_id, user_id)
);

-- Group membership indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group ON relationship_group_members(group_id, role);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON relationship_group_members(user_id);

-- ===================================================================
-- CALENDAR CATEGORIES
-- ===================================================================
CREATE TABLE IF NOT EXISTS calendar_categories (
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
CREATE INDEX IF NOT EXISTS idx_categories_user ON calendar_categories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_default ON calendar_categories(user_id, is_default);

-- ===================================================================
-- EVENTS
-- ===================================================================
CREATE TABLE IF NOT EXISTS events (
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
    status event_status DEFAULT '