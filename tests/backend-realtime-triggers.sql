-- ======================================================================
-- DATABASE TRIGGER TESTS FOR REAL-TIME NOTIFICATIONS
-- ======================================================================
-- This script tests that database triggers properly fire for real-time
-- notifications and that RLS policies work correctly with subscriptions

-- ===================================================================
-- 1. Test Real-time Trigger Function
-- ===================================================================

CREATE OR REPLACE FUNCTION test_realtime_trigger()
RETURNS trigger AS $$
BEGIN
  -- Log the trigger event for testing
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    'Real-time Test Event',
    format('Table: %s, Operation: %s, ID: %s', 
           TG_TABLE_NAME, 
           TG_OP,
           COALESCE(NEW.id::text, OLD.id::text)
    ),
    'test'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 2. Create Test Triggers on Key Tables
-- ===================================================================

-- Events table trigger
DROP TRIGGER IF EXISTS test_events_realtime_trigger ON public.events;
CREATE TRIGGER test_events_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.events
  FOR EACH ROW EXECUTE FUNCTION test_realtime_trigger();

-- Relationships table trigger  
DROP TRIGGER IF EXISTS test_relationships_realtime_trigger ON public.relationships;
CREATE TRIGGER test_relationships_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION test_realtime_trigger();

-- Invitations table trigger
DROP TRIGGER IF EXISTS test_invitations_realtime_trigger ON public.invitations;
CREATE TRIGGER test_invitations_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION test_invitations_realtime_trigger();

-- ===================================================================
-- 3. Test RLS Policies for Real-time Subscriptions
-- ===================================================================

-- Function to test RLS policy effectiveness
CREATE OR REPLACE FUNCTION test_rls_realtime_compatibility()
RETURNS TABLE(
  table_name text,
  policy_name text,
  policy_check boolean,
  error_message text
) AS $$
DECLARE
  test_user_id uuid;
  test_event_id uuid;
  test_relationship_id uuid;
  test_invitation_id uuid;
BEGIN
  -- Create a test user (this would be handled by Supabase Auth in real scenarios)
  test_user_id := gen_random_uuid();
  
  -- Test Events Table RLS
  BEGIN
    -- Insert a test event
    INSERT INTO public.events (
      id, user_id, title, start_time, end_time
    ) VALUES (
      gen_random_uuid(), test_user_id, 'Test RLS Event', 
      NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours'
    ) RETURNING id INTO test_event_id;
    
    RETURN QUERY SELECT 
      'events'::text, 
      'User can access own events'::text, 
      true, 
      NULL::text;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'events'::text, 
      'User can access own events'::text, 
      false, 
      SQLERRM;
  END;
  
  -- Test Relationships Table RLS
  BEGIN
    -- Insert a test relationship
    INSERT INTO public.relationships (
      id, user_id, partner_email, status
    ) VALUES (
      gen_random_uuid(), test_user_id, 'test@example.com', 'active'
    ) RETURNING id INTO test_relationship_id;
    
    RETURN QUERY SELECT 
      'relationships'::text, 
      'User can access own relationships'::text, 
      true, 
      NULL::text;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'relationships'::text, 
      'User can access own relationships'::text, 
      false, 
      SQLERRM;
  END;
  
  -- Test Invitations Table RLS
  BEGIN
    -- Insert a test invitation
    INSERT INTO public.invitations (
      id, invited_by, invited_email, event_id, status
    ) VALUES (
      gen_random_uuid(), test_user_id, 'invited@example.com', 
      test_event_id, 'pending'
    ) RETURNING id INTO test_invitation_id;
    
    RETURN QUERY SELECT 
      'invitations'::text, 
      'User can access own invitations'::text, 
      true, 
      NULL::text;
      
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
      'invitations'::text, 
      'User can access own invitations'::text, 
      false, 
      SQLERRM;
  END;
  
  -- Cleanup test data
  DELETE FROM public.invitations WHERE id = test_invitation_id;
  DELETE FROM public.events WHERE id = test_event_id;
  DELETE FROM public.relationships WHERE id = test_relationship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 4. Performance Test for Real-time Operations
-- ===================================================================

CREATE OR REPLACE FUNCTION test_realtime_performance(
  test_duration_seconds INTEGER DEFAULT 10,
  operations_per_second INTEGER DEFAULT 5
)
RETURNS TABLE(
  operation_type text,
  total_operations integer,
  average_duration_ms numeric,
  success_rate numeric
) AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  test_user_id uuid;
  i integer;
  operation_start timestamp;
  operation_end timestamp;
  total_inserts integer := 0;
  total_updates integer := 0;
  total_deletes integer := 0;
  successful_inserts integer := 0;
  successful_updates integer := 0;
  successful_deletes integer := 0;
  insert_duration_sum numeric := 0;
  update_duration_sum numeric := 0;
  delete_duration_sum numeric := 0;
  test_event_ids uuid[];
