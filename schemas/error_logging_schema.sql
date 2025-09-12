-- Error Logging Schema for PolyHarmony Calendar
-- Creates missing tables referenced in error reporting code

-- ===================================================================
-- ERROR LOGGING TABLES
-- ===================================================================

-- Client-side error reports
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_id VARCHAR(255) NOT NULL UNIQUE,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    component_stack TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_agent TEXT,
    url TEXT,
    error_type VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for efficient querying
    INDEX idx_error_logs_user_id (user_id),
    INDEX idx_error_logs_error_type (error_type),
    INDEX idx_error_logs_created_at (created_at DESC),
    INDEX idx_error_logs_error_id (error_id)
);

-- System-level errors (server-side)
CREATE TABLE system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    error_message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_system_errors_user_id (user_id),
    INDEX idx_system_errors_error_type (error_type),
    INDEX idx_system_errors_resource (resource_type, resource_id),
    INDEX idx_system_errors_created_at (created_at DESC)
);

-- Security events (enhanced from existing security_audit_log)
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    route TEXT,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB,
    context VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_security_events_user_id (user_id),
    INDEX idx_security_events_event_type (event_type),
    INDEX idx_security_events_severity (severity),
    INDEX idx_security_events_created_at (created_at DESC),
    INDEX idx_security_events_ip_address (ip_address)
);

-- Key operation audit log
CREATE TABLE key_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    operation VARCHAR(100) NOT NULL,
    key_id VARCHAR(255),
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    success BOOLEAN NOT NULL,
    error TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_key_audit_user_id (user_id),
    INDEX idx_key_audit_operation (operation),
    INDEX idx_key_audit_success (success),
    INDEX idx_key_audit_created_at (created_at DESC)
);

-- ===================================================================
-- ROW LEVEL SECURITY POLICIES
-- ===================================================================

-- Enable RLS on all error logging tables
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own errors (for privacy)
CREATE POLICY "Users can view own errors" ON error_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own system errors" ON system_errors
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own security events" ON security_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own key audit logs" ON key_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert errors (for server-side logging)
CREATE POLICY "Service role can insert errors" ON error_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert system errors" ON system_errors
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert security events" ON security_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can insert key audit logs" ON key_audit_log
    FOR INSERT WITH CHECK (true);

-- ===================================================================
-- CLEANUP FUNCTIONS
-- ===================================================================

-- Function to clean up old error logs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
    -- Keep error logs for 90 days
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Keep system errors for 180 days
    DELETE FROM system_errors 
    WHERE created_at < NOW() - INTERVAL '180 days';
    
    -- Keep security events for 1 year (compliance)
    DELETE FROM security_events 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    -- Keep key audit logs for 2 years (compliance)
    DELETE FROM key_audit_log 
    WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTS
-- ===================================================================

COMMENT ON TABLE error_logs IS 'Client-side error reports with user context and stack traces';
COMMENT ON TABLE system_errors IS 'Server-side system errors with resource context';
COMMENT ON TABLE security_events IS 'Security-related events with severity levels and pattern detection';
COMMENT ON TABLE key_audit_log IS 'Audit trail for cryptographic key operations';

COMMENT ON FUNCTION cleanup_old_error_logs() IS 'Cleans up old error logs based on retention policies';
