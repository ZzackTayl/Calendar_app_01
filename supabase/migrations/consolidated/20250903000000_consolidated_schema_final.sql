-- ======================================================================
-- CONSOLIDATED DATABASE SCHEMA MIGRATION
-- Generated: 2025-09-02T06:04:05.735Z
-- Purpose: Single migration file consolidating all schema changes
--
-- This migration replaces the following files:
--   • 20250822000000_enhanced_mvp_schema.sql
--   • 20250824000001_invitation_system.sql
--   • 20250829010000_phase3_enhancements.sql
--   • 20250830061228_security_tables.sql
--   • 20250830120000_enhanced_availability_system.sql
--   • 20250830140000_fix_search_path_security.sql
--   • 20250830150000_fix_additional_search_path_security.sql
--   • 20250901000001_add_invitation_tracking_to_relationships.sql
--   • 20250902000000_privacy_model_migration.sql
-- ======================================================================

-- ======================================================================
-- STEP 1: EXTENSIONS
-- ======================================================================

-- Extensions are typically created outside of migrations in Supabase
-- This is just for documentation purposes
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================
-- STEP 2: CREATE ENUM TYPES
-- ======================================================================

CREATE TYPE event_privacy_override AS ENUM (
        'default',     -- Use connection tier
        'private'      -- Hide from everyone except explicit participants
    );

-- ======================================================================
-- STEP 3: CREATE TABLES (in dependency order)
-- ======================================================================

-- USER_PROFILES TABLE
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    default_calendar_view TEXT DEFAULT 'month',
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_PERMISSIONS TABLE
CREATE TABLE event_permissions (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    relationship_id UUID,
    contact_id UUID,
    group_id UUID,
    permission_level TEXT NOT NULL,
    custom_title TEXT,
    custom_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_ATTACHMENTS TABLE
CREATE TABLE event_attachments (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTACTS TABLE
CREATE TABLE contacts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    notes TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, email)
);

-- CONTACT_GROUP_MEMBERS TABLE
CREATE TABLE contact_group_members (
    id UUID PRIMARY KEY,
    group_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (group_id, contact_id)
);

-- INVITATIONS TABLE
CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    invitation_type TEXT DEFAULT 'relationship',
    message TEXT,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    recipient_user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVITATION_TOKENS TABLE
