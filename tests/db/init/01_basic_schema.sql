-- Basic schema for key management tests

-- Create enums
CREATE TYPE key_type AS ENUM ('relationship', 'group', 'event', 'master');
CREATE TYPE access_reason AS ENUM ('relationship', 'group', 'invitation', 'event_override', 'owner');
CREATE TYPE privacy_level_enum AS ENUM ('private', 'semi_private', 'visible', 'public');

-- Create basic tables needed for key management tests
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encryption_key_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, partner_id)
);

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encryption_key_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    notes TEXT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encryption_key_id UUID,
    privacy_level privacy_level_enum DEFAULT 'private',
    custom_permissions JSONB,
    description_encrypted TEXT,
    location_encrypted TEXT,
    notes_encrypted TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Encryption tables
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_type key_type NOT NULL,
    key_owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE key_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_id UUID NOT NULL REFERENCES encryption_keys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    access_reason access_reason NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users(id),
    CONSTRAINT unique_key_access UNIQUE (key_id, user_id) DEFERRABLE INITIALLY DEFERRED
);

-- Add foreign key constraints
ALTER TABLE relationships ADD CONSTRAINT fk_relationships_encryption_key 
    FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id);

ALTER TABLE groups ADD CONSTRAINT fk_groups_encryption_key 
    FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id);

ALTER TABLE events ADD CONSTRAINT fk_events_encryption_key 
    FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id);

-- Create useful indexes
CREATE INDEX idx_encryption_keys_type ON encryption_keys(key_type);
CREATE INDEX idx_encryption_keys_owner ON encryption_keys(key_owner_id);
CREATE INDEX idx_encryption_keys_metadata_entity ON encryption_keys USING gin((metadata->'entityId'));
CREATE INDEX idx_key_access_user ON key_access(user_id);
CREATE INDEX idx_key_access_key ON key_access(key_id);
CREATE INDEX idx_key_access_expires ON key_access(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS (basic setup for testing)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_access ENABLE ROW LEVEL SECURITY;

-- Create basic permissive policies for testing
CREATE POLICY "Allow all for testing" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON relationships FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON groups FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON group_members FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON events FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON event_participants FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON encryption_keys FOR ALL USING (true);
CREATE POLICY "Allow all for testing" ON key_access FOR ALL USING (true);
