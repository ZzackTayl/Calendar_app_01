-- Create security audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100),
  record_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_table_name ON security_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);

-- Add RLS policies
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow service role to insert audit logs
CREATE POLICY "service_role_insert_security_audit_log" ON security_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Only allow service role to read audit logs
CREATE POLICY "service_role_select_security_audit_log" ON security_audit_log
  FOR SELECT TO service_role
  USING (true);

-- Grant permissions to service role
GRANT ALL ON security_audit_log TO service_role;

-- Add comment for documentation
COMMENT ON TABLE security_audit_log IS 'Audit log for security-related operations including password migrations, failed login attempts, and other security events';
