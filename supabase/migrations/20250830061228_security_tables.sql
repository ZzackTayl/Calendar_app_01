-- Security Enhancement Migration: CSRF and OAuth State Protection
-- Create tables for secure token and state management

-- CSRF Tokens table for preventing Cross-Site Request Forgery attacks
CREATE TABLE IF NOT EXISTS csrf_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- OAuth States table for preventing OAuth CSRF attacks
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  nonce TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_token ON csrf_tokens(token);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON csrf_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_provider ON oauth_states(provider);

-- Row Level Security (RLS) policies
ALTER TABLE csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- CSRF tokens: Users can only access their own tokens
CREATE POLICY "Users can manage their own CSRF tokens" ON csrf_tokens
  FOR ALL USING (auth.uid() = user_id);

-- OAuth states: Users can only access their own states  
CREATE POLICY "Users can manage their own OAuth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);

-- Function to cleanup expired tokens and states
CREATE OR REPLACE FUNCTION cleanup_expired_security_tokens()
RETURNS void AS $$
BEGIN
  -- Cleanup expired CSRF tokens
  DELETE FROM csrf_tokens WHERE expires_at < NOW();
  
  -- Cleanup expired OAuth states
  DELETE FROM oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_expired_security_tokens() TO authenticated;

-- Create a scheduled job to cleanup expired tokens (if pg_cron is available)
-- This would typically be handled by the application or a cron job
-- SELECT cron.schedule('cleanup_security_tokens', '*/15 * * * *', 'SELECT cleanup_expired_security_tokens();');

-- Comments for documentation
COMMENT ON TABLE csrf_tokens IS 'Store CSRF tokens for preventing Cross-Site Request Forgery attacks';
COMMENT ON TABLE oauth_states IS 'Store OAuth state parameters for preventing OAuth CSRF attacks';
COMMENT ON FUNCTION cleanup_expired_security_tokens() IS 'Cleanup expired CSRF tokens and OAuth states';