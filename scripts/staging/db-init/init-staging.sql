-- PolyHarmony Staging Database Initialization
-- Sets up staging-specific database configurations and test data

-- Create staging-specific extensions if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create staging schema for utilities
CREATE SCHEMA IF NOT EXISTS staging_utils;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA staging_utils TO postgres;

-- Create staging-specific functions
CREATE OR REPLACE FUNCTION staging_utils.generate_test_user(
    p_email TEXT DEFAULT NULL,
    p_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    user_id UUID;
    test_email TEXT;
    test_name TEXT;
BEGIN
    -- Generate test data if not provided
    test_email := COALESCE(p_email, 'test_user_' || gen_random_uuid()::TEXT || '@example.com');
    test_name := COALESCE(p_name, 'Test User ' || (random() * 1000)::INTEGER);

    -- Insert test user
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        gen_random_uuid(),
        test_email,
        crypt('test_password_123', gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', test_name),
        FALSE,
        'authenticated'
    ) RETURNING id INTO user_id;

    -- Create corresponding profile
    INSERT INTO profiles (
        id,
        email,
        full_name,
        bio,
        location,
        time_zone,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        test_email,
        test_name,
        'Test user created for staging environment',
        'Test City, Test State',
        'America/New_York',
        NOW(),
        NOW()
    );

    RETURN user_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate test events
CREATE OR REPLACE FUNCTION staging_utils.generate_test_event(
    p_user_id UUID,
    p_title TEXT DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    event_id UUID;
    test_title TEXT;
    start_time TIMESTAMPTZ;
BEGIN
    -- Generate test data if not provided
    test_title := COALESCE(p_title, 'Test Event ' || (random() * 1000)::INTEGER);
    start_time := COALESCE(p_start_date, NOW() + INTERVAL '1 day' * (random() * 30));

    -- Insert test event
    INSERT INTO events (
        id,
        user_id,
        title,
        description,
        start_time,
        end_time,
        location,
        event_type,
        privacy_level,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        p_user_id,
        test_title,
        'This is a test event created for staging environment testing',
        start_time,
        start_time + INTERVAL '1 hour',
        'Test Location',
        'personal',
        'private',
        NOW(),
        NOW()
    ) RETURNING id INTO event_id;

    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Create data anonymization function
CREATE OR REPLACE FUNCTION staging_utils.anonymize_sensitive_data() RETURNS VOID AS $$
BEGIN
    -- Anonymize user emails (except test users)
    UPDATE profiles SET
        email = 'user_' || id::TEXT || '@example.com'
    WHERE email NOT LIKE '%@example.com'
      AND email NOT LIKE '%@test.com';

    -- Anonymize phone numbers
    UPDATE profiles SET
        phone = '+1555' || LPAD((random() * 9999999)::INTEGER::TEXT, 7, '0')
    WHERE phone IS NOT NULL;

    -- Remove avatar URLs
    UPDATE profiles SET
        avatar_url = NULL
    WHERE avatar_url IS NOT NULL;

    -- Anonymize event titles and descriptions
    UPDATE events SET
        title = CASE
            WHEN title ILIKE '%private%' OR title ILIKE '%personal%' THEN 'Private Event'
            ELSE 'Test Event ' || id
        END,
        description = 'Anonymized event description for staging',
        location = COALESCE('Test Location ' || (random() * 10)::INTEGER, location)
    WHERE created_at < NOW() - INTERVAL '1 hour'; -- Only anonymize older events

    -- Anonymize relationship notes
    UPDATE relationships SET
        notes = 'Anonymized relationship notes for staging'
    WHERE notes IS NOT NULL;

    -- Log anonymization
    INSERT INTO staging_utils.anonymization_log (
        anonymized_at,
        tables_affected,
        records_affected
    ) VALUES (
        NOW(),
        ARRAY['profiles', 'events', 'relationships'],
        (SELECT COUNT(*) FROM profiles) +
        (SELECT COUNT(*) FROM events) +
        (SELECT COUNT(*) FROM relationships)
    );

    RAISE NOTICE 'Data anonymization completed for staging environment';
END;
$$ LANGUAGE plpgsql;

-- Create anonymization log table
CREATE TABLE IF NOT EXISTS staging_utils.anonymization_log (
    id SERIAL PRIMARY KEY,
    anonymized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tables_affected TEXT[] NOT NULL,
    records_affected INTEGER NOT NULL,
    notes TEXT
);

-- Create test data generation function
CREATE OR REPLACE FUNCTION staging_utils.populate_test_data() RETURNS VOID AS $$
DECLARE
    test_user_1 UUID;
    test_user_2 UUID;
    test_user_3 UUID;
BEGIN
    -- Create test users
    test_user_1 := staging_utils.generate_test_user(
        'alice@example.com',
        'Alice Johnson'
    );

    test_user_2 := staging_utils.generate_test_user(
        'bob@example.com',
        'Bob Smith'
    );

    test_user_3 := staging_utils.generate_test_user(
        'carol@example.com',
        'Carol Williams'
    );

    -- Create test events for each user
    PERFORM staging_utils.generate_test_event(
        test_user_1,
        'Alice Test Meeting',
        NOW() + INTERVAL '2 days'
    );

    PERFORM staging_utils.generate_test_event(
        test_user_2,
        'Bob Test Appointment',
        NOW() + INTERVAL '3 days'
    );

    PERFORM staging_utils.generate_test_event(
        test_user_3,
        'Carol Test Event',
        NOW() + INTERVAL '4 days'
    );

    -- Create test relationship
    INSERT INTO relationships (
        id,
        user_id,
        partner_id,
        relationship_type,
        status,
        color,
        notes,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        test_user_1,
        test_user_2,
        'partner',
        'active',
        '#FF6B6B',
        'Test relationship for staging environment',
        NOW(),
        NOW()
    );

    RAISE NOTICE 'Test data populated successfully';
END;
$$ LANGUAGE plpgsql;

-- Create staging environment health check
CREATE OR REPLACE FUNCTION staging_utils.health_check() RETURNS TABLE(
    component TEXT,
    status TEXT,
    details JSONB
) AS $$
BEGIN
    -- Check database connectivity
    RETURN QUERY SELECT
        'database'::TEXT,
        'healthy'::TEXT,
        jsonb_build_object(
            'connected', true,
            'timestamp', NOW(),
            'version', version()
        );

    -- Check table counts
    RETURN QUERY SELECT
        'data_integrity'::TEXT,
        CASE
            WHEN (SELECT COUNT(*) FROM profiles) > 0 THEN 'healthy'
            ELSE 'warning'
        END::TEXT,
        jsonb_build_object(
            'profiles_count', (SELECT COUNT(*) FROM profiles),
            'events_count', (SELECT COUNT(*) FROM events),
            'relationships_count', (SELECT COUNT(*) FROM relationships)
        );

    -- Check for test users
    RETURN QUERY SELECT
        'test_data'::TEXT,
        CASE
            WHEN (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@example.com') > 0 THEN 'healthy'
            ELSE 'warning'
        END::TEXT,
        jsonb_build_object(
            'test_users_count', (SELECT COUNT(*) FROM profiles WHERE email LIKE '%@example.com'),
            'last_anonymization', (SELECT MAX(anonymized_at) FROM staging_utils.anonymization_log)
        );
END;
$$ LANGUAGE plpgsql;

-- Create staging configuration table
CREATE TABLE IF NOT EXISTS staging_utils.configuration (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default staging configuration
INSERT INTO staging_utils.configuration (key, value, description) VALUES
    ('environment', '"staging"', 'Environment identifier'),
    ('auto_anonymize', 'true', 'Automatically anonymize data on startup'),
    ('test_data_enabled', 'true', 'Enable test data generation'),
    ('max_test_users', '10', 'Maximum number of test users to create'),
    ('cleanup_interval_days', '30', 'Days to keep old test data')
ON CONFLICT (key) DO UPDATE SET
    updated_at = NOW();

-- Set up automated cleanup job (using pg_cron if available)
DO $$
BEGIN
    -- Only create if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule daily cleanup at 2 AM
        PERFORM cron.schedule(
            'staging-cleanup',
            '0 2 * * *',
            'SELECT staging_utils.cleanup_old_data();'
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- pg_cron not available, skip scheduling
    RAISE NOTICE 'pg_cron extension not available, skipping automated cleanup scheduling';
END;
$$;

-- Create cleanup function
CREATE OR REPLACE FUNCTION staging_utils.cleanup_old_data() RETURNS VOID AS $$
DECLARE
    cleanup_days INTEGER;
BEGIN
    -- Get cleanup interval from configuration
    SELECT (value::TEXT)::INTEGER INTO cleanup_days
    FROM staging_utils.configuration
    WHERE key = 'cleanup_interval_days';

    cleanup_days := COALESCE(cleanup_days, 30);

    -- Clean up old test events
    DELETE FROM events
    WHERE created_at < NOW() - INTERVAL '1 day' * cleanup_days
      AND title LIKE 'Test Event%';

    -- Clean up old anonymization logs
    DELETE FROM staging_utils.anonymization_log
    WHERE anonymized_at < NOW() - INTERVAL '1 day' * cleanup_days;

    -- Log cleanup
    RAISE NOTICE 'Staging cleanup completed for data older than % days', cleanup_days;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for staging utilities
GRANT USAGE ON SCHEMA staging_utils TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA staging_utils TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA staging_utils TO postgres;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA staging_utils TO postgres;

-- Initial message
DO $$
BEGIN
    RAISE NOTICE 'PolyHarmony staging database initialization completed successfully';
    RAISE NOTICE 'Available staging utilities:';
    RAISE NOTICE '  - staging_utils.generate_test_user()';
    RAISE NOTICE '  - staging_utils.generate_test_event()';
    RAISE NOTICE '  - staging_utils.anonymize_sensitive_data()';
    RAISE NOTICE '  - staging_utils.populate_test_data()';
    RAISE NOTICE '  - staging_utils.health_check()';
    RAISE NOTICE '  - staging_utils.cleanup_old_data()';
END;
$$;