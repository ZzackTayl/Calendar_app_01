-- Verify RLS policies are properly deployed
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check if RLS is enabled on critical tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('relationships', 'users', 'events', 'invitations', 'relationship_groups')
ORDER BY tablename;

-- Test that we can see relationships table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'relationships'
ORDER BY ordinal_position;