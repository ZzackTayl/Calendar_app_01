-- Enhanced Multi-Partner Availability System Migration
-- This migration adds support for caching, performance tracking, and enhanced conflict detection

-- Ensure functions in the extensions schema are available (e.g., uuid_generate_v4)
SET LOCAL search_path = public, extensions;

-- ===================================================================
-- AVAILABILITY CACHE TABLE
-- ===================================================================

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

-- Index for efficient cache lookups
CREATE INDEX IF NOT EXISTS idx_availability_cache_lookup 
ON availability_cache(user_id, time_range_start, time_range_end);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_availability_cache_expires 
ON availability_cache(expires_at);

-- ===================================================================
-- CONFLICT AUDIT LOG TABLE
-- ===================================================================

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

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_conflict_audit_user_time 
ON conflict_audit_log(user_id, created_at);

-- Index for performance monitoring
CREATE INDEX IF NOT EXISTS idx_conflict_audit_performance 
ON conflict_audit_log USING GIN(performance_metrics);

-- ===================================================================
-- PRE-COMPUTED AVAILABILITY WINDOWS TABLE
-- ===================================================================

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

-- Composite index for availability window lookups
CREATE INDEX IF NOT EXISTS idx_availability_windows_lookup 
ON availability_windows(user_id, partner_id, window_start, window_end);

-- Index for recomputation scheduling
CREATE INDEX IF NOT EXISTS idx_availability_windows_recompute 
ON availability_windows(next_recompute) WHERE next_recompute IS NOT NULL;

-- ===================================================================
-- ENHANCE EXISTING EVENTS TABLE
-- ===================================================================

-- Add enhanced conflict detection columns to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS buffer_time_before INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS buffer_time_after INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS travel_time_to_location INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS conflict_resolution_strategy TEXT DEFAULT 'most_restrictive',
ADD COLUMN IF NOT EXISTS availability_check_version INTEGER DEFAULT 1;

-- Add constraints for buffer times
ALTER TABLE events 
ADD CONSTRAINT buffer_time_before_positive CHECK (buffer_time_before >= 0),
ADD CONSTRAINT buffer_time_after_positive CHECK (buffer_time_after >= 0),
ADD CONSTRAINT travel_time_positive CHECK (travel_time_to_location >= 0);

-- Add constraint for conflict resolution strategy
ALTER TABLE events 
ADD CONSTRAINT valid_conflict_resolution_strategy 
CHECK (conflict_resolution_strategy IN ('most_restrictive', 'most_permissive', 'explicit_wins'));

-- ===================================================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ===================================================================

-- Optimized index for time-range conflict queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_user_time_range_optimized 
ON events(user_id, start_time, end_time) 
WHERE status != 'cancelled' AND is_all_day = false;

-- Index for relationship-based conflict queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_partner_lookup_optimized 
ON relationships(user_id, partner_id, is_active) 
WHERE is_active = true;

-- Privacy-aware query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_privacy_time_optimized 
ON events(privacy_level, user_id, start_time, end_time)
WHERE status != 'cancelled';

-- Buffer time query optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_buffer_times 
ON events(user_id, start_time, end_time, buffer_time_before, buffer_time_after)
WHERE status != 'cancelled';

-- ===================================================================
-- PERFORMANCE MONITORING TABLES
-- ===================================================================

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

-- Index for performance analytics
CREATE INDEX IF NOT EXISTS idx_conflict_check_metrics_analytics 
ON conflict_check_metrics(check_type, created_at, processing_time_ms);

