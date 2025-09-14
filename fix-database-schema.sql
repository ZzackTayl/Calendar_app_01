-- ============================================
-- FIX MISSING DATABASE TABLES
-- ============================================

-- First, let's check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Create the users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    time_zone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Profile fields
    preferred_pronouns TEXT,
    bio TEXT,
    relationship_style TEXT,
    primary_use_case TEXT,
    -- Settings
    default_privacy_preference TEXT DEFAULT 'limited_access',
    default_connection_tier TEXT DEFAULT 'busy_only',
    allow_partner_calendar_sync BOOLEAN DEFAULT false,
    email_notifications_enabled BOOLEAN DEFAULT true,
    calendar_reminders_enabled BOOLEAN DEFAULT true,
    partner_request_notifications BOOLEAN DEFAULT true
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Now insert the user record for existing auth users
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Create other essential tables if missing

-- Events table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT false,
    location TEXT,
    privacy_level TEXT DEFAULT 'private',
    relationship_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relationships table
CREATE TABLE IF NOT EXISTS public.relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    partner_name TEXT NOT NULL,
    partner_email TEXT,
    relationship_type TEXT,
    status TEXT DEFAULT 'active',
    color TEXT,
    privacy_level TEXT DEFAULT 'private',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group members table
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(group_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for events
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
CREATE POLICY "Users can view own events" ON public.events
    FOR ALL USING (auth.uid() = user_id);

-- Basic RLS policies for relationships
DROP POLICY IF EXISTS "Users can manage own relationships" ON public.relationships;
CREATE POLICY "Users can manage own relationships" ON public.relationships
    FOR ALL USING (auth.uid() = user_id);

-- Basic RLS policies for groups
DROP POLICY IF EXISTS "Group members can view group" ON public.groups;
CREATE POLICY "Group members can view group" ON public.groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = groups.id 
            AND user_id = auth.uid() 
            AND left_at IS NULL
        )
    );

-- Verify everything was created
SELECT 
    'users' as table_name, 
    COUNT(*) as row_count 
FROM public.users
UNION ALL
SELECT 
    'events' as table_name, 
    COUNT(*) as row_count 
FROM public.events
UNION ALL
SELECT 
    'relationships' as table_name, 
    COUNT(*) as row_count 
FROM public.relationships
UNION ALL
SELECT 
    'groups' as table_name, 
    COUNT(*) as row_count 
FROM public.groups;

-- Show the current user
SELECT * FROM public.users WHERE email = 'zacks@anthropologica.tech';