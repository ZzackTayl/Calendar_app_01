-- Create rate_limit_log table for rate limiting across edge functions
-- This prevents abuse and controls costs for SMS/Email services

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient rate limit queries
CREATE INDEX idx_rate_limit_user_action 
  ON rate_limit_log(user_id, action, created_at DESC);

CREATE INDEX idx_rate_limit_cleanup 
  ON rate_limit_log(created_at);

-- Enable Row Level Security
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only see their own rate limit logs
CREATE POLICY rate_limit_user_policy 
  ON rate_limit_log 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Service role can insert/delete (for edge functions)
-- Regular users cannot modify rate limit logs
CREATE POLICY rate_limit_service_insert_policy 
  ON rate_limit_log 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY rate_limit_service_delete_policy 
  ON rate_limit_log 
  FOR DELETE 
  USING (true);

-- Grant permissions
GRANT SELECT ON rate_limit_log TO authenticated;
GRANT INSERT, DELETE ON rate_limit_log TO service_role;

-- Add comment for documentation
COMMENT ON TABLE rate_limit_log IS 'Tracks API usage for rate limiting. Old entries are automatically cleaned up after 24 hours.';
COMMENT ON COLUMN rate_limit_log.action IS 'Action being rate limited (e.g., send_email, send_sms, send_ai_sms)';