-- ===================================================================
-- CACHE MANAGEMENT FUNCTIONS
-- ===================================================================

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_availability_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM availability_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate cache for a user's partners when events change
CREATE OR REPLACE FUNCTION invalidate_partner_availability_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete cache entries that might be affected by this event change
    DELETE FROM availability_cache 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND (
        (time_range_start <= COALESCE(NEW.end_time, OLD.end_time) AND 
         time_range_end >= COALESCE(NEW.start_time, OLD.start_time))
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- TRIGGERS FOR CACHE INVALIDATION
-- ===================================================================

-- Trigger to invalidate cache when events are modified
DROP TRIGGER IF EXISTS trigger_invalidate_availability_cache ON events;
CREATE TRIGGER trigger_invalidate_availability_cache
    AFTER INSERT OR UPDATE OR DELETE ON events
    FOR EACH ROW 
    EXECUTE FUNCTION invalidate_partner_availability_cache();

-- ===================================================================
-- SCHEDULED CACHE CLEANUP
-- ===================================================================

-- Note: In production, you would set up a cron job or scheduled function
-- to run clean_expired_availability_cache() periodically

-- ===================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===================================================================

-- Enable RLS on new tables
ALTER TABLE availability_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_check_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for availability_cache
CREATE POLICY "Users can only access their own availability cache"
ON availability_cache FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for conflict_audit_log
CREATE POLICY "Users can only access their own conflict audit logs"
ON conflict_audit_log FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for availability_windows
CREATE POLICY "Users can only access their own availability windows"
ON availability_windows FOR ALL
USING (auth.uid() = user_id);

-- RLS Policies for conflict_check_metrics
CREATE POLICY "Users can only access their own metrics"
ON conflict_check_metrics FOR ALL
USING (auth.uid() = user_id);

-- ===================================================================
-- GRANT PERMISSIONS
-- ===================================================================

-- Grant necessary permissions for the application user
-- (Adjust based on your Supabase configuration)

-- GRANT SELECT, INSERT, UPDATE, DELETE ON availability_cache TO authenticated;
-- GRANT SELECT, INSERT ON conflict_audit_log TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON availability_windows TO authenticated;
-- GRANT SELECT, INSERT ON conflict_check_metrics TO authenticated;

-- ===================================================================
-- UTILITY FUNCTIONS FOR PERFORMANCE MONITORING
-- ===================================================================

-- Function to get performance stats for a user
CREATE OR REPLACE FUNCTION get_conflict_check_performance_stats(
    user_uuid UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    check_type TEXT,
    total_checks BIGINT,
    avg_processing_time_ms NUMERIC,
    avg_cache_hit_ratio NUMERIC,
    total_partners_checked BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccm.check_type,
        COUNT(*) as total_checks,
        ROUND(AVG(ccm.processing_time_ms), 2) as avg_processing_time_ms,
        ROUND(AVG(ccm.cache_hit_ratio), 3) as avg_cache_hit_ratio,
        SUM(ccm.partner_count) as total_partners_checked
    FROM conflict_check_metrics ccm
    WHERE ccm.user_id = user_uuid
    AND ccm.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY ccm.check_type
    ORDER BY total_checks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================

COMMENT ON TABLE availability_cache IS 'Caches conflict detection results to improve performance';
COMMENT ON TABLE conflict_audit_log IS 'Logs all conflict detection requests for security and analytics';
COMMENT ON TABLE availability_windows IS 'Pre-computed availability windows for frequently checked partners';
COMMENT ON TABLE conflict_check_metrics IS 'Performance metrics for conflict checking operations';

COMMENT ON FUNCTION clean_expired_availability_cache() IS 'Utility function to clean expired cache entries';
COMMENT ON FUNCTION invalidate_partner_availability_cache() IS 'Trigger function to invalidate cache when events change';
COMMENT ON FUNCTION get_conflict_check_performance_stats(UUID, INTEGER) IS 'Get performance statistics for conflict checking';

-- ===================================================================
-- MIGRATION VERIFICATION
-- ===================================================================

-- Insert a test record to verify the migration worked
DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'availability_cache') THEN
        RAISE EXCEPTION 'Migration failed: availability_cache table not created';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conflict_audit_log') THEN
        RAISE EXCEPTION 'Migration failed: conflict_audit_log table not created';
    END IF;
    
    -- Log successful migration
    RAISE NOTICE 'Enhanced availability system migration completed successfully';
END
$$;