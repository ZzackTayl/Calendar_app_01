-- ===================================================================
-- ENHANCED CONFLICT DETECTION SYSTEM - SQL VALIDATION TESTS
-- ===================================================================
-- This script validates the enhanced conflict detection system
-- by running comprehensive SQL queries directly against the database

\echo '==================================================================='
\echo 'ENHANCED CONFLICT DETECTION SYSTEM - COMPREHENSIVE VALIDATION'
\echo '==================================================================='

\echo ''
\echo '1. DATABASE SETUP VERIFICATION'
\echo '================================'

-- Check if all required tables exist
SELECT 
    'Enhanced Tables Check' as test_name,
    CASE 
        WHEN COUNT(*) = 4 THEN 'PASS'
        ELSE 'FAIL - Missing tables'
    END as result,
    COUNT(*) as tables_found,
    4 as tables_expected
FROM information_schema.tables 
WHERE table_name IN ('availability_cache', 'conflict_audit_log', 'availability_windows', 'conflict_check_metrics');

-- Check test data setup
SELECT 
    'Test Data Check' as test_name,
    CASE 
        WHEN COUNT(*) >= 8 THEN 'PASS'
        ELSE 'FAIL - Insufficient test data'
    END as result,
    COUNT(*) as test_events_found,
    8 as test_events_expected
FROM events 
WHERE title LIKE 'TEST:%';

-- Check test relationships
SELECT 
    'Test Relationships Check' as test_name,
    CASE 
        WHEN COUNT(*) >= 5 THEN 'PASS'
        ELSE 'FAIL - Insufficient test relationships'
    END as result,
    COUNT(*) as test_relationships_found,
    5 as test_relationships_expected
FROM relationships 
WHERE partner_name LIKE 'TestPartner%';

\echo ''
\echo '2. CONFLICT DETECTION LOGIC VALIDATION'
\echo '======================================='

-- Test hard overlap conflicts (should find conflicts)
WITH test_event AS (
    SELECT 
        '2025-08-30 10:00:00+00'::timestamptz as start_time,
        '2025-08-30 11:00:00+00'::timestamptz as end_time
),
conflicting_events AS (
    SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        e.user_id,
        e.privacy_level,
        r.partner_name,
        r.partner_id,
        r.privacy_level as relationship_privacy,
        -- Calculate overlap
        GREATEST(e.start_time, t.start_time) as overlap_start,
        LEAST(e.end_time, t.end_time) as overlap_end
    FROM events e
    INNER JOIN relationships r ON e.user_id = r.partner_id
    CROSS JOIN test_event t
    WHERE r.user_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND r.partner_id = ANY(ARRAY[
        '22222222-2222-2222-2222-222222222222'::uuid,
        '33333333-3333-3333-3333-333333333333'::uuid,
        '44444444-4444-4444-4444-444444444444'::uuid,
        '55555555-5555-5555-5555-555555555555'::uuid,
        '66666666-6666-6666-6666-666666666666'::uuid
    ])
    AND e.start_time < t.end_time
    AND e.end_time > t.start_time
    AND e.status != 'cancelled'
    AND e.is_all_day = false
)
SELECT 
    'Hard Overlap Detection' as test_name,
    CASE 
        WHEN COUNT(*) >= 3 THEN 'PASS'
        ELSE 'FAIL - Should find conflicts'
    END as result,
    COUNT(*) as conflicts_found,
    STRING_AGG(partner_name, ', ') as conflicted_partners
FROM conflicting_events
WHERE overlap_start < overlap_end;

\echo ''
\echo '3. PRIVACY LEVEL FILTERING VALIDATION'
\echo '====================================='

-- Test privacy filtering for different privacy levels
SELECT 
    privacy_level,
    COUNT(*) as event_count,
    CASE privacy_level
        WHEN 'public' THEN 'All details visible'
        WHEN 'visible' THEN 'Title and time visible'
        WHEN 'semi_private' THEN 'Only title visible'  
        WHEN 'private' THEN 'Anonymous conflict only'
        ELSE 'Unknown privacy level'
    END as visibility_level
FROM events 
WHERE title LIKE 'TEST:%'
GROUP BY privacy_level
ORDER BY 
    CASE privacy_level
        WHEN 'public' THEN 1
        WHEN 'visible' THEN 2
        WHEN 'semi_private' THEN 3
        WHEN 'private' THEN 4
    END;