CREATE TABLE invitation_tokens (
    id UUID PRIMARY KEY,
    invitation_id UUID NOT NULL UNIQUE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_ip TEXT,
    used_by_user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REMINDERS TABLE
CREATE TABLE reminders (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    user_id UUID NOT NULL,
    reminder_time TIMESTAMPTZ NOT NULL,
    type TEXT NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM_HOLIDAYS TABLE
CREATE TABLE custom_holidays (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL,
    recurring BOOLEAN DEFAULT TRUE,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CSRF_TOKENS TABLE
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- OAUTH_STATES TABLE
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  nonce TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- AVAILABILITY_CACHE TABLE
CREATE TABLE IF NOT EXISTS availability_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_ids UUID[] NOT NULL,
    time_range_start TIMESTAMPTZ NOT NULL,
    time_range_end TIMESTAMPTZ NOT NULL,
    conflict_data JSONB NOT NULL,
    cache_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- CONFLICT_AUDIT_LOG TABLE
CREATE TABLE IF NOT EXISTS conflict_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_data JSONB NOT NULL,
    response_data JSONB NOT NULL,
    performance_metrics JSONB,
    privacy_decisions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    ip_address INET,
    user_agent TEXT
);

-- AVAILABILITY_WINDOWS TABLE
CREATE TABLE IF NOT EXISTS availability_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    availability_score DECIMAL(3,2) CHECK (availability_score >= 0 AND availability_score <= 1),
    last_computed TIMESTAMPTZ DEFAULT NOW(),
    next_recompute TIMESTAMPTZ,
    computation_version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- CONFLICT_CHECK_METRICS TABLE
CREATE TABLE IF NOT EXISTS conflict_check_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    check_type TEXT NOT NULL, -- 'single', 'batch', 'group'
    partner_count INTEGER NOT NULL,
    processing_time_ms INTEGER NOT NULL,
    database_queries INTEGER NOT NULL,
    cache_hit_ratio DECIMAL(3,2),
    privacy_filtered_events INTEGER DEFAULT 0,
    alternatives_generated INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- PERMISSION_AUDIT_LOGS TABLE
CREATE TABLE permission_audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  previous_level TEXT,
  new_level TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- ======================================================================
-- STEP 4: ADD CONSTRAINTS AND ALTERATIONS
-- ======================================================================

-- RELATIONSHIPS ALTERATIONS
ALTER TABLE relationships
ADD COLUMN invitation_id UUID REFERENCES invitations(id) ON DELETE SET NULL,
ADD COLUMN invitation_status VARCHAR(20) CHECK (invitation_status IN ('pending', 'sent', 'accepted', 'declined')),
ADD COLUMN invitation_sent_at TIMESTAMPTZ;
ALTER TABLE relationships
ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';

-- RELATIONSHIP_GROUP_MEMBERS ALTERATIONS
ALTER TABLE relationship_group_members
        ADD COLUMN IF NOT EXISTS connection_tier connection_tier DEFAULT 'details';

-- EVENTS ALTERATIONS
ALTER TABLE events
ADD COLUMN IF NOT EXISTS buffer_time_before INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS buffer_time_after INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS travel_time_to_location INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conflict_resolution_strategy TEXT DEFAULT 'most_restrictive',
ADD COLUMN IF NOT EXISTS availability_check_version INTEGER DEFAULT 1;
ALTER TABLE events
ADD CONSTRAINT buffer_time_before_positive CHECK (buffer_time_before >= 0),
ADD CONSTRAINT buffer_time_after_positive CHECK (buffer_time_after >= 0),
ADD CONSTRAINT travel_time_positive CHECK (travel_time_to_location >= 0);
ALTER TABLE events
ADD CONSTRAINT valid_conflict_resolution_strategy
CHECK (conflict_resolution_strategy IN ('most_restrictive', 'most_permissive', 'explicit_wins'));
ALTER TABLE events
ADD COLUMN IF NOT EXISTS privacy_override event_privacy_override DEFAULT 'default';

-- CSRF_TOKENS ALTERATIONS
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;

-- OAUTH_STATES ALTERATIONS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- AVAILABILITY_CACHE ALTERATIONS
ALTER TABLE availability_cache ENABLE ROW LEVEL SECURITY;

-- CONFLICT_AUDIT_LOG ALTERATIONS
ALTER TABLE conflict_audit_log ENABLE ROW LEVEL SECURITY;

-- AVAILABILITY_WINDOWS ALTERATIONS
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;

-- CONFLICT_CHECK_METRICS ALTERATIONS
ALTER TABLE conflict_check_metrics ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- STEP 5: CREATE INDEXES
-- ======================================================================

CREATE INDEX idx_user_profiles_id ON user_profiles(id);
CREATE INDEX idx_contacts_user ON contacts(user_id);
CREATE INDEX idx_contact_group_members_group ON contact_group_members(group_id);
CREATE INDEX idx_contact_group_members_contact ON contact_group_members(contact_id);
CREATE INDEX idx_event_attachments_event ON event_attachments(event_id);
CREATE INDEX idx_event_attachments_uploaded_by ON event_attachments(uploaded_by);
CREATE INDEX idx_event_permissions_event ON event_permissions(event_id);
CREATE INDEX idx_reminders_event ON reminders(event_id);
CREATE INDEX idx_custom_holidays_user ON custom_holidays(user_id);
CREATE INDEX idx_custom_holidays_date ON custom_holidays(date);
CREATE INDEX idx_invitations_sender ON invitations(sender_id);
CREATE INDEX idx_invitations_recipient_email ON invitations(recipient_email);
CREATE INDEX idx_invitations_recipient_phone ON invitations(recipient_phone);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitation_tokens_invitation ON invitation_tokens(invitation_id);
CREATE INDEX idx_invitation_tokens_token ON invitation_tokens(token_hash);
CREATE INDEX idx_relationships_privacy ON relationships(user_id, privacy_level);
CREATE INDEX idx_relationship_groups_privacy ON relationship_groups(user_id, is_active);
CREATE INDEX idx_group_members_privacy ON relationship_group_members(user_id, group_privacy_level);
CREATE INDEX idx_events_privacy ON events(user_id, privacy_level);
CREATE INDEX idx_event_visibility_relationship ON event_visibility(event_id, relationship_id);
CREATE INDEX idx_event_visibility_group ON event_visibility(event_id, group_id);
CREATE INDEX idx_permission_audit_user ON permission_audit_logs(user_id, created_at);
CREATE INDEX idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);
CREATE INDEX IF NOT EXISTS idx_availability_cache_lookup
ON availability_cache(user_id, time_range_start, time_range_end);
CREATE INDEX IF NOT EXISTS idx_availability_cache_expires
ON availability_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_conflict_audit_user_time
ON conflict_audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conflict_audit_performance
ON conflict_audit_log USING GIN(performance_metrics);
CREATE INDEX IF NOT EXISTS idx_availability_windows_lookup
ON availability_windows(user_id, partner_id, window_start, window_end);
CREATE INDEX IF NOT EXISTS idx_availability_windows_recompute
ON availability_windows(next_recompute) WHERE next_recompute IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_time_range_optimized
ON events(user_id, start_time, end_time)
WHERE status != 'cancelled' AND is_all_day = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_partner_lookup_optimized
ON relationships(user_id, partner_id, is_active)
WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_privacy_time_optimized
ON events(privacy_level, user_id, start_time, end_time)
WHERE status != 'cancelled';
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_buffer_times
ON events(user_id, start_time, end_time, buffer_time_before, buffer_time_after)
WHERE status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_conflict_check_metrics_analytics
ON conflict_check_metrics(check_type, created_at, processing_time_ms);
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_status ON relationships(invitation_status) WHERE invitation_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_sent_at ON relationships(invitation_sent_at) WHERE invitation_sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_invitation_id ON relationships(invitation_id) WHERE invitation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_relationships_connection_tier
ON relationships(user_id, connection_tier)
WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_group_members_connection_tier
        ON relationship_group_members(group_id, connection_tier);
CREATE INDEX IF NOT EXISTS idx_events_privacy_override
ON events(privacy_override)
WHERE privacy_override = 'private';

-- ======================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ======================================================================

CREATE POLICY "Users can manage their own CSRF tokens" ON csrf_tokens
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own availability cache"
ON availability_cache FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own conflict audit logs"
ON conflict_audit_log FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own availability windows"
ON availability_windows FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users can only access their own metrics"
ON conflict_check_metrics FOR ALL
USING (auth.uid() = user_id);
CREATE POLICY "Users can view events based on privacy" ON events
    FOR SELECT USING (can_view_event(id, auth.uid()));
CREATE POLICY "Users can view their relationships" ON relationships
    FOR SELECT USING (user_id = auth.uid() OR partner_id = auth.uid());
CREATE POLICY "Users can view their groups" ON relationship_groups
            FOR SELECT USING (user_id = auth.uid());

-- ======================================================================
-- STEP 7: VERIFICATION QUERIES
-- ======================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'users', 'user_profiles', 'relationship_groups', 'relationships',
        'relationship_group_members', 'events', 'event_permissions',
        'event_visibility', 'event_attachments', 'contacts', 'contact_tags',
        'contact_tag_relationships', 'contact_groups', 'contact_group_members',
        'invitations', 'invitation_tokens', 'calendar_integrations',
        'calendar_shares', 'reminders', 'user_preferences', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics', 'permission_audit_logs'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    -- Count existing tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables);

    -- Check for missing tables
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;

    -- Report results
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: % of %', table_count, array_length(expected_tables, 1);

    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ======================================================================
-- END OF CONSOLIDATED MIGRATION
-- ======================================================================
