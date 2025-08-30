-- Test Data Setup for Enhanced Conflict Detection System

-- Clean up existing test data
DELETE FROM events WHERE title LIKE 'TEST:%';
DELETE FROM relationships WHERE partner_name LIKE 'TestPartner%';
DELETE FROM users WHERE full_name LIKE 'Test User%';

-- ===================================================================
-- CREATE TEST USERS
-- ===================================================================

INSERT INTO users (id, email, full_name, default_privacy_level) VALUES 
    ('11111111-1111-1111-1111-111111111111'::uuid, 'testuser1@example.com', 'Test User 1', 'semi_private'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'testpartner1@example.com', 'TestPartner 1', 'semi_private'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'testpartner2@example.com', 'TestPartner 2', 'private'),
    ('44444444-4444-4444-4444-444444444444'::uuid, 'testpartner3@example.com', 'TestPartner 3', 'visible'),
    ('55555555-5555-5555-5555-555555555555'::uuid, 'testpartner4@example.com', 'TestPartner 4', 'public'),
    ('66666666-6666-6666-6666-666666666666'::uuid, 'testpartner5@example.com', 'TestPartner 5', 'semi_private')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    default_privacy_level = EXCLUDED.default_privacy_level;

-- ===================================================================
-- CREATE TEST RELATIONSHIPS
-- ===================================================================

INSERT INTO relationships (id, user_id, partner_id, partner_name, partner_email, relationship_type, default_privacy_level, privacy_level, is_active) VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'TestPartner 1', 'testpartner1@example.com', 'primary', 'visible', 'visible', true),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'TestPartner 2', 'testpartner2@example.com', 'secondary', 'private', 'private', true),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'TestPartner 3', 'testpartner3@example.com', 'friendship', 'visible', 'visible', true),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'TestPartner 4', 'testpartner4@example.com', 'friendship', 'public', 'public', true),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, '11111111-1111-1111-1111-111111111111'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'TestPartner 5', 'testpartner5@example.com', 'nesting', 'semi_private', 'semi_private', true)
ON CONFLICT (id) DO UPDATE SET
    partner_name = EXCLUDED.partner_name,
    partner_email = EXCLUDED.partner_email,
    default_privacy_level = EXCLUDED.default_privacy_level,
    privacy_level = EXCLUDED.privacy_level,
    is_active = EXCLUDED.is_active;

-- ===================================================================
-- CREATE TEST EVENTS FOR CONFLICT SCENARIOS
-- ===================================================================

-- Hard overlap conflict (Partner 1)
INSERT INTO events (id, user_id, title, description, start_time, end_time, location, privacy_level, buffer_time_before, buffer_time_after, travel_time_to_location, relationship_id) VALUES 
    ('10000001-1111-1111-1111-111111111111'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'TEST: Partner 1 Hard Conflict', 'This directly overlaps with test time', '2025-08-30 10:00:00+00', '2025-08-30 11:00:00+00', 'Conference Room A', 'visible', 15, 15, 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),

-- Buffer time conflict (Partner 2) - Private event 
    ('20000002-2222-2222-2222-222222222222'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'TEST: Partner 2 Buffer Conflict', 'This has buffer time conflict', '2025-08-30 09:30:00+00', '2025-08-30 09:45:00+00', 'Home Office', 'private', 30, 30, 0, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid),

-- Travel time conflict (Partner 3)
    ('30000003-3333-3333-3333-333333333333'::uuid, '44444444-4444-4444-4444-444444444444'::uuid, 'TEST: Partner 3 Travel Conflict', 'Different location requiring travel', '2025-08-30 09:45:00+00', '2025-08-30 10:00:00+00', 'Downtown Office', 'visible', 15, 15, 30, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),

-- No conflict (Partner 4)
    ('40000004-4444-4444-4444-444444444444'::uuid, '55555555-5555-5555-5555-555555555555'::uuid, 'TEST: Partner 4 No Conflict', 'This should not conflict', '2025-08-30 14:00:00+00', '2025-08-30 15:00:00+00', 'Remote', 'public', 15, 15, 0, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid),

-- Multiple small conflicts (Partner 5)
    ('50000005-5555-5555-5555-555555555555'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'TEST: Partner 5 Small Conflict 1', 'First small conflict', '2025-08-30 10:15:00+00', '2025-08-30 10:30:00+00', 'Coffee Shop', 'semi_private', 10, 10, 0, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid),
    ('60000006-6666-6666-6666-666666666666'::uuid, '66666666-6666-6666-6666-666666666666'::uuid, 'TEST: Partner 5 Small Conflict 2', 'Second small conflict', '2025-08-30 10:45:00+00', '2025-08-30 11:15:00+00', 'Coffee Shop', 'semi_private', 10, 10, 0, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid),

-- Alternative time slot events (for testing suggestions)
    ('70000007-7777-7777-7777-777777777777'::uuid, '22222222-2222-2222-2222-222222222222'::uuid, 'TEST: Partner 1 Morning Free', 'Partner 1 is free in the morning', '2025-08-30 08:00:00+00', '2025-08-30 08:30:00+00', 'Home', 'visible', 15, 15, 0, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    ('80000008-8888-8888-8888-888888888888'::uuid, '33333333-3333-3333-3333-333333333333'::uuid, 'TEST: Partner 2 Afternoon Free', 'Partner 2 has afternoon availability', '2025-08-30 16:00:00+00', '2025-08-30 17:00:00+00', 'Library', 'private', 15, 15, 0, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid)

ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    location = EXCLUDED.location,
    privacy_level = EXCLUDED.privacy_level,
    buffer_time_before = EXCLUDED.buffer_time_before,
    buffer_time_after = EXCLUDED.buffer_time_after,
    travel_time_to_location = EXCLUDED.travel_time_to_location,
    relationship_id = EXCLUDED.relationship_id;

-- ===================================================================
-- VERIFY TEST DATA
-- ===================================================================

SELECT 
    'Test Users Created' as category,
    COUNT(*) as count
FROM users 
WHERE full_name LIKE 'Test%'

UNION ALL

SELECT 
    'Test Relationships Created' as category,
    COUNT(*) as count
FROM relationships 
WHERE partner_name LIKE 'TestPartner%'

UNION ALL

SELECT 
    'Test Events Created' as category,
    COUNT(*) as count
FROM events 
WHERE title LIKE 'TEST:%';

-- Show conflict scenario summary
SELECT 
    'Conflict Test Setup Summary' as info,
    'Partners: 1(visible), 2(private), 3(visible), 4(public), 5(semi_private)' as privacy_levels,
    'Test Time: 2025-08-30 10:00-11:00' as test_window,
    'Expected Conflicts: Hard(P1), Buffer(P2), Travel(P3), Multiple(P5)' as conflicts;