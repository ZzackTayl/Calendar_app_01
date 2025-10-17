-- ======================================================================
-- MyOrbit Database Schema Validation Script
-- ======================================================================
-- Run this script to verify all migrations were applied correctly
-- Usage: Copy and run in Supabase Dashboard > SQL Editor

-- Set search path
SET search_path TO public;

-- ======================================================================
-- 1. CHECK ALL TABLES EXIST
-- ======================================================================

DO $$
DECLARE
  v_required_tables TEXT[] := ARRAY[
    'profiles',
    'contacts',
    'calendars',
    'calendar_visibility',
    'recurrence_rules',
    'events',
    'event_invites',
    'availability_signals',
    'signal_shares',
    'signal_timeline_entries',
    'notifications'
  ];
  v_table TEXT;
  v_missing_tables TEXT[] := '{}';
BEGIN
  RAISE NOTICE '=== Checking Tables ===';
  
  FOREACH v_table IN ARRAY v_required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
    END IF;
  END LOOP;
  
  IF array_length(v_missing_tables, 1) IS NOT NULL THEN
    RAISE WARNING 'Missing tables: %', array_to_string(v_missing_tables, ', ');
  ELSE
    RAISE NOTICE 'All % tables exist!', array_length(v_required_tables, 1);
  END IF;
END $$;

-- ======================================================================
-- 2. CHECK RLS IS ENABLED
-- ======================================================================

DO $$
DECLARE
  v_table RECORD;
  v_tables_without_rls TEXT[] := '{}';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking RLS ===';
  
  FOR v_table IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles', 'contacts', 'calendars', 'calendar_visibility',
        'recurrence_rules', 'events', 'event_invites',
        'availability_signals', 'signal_shares',
        'signal_timeline_entries', 'notifications'
      )
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = v_table.tablename
        AND rowsecurity = TRUE
    ) THEN
      v_tables_without_rls := array_append(v_tables_without_rls, v_table.tablename);
    END IF;
  END LOOP;
  
  IF array_length(v_tables_without_rls, 1) IS NOT NULL THEN
    RAISE WARNING 'Tables without RLS: %', array_to_string(v_tables_without_rls, ', ');
  ELSE
    RAISE NOTICE 'All tables have RLS enabled!';
  END IF;
END $$;

-- ======================================================================
-- 3. CHECK FUNCTIONS EXIST
-- ======================================================================

DO $$
DECLARE
  v_required_functions TEXT[] := ARRAY[
    'set_updated_at',
    'get_user_events',
    'compute_availability',
    'sync_signal_timeline',
    'get_partner_availability',
    'expire_old_signals',
    'create_notification',
    'handle_new_signal'
  ];
  v_function TEXT;
  v_missing_functions TEXT[] := '{}';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Functions ===';
  
  FOREACH v_function IN ARRAY v_required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = v_function
        AND pronamespace = 'public'::regnamespace
    ) THEN
      v_missing_functions := array_append(v_missing_functions, v_function);
    END IF;
  END LOOP;
  
  IF array_length(v_missing_functions, 1) IS NOT NULL THEN
    RAISE WARNING 'Missing functions: %', array_to_string(v_missing_functions, ', ');
  ELSE
    RAISE NOTICE 'All % functions exist!', array_length(v_required_functions, 1);
  END IF;
END $$;

-- ======================================================================
-- 4. CHECK INDEXES EXIST
-- ======================================================================

DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Indexes ===';
  
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Total indexes: %', v_index_count;
  
  -- Check critical indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_owner_idx') THEN
    RAISE WARNING 'Missing critical index: events_owner_idx';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_time_range_idx') THEN
    RAISE WARNING 'Missing critical index: events_time_range_idx';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'contacts_owner_idx') THEN
    RAISE WARNING 'Missing critical index: contacts_owner_idx';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'events_reschedule_status_idx') THEN
    RAISE WARNING 'Missing critical index: events_reschedule_status_idx';
  END IF;
END $$;

