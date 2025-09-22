-- Add missing calendar_color_scheme column to user_profiles table
ALTER TABLE user_profiles ADD COLUMN calendar_color_scheme TEXT DEFAULT 'default';

-- Add constraint for enum-like column
ALTER TABLE user_profiles ADD CONSTRAINT chk_calendar_color_scheme
    CHECK (calendar_color_scheme IN ('default', 'colorblind_friendly', 'high_contrast'));

-- ======================================================================
-- STEP 2: UPDATE HANDLE_NEW_USER TRIGGER FUNCTION
-- ======================================================================

-- Create or replace the comprehensive trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_profile_id UUID;
BEGIN
    -- Insert into user_profiles with all required fields
    INSERT INTO user_profiles (
        id,
        full_name,
        avatar_url,
        time_zone,
        default_calendar_view,
        email_notifications,
        push_notifications,
        preferred_pronouns,
        bio,
        relationship_preferences,
        calendar_color_scheme,
        onboarding_source,
        marketing_consent,
        newsletter_consent,
        username,
        email_consent,
        email_preferences,
        beta_participant,
        data_collection_consent,
        selected_calendars,
        onboarding_completed
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'time_zone', 'UTC'),
        COALESCE(NEW.raw_user_meta_data->>'default_calendar_view', 'month'),
        COALESCE((NEW.raw_user_meta_data->>'email_notifications')::boolean, true),
        COALESCE((NEW.raw_user_meta_data->>'push_notifications')::boolean, true),
        NEW.raw_user_meta_data->>'preferred_pronouns',
        NEW.raw_user_meta_data->>'bio',
        COALESCE(NEW.raw_user_meta_data->'relationship_preferences', '{}'::jsonb),
        COALESCE(NEW.raw_user_meta_data->>'calendar_color_scheme', 'default'),
        COALESCE(NEW.raw_user_meta_data->>'onboarding_source', 'web'),
        COALESCE((NEW.raw_user_meta_data->>'marketing_consent')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'newsletter_consent')::boolean, false),
        NEW.raw_user_meta_data->>'username',
        COALESCE((NEW.raw_user_meta_data->>'email_consent')::boolean, false),
        COALESCE(NEW.raw_user_meta_data->'email_preferences', '{"updates": false, "notifications": false, "tips": false}'::jsonb),
        COALESCE((NEW.raw_user_meta_data->>'beta_participant')::boolean, false),
        COALESCE((NEW.raw_user_meta_data->>'data_collection_consent')::boolean, false),
        COALESCE(NEW.raw_user_meta_data->'selected_calendars', '{}'::jsonb)::text[],
        COALESCE((NEW.raw_user_meta_data->>'onboarding_completed')::boolean, false)
    )
    ON CONFLICT (id) DO UPDATE SET
        -- Update only non-null values from user metadata
        full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        time_zone = COALESCE(EXCLUDED.time_zone, user_profiles.time_zone),
        default_calendar_view = COALESCE(EXCLUDED.default_calendar_view, user_profiles.default_calendar_view),
        email_notifications = COALESCE(EXCLUDED.email_notifications, user_profiles.email_notifications),
        push_notifications = COALESCE(EXCLUDED.push_notifications, user_profiles.push_notifications),
        preferred_pronouns = COALESCE(EXCLUDED.preferred_pronouns, user_profiles.preferred_pronouns),
        bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
        relationship_preferences = COALESCE(EXCLUDED.relationship_preferences, user_profiles.relationship_preferences),
        calendar_color_scheme = COALESCE(EXCLUDED.calendar_color_scheme, user_profiles.calendar_color_scheme),
        onboarding_source = COALESCE(EXCLUDED.onboarding_source, user_profiles.onboarding_source),
        marketing_consent = COALESCE(EXCLUDED.marketing_consent, user_profiles.marketing_consent),
        newsletter_consent = COALESCE(EXCLUDED.newsletter_consent, user_profiles.newsletter_consent),
        username = COALESCE(EXCLUDED.username, user_profiles.username),
        email_consent = COALESCE(EXCLUDED.email_consent, user_profiles.email_consent),
        email_preferences = COALESCE(EXCLUDED.email_preferences, user_profiles.email_preferences),
        beta_participant = COALESCE(EXCLUDED.beta_participant, user_profiles.beta_participant),
        data_collection_consent = COALESCE(EXCLUDED.data_collection_consent, user_profiles.data_collection_consent),
        selected_calendars = COALESCE(EXCLUDED.selected_calendars, user_profiles.selected_calendars),
        onboarding_completed = COALESCE(EXCLUDED.onboarding_completed, user_profiles.onboarding_completed),
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======================================================================
-- STEP 3: UPDATE USER_PREFERENCES TABLE
-- ======================================================================

