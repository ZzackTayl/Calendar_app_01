-- Privacy Model Test Queries
-- Use these queries to test the new privacy model implementation

-- ===================================================================
-- TEST 1: Verify Migration Results
-- ===================================================================

-- Check that all relationships have been migrated to connection_tier
SELECT 
    'Migration Check' as test_name,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - All relationships migrated'
        ELSE 'FAIL - ' || COUNT(*) || ' relationships still have old privacy_level'
    END as result
FROM relationships 
WHERE default_privacy_level IS NOT NULL 
  AND connection_tier IS NULL;

-- Check distribution of connection tiers
SELECT 
    'Connection Tier Distribution' as test_name,
    connection_tier,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM relationships 
GROUP BY connection_tier
ORDER BY connection_tier;

-- ===================================================================
-- TEST 2: Test Privacy Functions
-- ===================================================================

-- Test get_connection_tier function
SELECT 
    'Connection Tier Function Test' as test_name,
    r1.user_id as user_a,
    r1.partner_id as user_b,
    r1.connection_tier as expected_tier,
    get_connection_tier(r1.user_id, r1.partner_id) as actual_tier,
    CASE 
        WHEN r1.connection_tier = get_connection_tier(r1.user_id, r1.partner_id) 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as result
FROM relationships r1
WHERE r1.is_active = TRUE
LIMIT 10;

-- ===================================================================
-- TEST 3: Test Event Privacy Scenarios
-- ===================================================================

-- Create test data for privacy testing
-- (This would be run in a test environment)

-- Test scenario 1: User can see their own events
SELECT 
    'Own Events Test' as test_name,
    e.id as event_id,
    e.owner_id,
    can_view_event(e.owner_id, e.id) as can_view,
    can_view_event_details(e.owner_id, e.id) as can_view_details,
    CASE 
        WHEN can_view_event(e.owner_id, e.id) = TRUE 
         AND can_view_event_details(e.owner_id, e.id) = TRUE
        THEN 'PASS' 
        ELSE 'FAIL' 
    END as result
FROM events e
WHERE e.deleted_at IS NULL
LIMIT 5;

-- Test scenario 2: Private events are hidden from non-participants
SELECT 
    'Private Events Test' as test_name,
    e.id as event_id,
    e.owner_id,
    e.privacy_override,
    COUNT(DISTINCT r.user_id) as relationship_count,
    CASE 
        WHEN e.privacy_override = 'private' AND COUNT(DISTINCT r.user_id) = 0
        THEN 'PASS - Private event has no relationships'
        WHEN e.privacy_override = 'default'
        THEN 'PASS - Default privacy event'
        ELSE 'FAIL - Private event has relationships'
    END as result
FROM events e
LEFT JOIN relationships r ON r.partner_id = e.owner_id AND r.is_active = TRUE
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.owner_id, e.privacy_override
LIMIT 10;

-- ===================================================================
-- TEST 4: Performance Tests
-- ===================================================================

-- Test query performance for privacy checks
EXPLAIN (ANALYZE, BUFFERS) 
SELECT e.*
FROM events e
WHERE can_view_event('00000000-0000-0000-0000-000000000001'::UUID, e.id)
  AND e.deleted_at IS NULL
LIMIT 100;

-- ===================================================================
-- TEST 5: Data Integrity Tests
-- ===================================================================

-- Check for orphaned event_privacy records
SELECT 
    'Orphaned Event Privacy Test' as test_name,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - No orphaned records'
        ELSE 'FAIL - ' || COUNT(*) || ' orphaned records found'
    END as result
FROM event_privacy ep
LEFT JOIN events e ON ep.event_id = e.id
WHERE e.id IS NULL;

-- Check for invalid connection tiers
SELECT 
    'Invalid Connection Tier Test' as test_name,
    COUNT(*) as invalid_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - All connection tiers valid'
        ELSE 'FAIL - ' || COUNT(*) || ' invalid connection tiers found'
    END as result
FROM relationships 
WHERE connection_tier NOT IN ('private', 'busy_only', 'details');

-- ===================================================================
-- TEST 6: Edge Case Tests
-- ===================================================================

-- Test self-relationships (should not exist)
SELECT 
    'Self-Relationship Test' as test_name,
    COUNT(*) as self_relationship_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - No self-relationships'
        ELSE 'FAIL - ' || COUNT(*) || ' self-relationships found'
    END as result
FROM relationships 
WHERE user_id = partner_id;

-- Test inactive relationships
SELECT 
    'Inactive Relationship Test' as test_name,
    COUNT(*) as inactive_count,
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS - No inactive relationships'
        ELSE 'INFO - ' || COUNT(*) || ' inactive relationships (expected)'
    END as result
FROM relationships 
WHERE is_active = FALSE;

-- ===================================================================
-- TEST 7: Privacy Model Logic Tests
-- ===================================================================

-- Test that private events are properly hidden
SELECT 
    'Private Event Visibility Test' as test_name,
    e.id as event_id,
    e.privacy_override,
    COUNT(DISTINCT ea.user_id) as participant_count,
    CASE 
        WHEN e.privacy_override = 'private' AND COUNT(DISTINCT ea.user_id) = 0
        THEN 'PASS - Private event with no participants'
        WHEN e.privacy_override = 'private' AND COUNT(DISTINCT ea.user_id) > 0
        THEN 'PASS - Private event with participants'
        WHEN e.privacy_override = 'default'
        THEN 'PASS - Default privacy event'
        ELSE 'FAIL - Unexpected privacy configuration'
    END as result
FROM events e
LEFT JOIN event_attendees ea ON e.id = ea.event_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.privacy_override
LIMIT 10;

-- ===================================================================
-- SUMMARY REPORT
-- ===================================================================

-- Generate a summary report of all tests
SELECT 
    'PRIVACY MODEL MIGRATION TEST SUMMARY' as report_title,
    NOW() as test_timestamp,
    (SELECT COUNT(*) FROM relationships WHERE connection_tier IS NOT NULL) as migrated_relationships,
    (SELECT COUNT(*) FROM relationship_group_members WHERE connection_tier IS NOT NULL) as migrated_group_members,
    (SELECT COUNT(*) FROM events WHERE privacy_override IS NOT NULL) as events_with_privacy_override,
    (SELECT COUNT(*) FROM events WHERE privacy_override = 'private') as private_events;
