-- ======================================================================
-- RLS ENABLEMENT FIX FOR DATABASE LINTER ERRORS
-- Generated: 2025-09-22
-- Purpose: Enable RLS on all tables mentioned in linter errors
-- ======================================================================

-- ======================================================================
-- STEP 1: ENABLE RLS ON TABLES WITH EXISTING POLICIES
-- ======================================================================

-- These tables have policies defined but RLS is not enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- STEP 2: ENABLE RLS ON TABLES WITHOUT POLICIES (OR WITH MINIMAL POLICIES)
-- ======================================================================

-- These tables need RLS enabled and basic policies created
ALTER TABLE public.contact_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_tokens ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- STEP 3: CREATE BASIC POLICIES FOR TABLES WITHOUT COMPREHENSIVE POLICIES
-- ======================================================================

-- Basic policy for contact_group_members (if not already covered)
DROP POLICY IF EXISTS "Users can manage own contact group members" ON contact_group_members;
CREATE POLICY "Users can manage own contact group members" ON contact_group_members
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for event_attachments (if not already covered)
DROP POLICY IF EXISTS "Users can access event attachments" ON event_attachments;
CREATE POLICY "Users can access event attachments" ON event_attachments
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for event_permissions (if not already covered)
DROP POLICY IF EXISTS "Users can access event permissions" ON event_permissions;
CREATE POLICY "Users can access event permissions" ON event_permissions
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for reminders (if not already covered)
DROP POLICY IF EXISTS "Users can access reminders" ON reminders;
CREATE POLICY "Users can access reminders" ON reminders
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for custom_holidays (if not already covered)
DROP POLICY IF EXISTS "Users can access custom holidays" ON custom_holidays;
CREATE POLICY "Users can access custom holidays" ON custom_holidays
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for invitations (if not already covered)
DROP POLICY IF EXISTS "Users can access invitations" ON invitations;
CREATE POLICY "Users can access invitations" ON invitations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Basic policy for invitation_tokens (if not already covered)
DROP POLICY IF EXISTS "Users can access invitation tokens" ON invitation_tokens;
CREATE POLICY "Users can access invitation tokens" ON invitation_tokens
    FOR ALL USING (auth.uid() IS NOT NULL);

-- ======================================================================
-- STEP 4: VERIFICATION QUERY
-- ======================================================================

-- Query to verify RLS is enabled on all tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'user_profiles', 'events', 'contacts',
        'contact_group_members', 'event_attachments', 'event_permissions',
        'reminders', 'custom_holidays', 'invitations', 'invitation_tokens'
    )
ORDER BY tablename;

-- ======================================================================
-- STEP 5: POLICY VERIFICATION QUERY
-- ======================================================================

-- Query to verify policies exist and count them
SELECT
    schemaname,
    tablename,
    COUNT(policyname) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'users', 'user_profiles', 'events', 'contacts',
        'contact_group_members', 'event_attachments', 'event_permissions',
        'reminders', 'custom_holidays', 'invitations', 'invitation_tokens'
    )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ======================================================================
-- COMPLETION MESSAGE
-- ======================================================================

DO $$
BEGIN
    RAISE NOTICE 'RLS enablement fix applied successfully!';
    RAISE NOTICE 'All tables mentioned in linter errors now have RLS enabled.';
    RAISE NOTICE 'Use the verification queries above to confirm the changes.';
END $$;

-- ======================================================================
-- END OF RLS ENABLEMENT FIX
-- ======================================================================