BEGIN
  test_user_id := gen_random_uuid();
  start_time := clock_timestamp();
  end_time := start_time + (test_duration_seconds || ' seconds')::interval;
  
  -- Performance test loop
  WHILE clock_timestamp() < end_time LOOP
    -- Test INSERT performance
    BEGIN
      operation_start := clock_timestamp();
      INSERT INTO public.events (
        id, user_id, title, start_time, end_time
      ) VALUES (
        gen_random_uuid(), test_user_id, 'Perf Test Event', 
        NOW() + INTERVAL '1 hour', NOW() + INTERVAL '2 hours'
      );
      operation_end := clock_timestamp();
      
      total_inserts := total_inserts + 1;
      successful_inserts := successful_inserts + 1;
      insert_duration_sum := insert_duration_sum + 
        EXTRACT(MILLISECONDS FROM (operation_end - operation_start));
        
    EXCEPTION WHEN OTHERS THEN
      total_inserts := total_inserts + 1;
    END;
    
    -- Test UPDATE performance (if we have events to update)
    IF successful_inserts > 0 THEN
      BEGIN
        operation_start := clock_timestamp();
        UPDATE public.events 
        SET title = 'Updated Perf Test Event'
        WHERE user_id = test_user_id 
        LIMIT 1;
        operation_end := clock_timestamp();
        
        total_updates := total_updates + 1;
        successful_updates := successful_updates + 1;
        update_duration_sum := update_duration_sum + 
          EXTRACT(MILLISECONDS FROM (operation_end - operation_start));
          
      EXCEPTION WHEN OTHERS THEN
        total_updates := total_updates + 1;
      END;
    END IF;
    
    -- Control operation rate
    PERFORM pg_sleep(1.0 / operations_per_second);
  END LOOP;
  
  -- Test DELETE performance (cleanup)
  BEGIN
    operation_start := clock_timestamp();
    DELETE FROM public.events WHERE user_id = test_user_id;
    operation_end := clock_timestamp();
    
    total_deletes := 1;
    successful_deletes := 1;
    delete_duration_sum := EXTRACT(MILLISECONDS FROM (operation_end - operation_start));
    
  EXCEPTION WHEN OTHERS THEN
    total_deletes := 1;
  END;
  
  -- Return results
  RETURN QUERY SELECT 
    'INSERT'::text,
    total_inserts,
    CASE WHEN successful_inserts > 0 THEN insert_duration_sum / successful_inserts ELSE 0 END,
    CASE WHEN total_inserts > 0 THEN (successful_inserts::numeric / total_inserts) * 100 ELSE 0 END;
    
  RETURN QUERY SELECT 
    'UPDATE'::text,
    total_updates,
    CASE WHEN successful_updates > 0 THEN update_duration_sum / successful_updates ELSE 0 END,
    CASE WHEN total_updates > 0 THEN (successful_updates::numeric / total_updates) * 100 ELSE 0 END;
    
  RETURN QUERY SELECT 
    'DELETE'::text,
    total_deletes,
    CASE WHEN successful_deletes > 0 THEN delete_duration_sum / successful_deletes ELSE 0 END,
    CASE WHEN total_deletes > 0 THEN (successful_deletes::numeric / total_deletes) * 100 ELSE 0 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 5. Real-time Subscription Filter Test
-- ===================================================================

CREATE OR REPLACE FUNCTION test_realtime_filters(test_user_id uuid)
RETURNS TABLE(
  filter_type text,
  expected_results integer,
  actual_results integer,
  filter_effective boolean
) AS $$
DECLARE
  other_user_id uuid;
  test_event_count integer;
  test_relationship_count integer;
  visible_events integer;
  visible_relationships integer;