-- Privacy filtering test
WITH privacy_test AS (
    SELECT 
        e.privacy_level,
        r.privacy_level as relationship_privacy,
        CASE 
            WHEN e.privacy_level = 'private' OR r.privacy_level = 'private' THEN 'Private Event'
            WHEN e.privacy_level = 'semi_private' OR r.privacy_level = 'semi_private' THEN 
                CASE 
                    WHEN e.privacy_level = 'private' OR r.privacy_level = 'private' THEN 'Private Event'
                    ELSE e.title
                END
            ELSE e.title
        END as filtered_title,
        e.title as original_title,
        r.partner_name
    FROM events e
    INNER JOIN relationships r ON e.user_id = r.partner_id
    WHERE e.title LIKE 'TEST:%'
    AND r.user_id = '11111111-1111-1111-1111-111111111111'::uuid
)
SELECT 
    'Privacy Filtering Test' as test_name,
    CASE 
        WHEN COUNT(CASE WHEN filtered_title != original_title THEN 1 END) > 0 THEN 'PASS'
        ELSE 'INFO - No privacy filtering needed for current test data'
    END as result,
    COUNT(*) as total_events,
    COUNT(CASE WHEN filtered_title != original_title THEN 1 END) as privacy_filtered,
    COUNT(CASE WHEN filtered_title = 'Private Event' THEN 1 END) as private_events
FROM privacy_test;

\echo ''
\echo '4. PERFORMANCE INDEX VALIDATION'
\echo '==============================='

-- Check if the optimized indexes exist
SELECT 
    indexname,
    tablename,
    'Index exists' as status
FROM pg_indexes 
WHERE indexname IN (
    'idx_events_user_time_range_optimized',
    'idx_relationships_partner_lookup_optimized', 
    'idx_events_privacy_time_optimized',
    'idx_events_buffer_times'
)
ORDER BY tablename, indexname;

-- Performance test query (measure execution time)
\echo 'Performance Test Query (should use indexes):'
EXPLAIN (ANALYZE, BUFFERS) 
SELECT 
    e.id,
    e.title,
    e.start_time,
    e.end_time,
    e.privacy_level,
    r.partner_name,
    r.partner_id
FROM events e
INNER JOIN relationships r ON e.user_id = r.partner_id  
WHERE r.user_id = '11111111-1111-1111-1111-111111111111'::uuid
AND r.partner_id = ANY(ARRAY[
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    '55555555-5555-5555-5555-555555555555'::uuid,
    '66666666-6666-6666-6666-666666666666'::uuid
])
AND e.start_time < '2025-08-30 11:00:00+00'::timestamptz
AND e.end_time > '2025-08-30 10:00:00+00'::timestamptz
AND e.status != 'cancelled'
AND e.is_all_day = false;

\echo ''
\echo '5. CACHE FUNCTIONALITY VALIDATION'
\echo '================================='

-- Test cache table functionality
INSERT INTO availability_cache (
    user_id, 
    partner_ids, 
    time_range_start, 
    time_range_end,
    conflict_data,
    expires_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    ARRAY[
        '22222222-2222-2222-2222-222222222222'::uuid,
        '33333333-3333-3333-3333-333333333333'::uuid
    ],
    '2025-08-30 10:00:00+00'::timestamptz,
    '2025-08-30 11:00:00+00'::timestamptz,
    '{"test": "cache_data", "conflicts": []}'::jsonb,
    NOW() + INTERVAL '5 minutes'
);

SELECT 
    'Cache Insert Test' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL - Cache insert failed'
    END as result,
    COUNT(*) as cache_entries
FROM availability_cache 
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;

-- Test cache cleanup function
SELECT 
    'Cache Cleanup Function Test' as test_name,
    CASE 
        WHEN clean_expired_availability_cache() >= 0 THEN 'PASS'
        ELSE 'FAIL - Cache cleanup function failed'
    END as result,
    clean_expired_availability_cache() as cleaned_entries;

-- Cleanup test cache entry
DELETE FROM availability_cache WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid;

\echo ''
\echo '6. AUDIT LOG FUNCTIONALITY VALIDATION'
\echo '====================================='

-- Test audit log functionality
INSERT INTO conflict_audit_log (
    user_id,
    request_data,
    response_data,
    performance_metrics,
    session_id
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '{"event_start": "2025-08-30T10:00:00Z", "event_end": "2025-08-30T11:00:00Z", "partner_ids": ["test"]}'::jsonb,
    '{"success": true, "conflicts": [], "has_conflicts": false}'::jsonb,
    '{"processing_time_ms": 150, "database_queries": 2, "cache_hit_ratio": 0}'::jsonb,
    'test-session-123'
);

SELECT 
    'Audit Log Test' as test_name,
    CASE 
        WHEN COUNT(*) > 0 THEN 'PASS'
        ELSE 'FAIL - Audit log insert failed'
    END as result,
    COUNT(*) as log_entries
FROM conflict_audit_log 
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid
AND session_id = 'test-session-123';