-- ======================================================================
-- 5. CHECK TRIGGERS EXIST
-- ======================================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Triggers ===';
  
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table IN (
      'profiles', 'contacts', 'calendars', 'calendar_visibility',
      'recurrence_rules', 'events', 'availability_signals'
    );
  
  RAISE NOTICE 'Total triggers: %', v_trigger_count;
  
  -- Check for updated_at triggers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'events_set_updated_at'
  ) THEN
    RAISE WARNING 'Missing trigger: events_set_updated_at';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_availability_signal_created'
  ) THEN
    RAISE WARNING 'Missing trigger: on_availability_signal_created';
  END IF;
END $$;

-- ======================================================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ======================================================================

DO $$
DECLARE
  v_fk_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking Foreign Keys ===';
  
  SELECT COUNT(*) INTO v_fk_count
  FROM information_schema.table_constraints
  WHERE constraint_schema = 'public'
    AND constraint_type = 'FOREIGN KEY';
  
  RAISE NOTICE 'Total foreign keys: %', v_fk_count;
  
  -- Check critical FKs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'events'
      AND constraint_type = 'FOREIGN KEY'
  ) THEN
    RAISE WARNING 'Events table missing foreign keys!';
  END IF;
END $$;

-- ======================================================================
-- 7. CHECK EVENTS RESCHEDULE WORKFLOW COLUMN
-- ======================================================================

DO $$
DECLARE
  v_column_exists BOOLEAN;
  v_default TEXT;
  v_check_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Checking events.reschedule_status column ===';

  SELECT TRUE INTO v_column_exists
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'reschedule_status';

  IF COALESCE(v_column_exists, FALSE) = FALSE THEN
    RAISE WARNING 'Column events.reschedule_status is missing';
    RETURN;
  END IF;

  SELECT column_default INTO v_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'events'
    AND column_name = 'reschedule_status';

  RAISE NOTICE 'Default value: %', v_default;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND contype = 'c'
      AND conname LIKE 'events_reschedule_status_check%'
  )
  INTO v_check_exists;

  IF NOT v_check_exists THEN
    RAISE WARNING 'Missing CHECK constraint for events.reschedule_status';
  ELSE
    RAISE NOTICE 'Reschedule status CHECK constraint present.';
  END IF;
END $$;

-- ======================================================================
-- 8. TEST DATA INSERTION (OPTIONAL)
-- ======================================================================

DO $$
DECLARE
  v_test_user_id UUID := '00000000-0000-0000-0000-000000000001';
  v_test_calendar_id UUID;
  v_test_event_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Testing Data Insertion (DRY RUN) ===';
  
  -- This is a dry run - we'll rollback at the end
  BEGIN
    -- Insert test profile
    INSERT INTO profiles (id, email, display_name, created_at, updated_at)
    VALUES (
      v_test_user_id,
      'test-validation@myorbit.example',
      'Validation Test User',
      NOW(),
      NOW()
    );
    RAISE NOTICE 'Profile insert: OK';
    
    -- Insert test calendar
    INSERT INTO calendars (owner_id, name, is_primary)
    VALUES (v_test_user_id, 'Test Calendar', TRUE)
    RETURNING id INTO v_test_calendar_id;
    RAISE NOTICE 'Calendar insert: OK';
    
    -- Insert test event
    INSERT INTO events (
      owner_id,
      calendar_id,
      title,
      start,
      "end",
      privacy_level
    )
    VALUES (
      v_test_user_id,
      'primary',
      'Test Event',
      NOW(),
      NOW() + INTERVAL '1 hour',
      'normal'
    )
    RETURNING id INTO v_test_event_id;
    RAISE NOTICE 'Event insert: OK';
    
    -- Query event back
    IF EXISTS (
      SELECT 1 FROM events
      WHERE id = v_test_event_id
        AND owner_id = v_test_user_id
    ) THEN
      RAISE NOTICE 'Event query: OK';
    ELSE
      RAISE WARNING 'Event query failed!';
    END IF;
    
    -- Rollback test data
    RAISE EXCEPTION 'Rolling back test data (this is intentional)';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Test data rolled back successfully';
  END;
END $$;

-- ======================================================================
-- 9. SUMMARY
-- ======================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '  Schema Validation Complete!';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Review the output above for any WARNINGS.';
  RAISE NOTICE 'If no warnings, your schema is ready! 🎉';
  RAISE NOTICE '';
END $$;

-- ======================================================================
-- BONUS: Display Table Sizes
-- ======================================================================

SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) AS total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
