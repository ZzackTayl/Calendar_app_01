-- Complete Database Fix Script
-- Run this entire script in your Supabase SQL Editor

-- ===================================================================
-- 1. Create CSRF Tokens Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.csrf_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT csrf_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT csrf_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_csrf_tokens_user_id ON public.csrf_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_expires_at ON public.csrf_tokens(expires_at);

ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own CSRF tokens" ON public.csrf_tokens;
CREATE POLICY "Users can manage their own CSRF tokens" ON public.csrf_tokens
    FOR ALL USING (user_id = auth.uid());

COMMENT ON TABLE public.csrf_tokens IS 'Stores CSRF tokens for user sessions';

-- ===================================================================
-- 2. Create Notifications Table
-- ===================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text,
    type text NOT NULL DEFAULT 'info',
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT notifications_pkey PRIMARY KEY (id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS 'User notifications and alerts';

-- ===================================================================
-- 3. Clean up any expired tokens
-- ===================================================================

DELETE FROM public.csrf_tokens WHERE expires_at < now();

-- ===================================================================
-- 4. Success message
-- ===================================================================

SELECT 'Database fix completed successfully!' as status;