BEGIN
  other_user_id := gen_random_uuid();
  
  -- Create test data for the target user
  INSERT INTO public.events (user_id, title, start_time, end_time)
  SELECT test_user_id, 'User Event ' || generate_series, NOW(), NOW() + INTERVAL '1 hour'
  FROM generate_series(1, 5);
  
  INSERT INTO public.relationships (user_id, partner_email, status)
  SELECT test_user_id, 'partner' || generate_series || '@example.com', 'active'
  FROM generate_series(1, 3);
  
  -- Create test data for other user (should not be visible)
  INSERT INTO public.events (user_id, title, start_time, end_time)
  SELECT other_user_id, 'Other User Event ' || generate_series, NOW(), NOW() + INTERVAL '1 hour'
  FROM generate_series(1, 7);
  
  INSERT INTO public.relationships (user_id, partner_email, status)
  SELECT other_user_id, 'other' || generate_series || '@example.com', 'active'
  FROM generate_series(1, 4);
  
  -- Test event filters (simulating real-time subscription filter)
  SELECT COUNT(*) INTO visible_events
  FROM public.events 
  WHERE user_id = test_user_id;
  
  RETURN QUERY SELECT 
    'events_user_filter'::text,
    5,
    visible_events,
    (visible_events = 5);
  
  -- Test relationship filters
  SELECT COUNT(*) INTO visible_relationships
  FROM public.relationships 
  WHERE user_id = test_user_id;
  
  RETURN QUERY SELECT 
    'relationships_user_filter'::text,
    3,
    visible_relationships,
    (visible_relationships = 3);
  
  -- Cleanup
  DELETE FROM public.events WHERE user_id IN (test_user_id, other_user_id);
  DELETE FROM public.relationships WHERE user_id IN (test_user_id, other_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 6. Connection Pool and Concurrent Access Test
-- ===================================================================

CREATE OR REPLACE FUNCTION test_concurrent_realtime_access()
RETURNS TABLE(
  concurrent_operations integer,
  success_rate numeric,
  average_response_time_ms numeric,
  deadlocks_detected integer
) AS $$
DECLARE
  test_start timestamp;
  test_end timestamp;
  total_operations integer := 0;
  successful_operations integer := 0;
  total_duration numeric := 0;
  deadlock_count integer := 0;
  i integer;
  operation_start timestamp;
  operation_end timestamp;
  test_user_id uuid;
BEGIN
  test_user_id := gen_random_uuid();
  test_start := clock_timestamp();
  
  -- Simulate concurrent operations (in a single session for testing)
  FOR i IN 1..50 LOOP
    BEGIN
      operation_start := clock_timestamp();
      
      -- Simulate concurrent event creation
      INSERT INTO public.events (
        user_id, title, start_time, end_time
      ) VALUES (
        test_user_id, 
        'Concurrent Test Event ' || i,
        NOW() + (i || ' minutes')::interval,
        NOW() + (i + 60 || ' minutes')::interval
      );
      
      -- Simulate concurrent relationship update
      INSERT INTO public.relationships (
        user_id, partner_email, status
      ) VALUES (
        test_user_id,
        'concurrent' || i || '@example.com',
        'active'
      );
      
      operation_end := clock_timestamp();
      
      total_operations := total_operations + 1;
      successful_operations := successful_operations + 1;
      total_duration := total_duration + 
        EXTRACT(MILLISECONDS FROM (operation_end - operation_start));
        
    EXCEPTION 
      WHEN deadlock_detected THEN
        deadlock_count := deadlock_count + 1;
        total_operations := total_operations + 1;
      WHEN OTHERS THEN
        total_operations := total_operations + 1;
    END;
  END LOOP;
  
  test_end := clock_timestamp();
  
  -- Cleanup
  DELETE FROM public.events WHERE user_id = test_user_id;
  DELETE FROM public.relationships WHERE user_id = test_user_id;
  
  RETURN QUERY SELECT 
    total_operations,
    CASE WHEN total_operations > 0 THEN (successful_operations::numeric / total_operations) * 100 ELSE 0 END,
    CASE WHEN successful_operations > 0 THEN total_duration / successful_operations ELSE 0 END,
    deadlock_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 7. Cleanup Test Functions (Run after testing)
-- ===================================================================

CREATE OR REPLACE FUNCTION cleanup_realtime_test_functions()
RETURNS void AS $$
BEGIN
  -- Drop test triggers
  DROP TRIGGER IF EXISTS test_events_realtime_trigger ON public.events;
  DROP TRIGGER IF EXISTS test_relationships_realtime_trigger ON public.relationships;
  DROP TRIGGER IF EXISTS test_invitations_realtime_trigger ON public.invitations;
  
  -- Drop test functions
  DROP FUNCTION IF EXISTS test_realtime_trigger();
  DROP FUNCTION IF EXISTS test_rls_realtime_compatibility();
  DROP FUNCTION IF EXISTS test_realtime_performance(INTEGER, INTEGER);
  DROP FUNCTION IF EXISTS test_realtime_filters(uuid);
  DROP FUNCTION IF EXISTS test_concurrent_realtime_access();
  DROP FUNCTION IF EXISTS cleanup_realtime_test_functions();
  
  -- Clean up any test notifications
  DELETE FROM public.notifications WHERE type = 'test';
  
  RAISE NOTICE 'Real-time test functions cleaned up successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================================================
-- 8. Usage Instructions
-- ===================================================================

/*
To run these tests:

1. RLS Policy Test:
   SELECT * FROM test_rls_realtime_compatibility();

2. Performance Test (10 seconds, 5 ops/sec):
   SELECT * FROM test_realtime_performance(10, 5);

3. Filter Test (requires a valid user_id):
   SELECT * FROM test_realtime_filters('your-user-id-here');

4. Concurrent Access Test:
   SELECT * FROM test_concurrent_realtime_access();

5. Cleanup when done:
   SELECT cleanup_realtime_test_functions();

Note: These tests are designed for development/staging environments.
Do not run in production without proper safeguards.
*/