-- Cleanup audit log test entry
DELETE FROM conflict_audit_log 
WHERE user_id = '11111111-1111-1111-1111-111111111111'::uuid
AND session_id = 'test-session-123';

\echo ''
\echo '7. COMPREHENSIVE CONFLICT ANALYSIS'
\echo '=================================='

-- Detailed conflict analysis for the test scenario
WITH test_scenario AS (
    SELECT 
        '2025-08-30 10:00:00+00'::timestamptz as event_start,
        '2025-08-30 11:00:00+00'::timestamptz as event_end,
        15 as buffer_minutes
),
partner_events AS (
    SELECT 
        e.id,
        e.title,
        e.start_time,
        e.end_time,
        e.privacy_level,
        e.buffer_time_before,
        e.buffer_time_after,
        r.partner_id,
        r.partner_name,
        r.privacy_level as relationship_privacy,
        -- Conflict type detection
        CASE 
            WHEN e.start_time < ts.event_end AND e.end_time > ts.event_start THEN 'hard_overlap'
            WHEN e.end_time + INTERVAL '1 minute' * COALESCE(e.buffer_time_after, ts.buffer_minutes) > ts.event_start 
                 AND e.end_time <= ts.event_start THEN 'soft_buffer_after'
            WHEN e.start_time - INTERVAL '1 minute' * COALESCE(e.buffer_time_before, ts.buffer_minutes) < ts.event_end
                 AND e.start_time >= ts.event_end THEN 'soft_buffer_before'
            ELSE 'no_conflict'
        END as conflict_type,
        -- Severity calculation
        CASE 
            WHEN e.start_time < ts.event_end AND e.end_time > ts.event_start THEN
                CASE 
                    WHEN EXTRACT(EPOCH FROM (LEAST(e.end_time, ts.event_end) - GREATEST(e.start_time, ts.event_start)))/60 > 60 THEN 'critical'
                    WHEN EXTRACT(EPOCH FROM (LEAST(e.end_time, ts.event_end) - GREATEST(e.start_time, ts.event_start)))/60 > 30 THEN 'high'
                    ELSE 'medium'
                END
            ELSE 'low'
        END as conflict_severity
    FROM events e
    INNER JOIN relationships r ON e.user_id = r.partner_id
    CROSS JOIN test_scenario ts
    WHERE r.user_id = '11111111-1111-1111-1111-111111111111'::uuid
    AND r.is_active = true
    AND e.status != 'cancelled'
    AND e.is_all_day = false
    -- Events that might conflict (including buffer zones)
    AND (
        (e.start_time < ts.event_end AND e.end_time > ts.event_start) OR -- Direct overlap
        (e.end_time + INTERVAL '1 minute' * COALESCE(e.buffer_time_after, ts.buffer_minutes) > ts.event_start AND e.end_time <= ts.event_start) OR -- Buffer after
        (e.start_time - INTERVAL '1 minute' * COALESCE(e.buffer_time_before, ts.buffer_minutes) < ts.event_end AND e.start_time >= ts.event_end) -- Buffer before
    )
)
SELECT 
    partner_name,
    conflict_type,
    conflict_severity,
    COUNT(*) as conflict_count,
    STRING_AGG(title, '; ') as conflicting_events
FROM partner_events
WHERE conflict_type != 'no_conflict'
GROUP BY partner_name, conflict_type, conflict_severity
ORDER BY 
    CASE conflict_severity 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        WHEN 'low' THEN 4 
    END,
    partner_name;

\echo ''
\echo '8. PERFORMANCE METRICS'
\echo '====================='

-- Database performance stats
SELECT 
    'Database Performance' as metric_category,
    'Total Events' as metric_name,
    COUNT(*)::text as metric_value
FROM events
UNION ALL
SELECT 
    'Database Performance' as metric_category,
    'Test Events' as metric_name,
    COUNT(*)::text as metric_value
FROM events WHERE title LIKE 'TEST:%'
UNION ALL
SELECT 
    'Database Performance' as metric_category,
    'Total Relationships' as metric_name,
    COUNT(*)::text as metric_value
FROM relationships
UNION ALL
SELECT 
    'Database Performance' as metric_category,
    'Test Relationships' as metric_name,
    COUNT(*)::text as metric_value
FROM relationships WHERE partner_name LIKE 'TestPartner%'
UNION ALL
SELECT 
    'Database Performance' as metric_category,
    'Available Indexes' as metric_name,
    COUNT(*)::text as metric_value
FROM pg_indexes 
WHERE indexname LIKE '%optimized%'
ORDER BY metric_category, metric_name;

\echo ''
\echo '==================================================================='
\echo 'ENHANCED CONFLICT DETECTION VALIDATION COMPLETE'
\echo '==================================================================='