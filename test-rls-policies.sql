-- ======================================================================
-- RLS POLICIES TEST SCRIPT
-- Generated: 2025-09-04
-- Purpose: Test comprehensive RLS policies with different user scenarios
-- ======================================================================

-- Test setup: Create test users and data
-- NOTE: Run this in a test environment, not production!

BEGIN;

-- Create test users
INSERT INTO users (id, email, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'user1@test.com', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'user2@test.com', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'user3@test.com', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create user profiles
INSERT INTO user_profiles (id, full_name, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Test User 1', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Test User 2', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Test User 3', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create relationships
INSERT INTO relationships (user_id, partner_id, relationship_type, connection_tier, is_active) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'primary', 'details', true),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'secondary', 'busy_only', true)
ON CONFLICT (user_id, partner_id) DO NOTHING;

-- Create test events
INSERT INTO events (id, user_id, title, description, start_time, end_time, privacy_override) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'User 1 Private Event', 'Private event', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day 1 hour', 'private'),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'User 1 Shared Event', 'Shared event', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days 1 hour', 'default'),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'User 2 Event', 'User 2 event', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days 1 hour', 'default')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ======================================================================
-- TEST 1: Basic user data access
-- ======================================================================

-- Test: Users can only see their own records
-- This should return only user 1's data when auth.uid() = user1
SELECT 'TEST 1: User record access' as test_name;

-- Simulate auth.uid() for testing (normally handled by Supabase auth)
-- In real tests, you'd set the JWT token to simulate different users

-- ======================================================================
-- TEST 2: Relationship access
-- ======================================================================

SELECT 'TEST 2: Relationship access' as test_name;

-- Test relationship visibility
-- User 1 should see relationships with User 2
-- User 2 should see relationships with User 1 and User 3
-- User 3 should see relationship with User 2

-- This query will show all relationships (admin view)
SELECT 
    r.user_id,
    u1.email as user_email,
    r.partner_id,
    u2.email as partner_email,
    r.connection_tier,
    r.is_active
FROM relationships r
JOIN users u1 ON r.user_id = u1.id
JOIN users u2 ON r.partner_id = u2.id
ORDER BY r.user_id;

-- ======================================================================
-- TEST 3: Event visibility based on relationships
-- ======================================================================

SELECT 'TEST 3: Event visibility' as test_name;

-- Test event visibility
SELECT 
    e.id,
    e.title,
    e.user_id,
    u.email as owner_email,
    e.privacy_override,
    'All events visible to admin' as note
FROM events e
JOIN users u ON e.user_id = u.id
ORDER BY e.user_id;

-- ======================================================================
-- TEST 4: Helper function testing
-- ======================================================================

SELECT 'TEST 4: Helper functions' as test_name;

-- Test can_view_user_calendar function
SELECT 
    'User 1 viewing User 2 calendar' as scenario,
    can_view_user_calendar('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002') as can_view
UNION ALL
SELECT 
    'User 3 viewing User 1 calendar' as scenario,
    can_view_user_calendar('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001') as can_view
UNION ALL
SELECT 
    'User 2 viewing User 3 calendar' as scenario,
    can_view_user_calendar('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003') as can_view;

-- Test can_view_event_details function
SELECT 
    'User 2 viewing User 1 shared event details' as scenario,
    can_view_event_details('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002') as can_view_details
UNION ALL
SELECT 
    'User 2 viewing User 1 private event details' as scenario,
    can_view_event_details('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002') as can_view_details;

-- ======================================================================
-- TEST 5: Policy verification
-- ======================================================================

SELECT 'TEST 5: Policy verification' as test_name;

-- Run the verification function
SELECT * FROM verify_rls_policies() 
WHERE status != 'COMPLETE'
ORDER BY table_name;

-- ======================================================================
-- TEST 6: Security testing - Cross-user access attempts
-- ======================================================================

SELECT 'TEST 6: Security verification' as test_name;

-- Check that RLS is properly enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.schemaname = t.schemaname AND p.tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'user_profiles', 'relationships', 'events', 'relationship_groups',
        'contacts', 'invitations', 'calendar_integrations'
    )
ORDER BY tablename;

-- ======================================================================
-- CLEANUP (Optional - uncomment to clean up test data)
-- ======================================================================

/*
-- Clean up test data
DELETE FROM events WHERE user_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002', 
    '550e8400-e29b-41d4-a716-446655440003'
);

DELETE FROM relationships WHERE user_id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003'
);

DELETE FROM user_profiles WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003'
);

DELETE FROM users WHERE id IN (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003'
);
*/

-- ======================================================================
-- NOTES FOR MANUAL TESTING
-- ======================================================================

/*
To test RLS policies properly in Supabase:

1. Run the main migration: 20250904000000_comprehensive_rls_policies.sql
2. Create test users through your application's signup flow
3. Use different authenticated sessions to test each user's data access
4. Verify that:
   - Users can only see their own data
   - Relationship-based access works correctly
   - Privacy overrides are respected
   - Event sharing follows relationship connection tiers

Example Supabase JavaScript test:
```javascript
// Test as User 1
const { data: user1Events } = await supabase
  .from('events')
  .select('*');

// Should only return User 1's events and events shared with User 1

// Test as User 2  
const { data: user2Events } = await supabase
  .from('events')
  .select('*');

// Should only return User 2's events and events shared with User 2
```
*/