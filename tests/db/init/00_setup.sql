-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic auth schema for testing (minimal version)
CREATE SCHEMA IF NOT EXISTS auth;

-- Create minimal auth.users table for testing
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create authenticated role for testing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END $$;

-- Create anon role for testing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Mock Supabase auth.uid() function for tests
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql stable
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true)::uuid,
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid,
    current_setting('auth.uid', true)::uuid
  )
$$;

-- Mock current_user_id() function used in some tests
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
LANGUAGE sql stable
AS $$
  SELECT auth.uid()
$$;
