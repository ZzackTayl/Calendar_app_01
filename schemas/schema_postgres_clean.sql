-- PolyHarmony PostgreSQL Schema - Clean Version
-- Run this in PostgreSQL/Supabase

-- Create types
CREATE TYPE relationship_type AS ENUM ('nesting_partner','primary_partner','secondary_partner','long_distance','triad','quad','polycule','comet','play_partner','romantic','platonic','custom');
CREATE TYPE privacy_level AS ENUM ('full_access','limited_access','busy_only','hidden');
CREATE TYPE subscription_tier AS ENUM ('free','premium','enterprise');
CREATE TYPE event_status AS ENUM ('confirmed','tentative','cancelled');
CREATE TYPE attendance_status AS ENUM ('pending','accepted','declined','tentative');

-- Core tables
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number varchar(20) UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    encrypted_profile bytea,
    public_key text NOT NULL,
    subscription_tier subscription_tier DEFAULT 'free'
);

CREATE TABLE relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    partner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    default_privacy_level privacy_level DEFAULT 'full_access',
    encrypted_details bytea,
    is_active boolean DEFAULT true,
    UNIQUE(user_id, partner_id),
    CHECK(user_id != partner_id)
);

CREATE TABLE events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
    encrypted_event_data bytea,
    start_time_encrypted bytea,
    end_time_encrypted bytea,
    status event_status DEFAULT 'confirmed',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE event_privacy (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid REFERENCES events(id) ON DELETE CASCADE,
    relationship_id uuid REFERENCES relationships(id) ON DELETE CASCADE,
    privacy_level privacy_level NOT NULL
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX idx_events_owner ON events(owner_id, created_at DESC);
CREATE INDEX idx_event_privacy_event ON event_privacy(event_id);