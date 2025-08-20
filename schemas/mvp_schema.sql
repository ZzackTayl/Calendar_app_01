-- PolyHarmony Unified MVP Schema (PostgreSQL/Supabase)
-- Matches current web app code and lib/supabase/types.ts
-- Focus: simple, operational schema (no RLS yet, no encrypted fields)

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- RELATIONSHIPS & GROUPS
-- ===================================================================

-- Relationships
-- Note: user_id is NOT FK to avoid failures when a user profile row doesn't exist yet
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- Supabase auth user id
  partner_name TEXT NOT NULL,
  partner_email TEXT,
  relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
    'primary','secondary','nesting','long_distance','casual','other'
  )),
  start_date DATE,
  color TEXT NOT NULL,
  notes TEXT,
  privacy_level VARCHAR(20) NOT NULL DEFAULT 'limited_access' CHECK (privacy_level IN (
    'full_access','limited_access','no_access'
  )),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for relationships
CREATE INDEX IF NOT EXISTS idx_relationships_user ON relationships(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_relationships_created ON relationships(user_id, created_at DESC);

-- Relationship Groups
CREATE TABLE IF NOT EXISTS relationship_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL, -- owner (auth user id)
  group_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_user ON relationship_groups(user_id);

-- Relationship Group Members (by relationship, not user)
CREATE TABLE IF NOT EXISTS relationship_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES relationship_groups(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  privacy_level VARCHAR(20) NOT NULL DEFAULT 'full_access' CHECK (privacy_level IN (
    'full_access','limited_access','busy_only','hidden'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, relationship_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON relationship_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_relationship ON relationship_group_members(relationship_id);

-- ===================================================================
-- EVENTS
-- ===================================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL, -- Supabase auth user id
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  privacy_level VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (privacy_level IN (
    'public','private','custom'
  )),
  relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
  visible_to_relationships UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_time >= start_time)
);

-- Indexes for events
CREATE INDEX IF NOT EXISTS idx_events_owner_time ON events(owner_id, start_time);
CREATE INDEX IF NOT EXISTS idx_events_time_range ON events(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_relationship ON events(relationship_id);

-- ===================================================================
-- TRIGGERS: maintain updated_at
-- ===================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DO $$ BEGIN
  CREATE TRIGGER trg_relationships_updated
  BEFORE UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_groups_updated
  BEFORE UPDATE ON relationship_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_group_members_updated
  BEFORE UPDATE ON relationship_group_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_events_updated
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- NOTES
-- ===================================================================
-- 1) This MVP schema intentionally avoids FKs to a custom users table.
--    Use Supabase Auth user ids directly in user_id/owner_id columns.
-- 2) Add RLS policies before production.
-- 3) If migrating from a previous schema, convert data into new columns
--    and drop incompatible constraints first.