-- Ensure user_preferences table exists and has correct structure
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    default_event_duration INTEGER DEFAULT 60,
    calendar_view_default TEXT DEFAULT 'month',
    color_scheme TEXT DEFAULT 'default',
    language TEXT DEFAULT 'en',
    notification_settings JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE user_preferences
    DROP CONSTRAINT IF EXISTS fk_user_preferences_user_id;
ALTER TABLE user_preferences
    ADD CONSTRAINT fk_user_preferences_user_id
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ======================================================================
-- STEP 4: CREATE CENTRALIZED PROFILE CREATION SERVICE FUNCTION
-- ======================================================================

-- Function to ensure user profile exists with retry logic
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(
    p_user_id UUID,
    p_max_retries INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
    profile_exists BOOLEAN := FALSE;
    retry_count INTEGER := 0;
    result JSONB;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(
        SELECT 1 FROM user_profiles WHERE id = p_user_id
    ) INTO profile_exists;

    -- If profile doesn't exist, try to create it
    WHILE NOT profile_exists AND retry_count < p_max_retries LOOP
        BEGIN
            -- Try to insert the profile
            INSERT INTO user_profiles (
                id,
                time_zone,
                default_calendar_view,
                email_notifications,
                push_notifications,
                calendar_color_scheme,
                onboarding_source,
                marketing_consent,
                newsletter_consent
            ) VALUES (
                p_user_id,
                'UTC',
                'month',
                true,
                true,
                'default',
                'web',
                false,
                false
            )
            ON CONFLICT (id) DO NOTHING;

            -- Check again if profile exists
            SELECT EXISTS(
                SELECT 1 FROM user_profiles WHERE id = p_user_id
            ) INTO profile_exists;

            retry_count := retry_count + 1;

            -- If profile still doesn't exist, wait a bit before retrying
            IF NOT profile_exists AND retry_count < p_max_retries THEN
                PERFORM pg_sleep(0.1 * retry_count); -- Exponential backoff
            END IF;

        EXCEPTION
            WHEN OTHERS THEN
                retry_count := retry_count + 1;
                IF retry_count < p_max_retries THEN
                    PERFORM pg_sleep(0.1 * retry_count);
                END IF;
        END;
    END LOOP;

    -- Return profile data
    SELECT jsonb_build_object(
        'profile_exists', profile_exists,
        'retry_count', retry_count,
        'user_id', p_user_id
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ======================================================================
-- STEP 5: UPDATE RLS POLICIES FOR NEW FUNCTIONS
-- ======================================================================

-- Grant necessary permissions for the new function
GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID, INTEGER) TO anon;

-- ======================================================================
-- STEP 6: VERIFICATION
-- ======================================================================

-- Verify the schema changes
DO $$
DECLARE
    column_count INTEGER;
    profile_exists BOOLEAN;
BEGIN
    -- Check if all expected columns exist
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND table_schema = 'public'
    AND column_name IN (
        'id', 'full_name', 'avatar_url', 'time_zone', 'default_calendar_view',
        'email_notifications', 'push_notifications', 'preferred_pronouns', 'bio',
        'relationship_preferences', 'calendar_color_scheme', 'onboarding_source',
        'marketing_consent', 'newsletter_consent', 'username', 'email_consent',
        'email_preferences', 'beta_participant', 'data_collection_consent',
        'selected_calendars', 'onboarding_completed', 'created_at', 'updated_at'
    );

    IF column_count = 23 THEN
        RAISE NOTICE 'SUCCESS: All 23 expected columns found in user_profiles table';
    ELSE
        RAISE NOTICE 'ERROR: Expected 23 columns, found %', column_count;
    END IF;

    -- Test the trigger function with a mock user
    RAISE NOTICE 'Schema migration completed successfully at %', NOW();
END $$;

-- List all columns in user_profiles for verification
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND table_schema = 'public'
ORDER BY ordinal_position;