-- CSRF Protection Migration
-- Creates the necessary database structure for CSRF token validation

-- Create csrf_tokens table
CREATE TABLE IF NOT EXISTS public.csrf_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT csrf_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT csrf_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON public.csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON public.csrf_tokens(expires_at);

-- Enable RLS on csrf_tokens table
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for csrf_tokens
DROP POLICY IF EXISTS "Users can manage their own CSRF tokens" ON public.csrf_tokens;
CREATE POLICY "Users can manage their own CSRF tokens" ON public.csrf_tokens
    FOR ALL USING (user_id = auth.uid());

-- Add comments for documentation
COMMENT ON TABLE public.csrf_tokens IS 'Stores CSRF tokens for user sessions';
COMMENT ON COLUMN public.csrf_tokens.user_id IS 'User ID associated with the token';
COMMENT ON COLUMN public.csrf_tokens.token IS 'The CSRF token value';
COMMENT ON COLUMN public.csrf_tokens.expires_at IS 'When the token expires';

-- Clean up any expired tokens
DELETE FROM public.csrf_tokens WHERE expires_at < now();
