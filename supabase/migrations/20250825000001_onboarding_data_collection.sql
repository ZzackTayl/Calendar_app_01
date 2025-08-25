-- Migration: Onboarding Data Collection
-- Description: Adds comprehensive onboarding data storage and user profile completion tracking
-- This migration adds tables and fields needed for onboarding flow data collection

-- ===================================================================
-- ONBOARDING DATA COLLECTION TABLES
-- ===================================================================

-- Onboarding preferences and completion tracking
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE, -- Maps to Supabase auth.users.id
    
    -- Onboarding completion tracking
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMPTZ,
    onboarding_step INTEGER DEFAULT 0, -- Current step in onboarding process
    
    -- Basic preferences collected during onboarding
    relationship_style TEXT, -- 'polyamorous', 'relationship_anarchy', 'swinging', 'other'
    custom_relationship_style TEXT, -- If 'other' is selected
    primary_use_case TEXT, -- 'schedule_coordination', 'privacy_management', 'communication', 'all'
    
    -- Privacy preferences
    default_privacy_preference TEXT DEFAULT 'limited_access'
        CHECK (default_privacy_preference IN ('full_access', 'limited_access', 'busy_only', 'hidden')),
    allow_partner_calendar_sync BOOLEAN DEFAULT FALSE,
    
    -- Communication preferences
    email_notifications_onboarding BOOLEAN DEFAULT TRUE,
    calendar_reminders_onboarding BOOLEAN DEFAULT TRUE,
    partner_request_notifications BOOLEAN DEFAULT TRUE,
    
    -- Beta testing consent
    beta_testing_consent BOOLEAN DEFAULT FALSE,
    beta_feedback_consent BOOLEAN DEFAULT FALSE,
    anonymous_usage_analytics BOOLEAN DEFAULT FALSE,
    
    -- Calendar integration preferences
    wants_google_calendar_sync BOOLEAN DEFAULT FALSE,
    wants_apple_calendar_sync BOOLEAN DEFAULT FALSE,
    wants_outlook_calendar_sync BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_completed ON user_onboarding(onboarding_completed);

-- ===================================================================
-- ENHANCED USER PROFILES FOR ONBOARDING
-- ===================================================================

-- Add onboarding-specific fields to user_profiles table
ALTER TABLE IF EXISTS user_profiles 
ADD COLUMN IF NOT EXISTS preferred_pronouns TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS relationship_preferences JSONB, -- Flexible storage for relationship preferences
ADD COLUMN IF NOT EXISTS calendar_color_scheme TEXT DEFAULT 'default', -- 'default', 'colorblind_friendly', 'high_contrast'
ADD COLUMN IF NOT EXISTS onboarding_source TEXT, -- 'web', 'mobile', 'referral', 'social_media'
ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT FALSE;

-- ===================================================================
-- ONBOARDING CALENDAR INTEGRATION PREPARATION
-- ===================================================================

-- Store OAuth setup preferences and status
CREATE TABLE IF NOT EXISTS calendar_integration_setup (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Integration preferences
    google_calendar_requested BOOLEAN DEFAULT FALSE,
    google_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    google_calendar_setup_completed_at TIMESTAMPTZ,
    
    apple_calendar_requested BOOLEAN DEFAULT FALSE,
    apple_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    apple_calendar_setup_completed_at TIMESTAMPTZ,
    
    outlook_calendar_requested BOOLEAN DEFAULT FALSE,
    outlook_calendar_setup_completed BOOLEAN DEFAULT FALSE,
    outlook_calendar_setup_completed_at TIMESTAMPTZ,
    
    -- Setup status and error tracking
    setup_status TEXT DEFAULT 'pending' -- 'pending', 'in_progress', 'completed', 'failed'
        CHECK (setup_status IN ('pending', 'in_progress', 'completed', 'failed')),
    setup_error_message TEXT,
    setup_retry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_integration_setup_user_id ON calendar_integration_setup(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_integration_setup_status ON calendar_integration_setup(setup_status);

-- ===================================================================
-- ONBOARDING EMAIL PREFERENCES
-- ===================================================================

-- Detailed email preferences collected during onboarding
CREATE TABLE IF NOT EXISTS user_email_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Email notification types
    welcome_emails BOOLEAN DEFAULT TRUE,
    event_reminders BOOLEAN DEFAULT TRUE,
    partner_requests BOOLEAN DEFAULT TRUE,
    schedule_conflicts BOOLEAN DEFAULT TRUE,
    app_updates BOOLEAN DEFAULT TRUE,
    
    -- Marketing and communication
    product_updates BOOLEAN DEFAULT FALSE,
    feature_announcements BOOLEAN DEFAULT FALSE,
    community_updates BOOLEAN DEFAULT FALSE,
    research_participation BOOLEAN DEFAULT FALSE,
    
    -- Frequency preferences
    reminder_frequency TEXT DEFAULT 'daily' -- 'immediate', 'daily', 'weekly', 'none'
        CHECK (reminder_frequency IN ('immediate', 'daily', 'weekly', 'none')),
    digest_frequency TEXT DEFAULT 'weekly' -- 'daily', 'weekly', 'monthly', 'none'
        CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'none')),
    
    -- Delivery preferences
    email_delivery_time TIME DEFAULT '09:00:00', -- Preferred time for non-urgent emails
    timezone_for_emails TEXT DEFAULT 'UTC',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_email_preferences_user_id ON user_email_preferences(user_id);

-- ===================================================================
-- ONBOARDING ANALYTICS AND FEEDBACK
-- ===================================================================

-- Track onboarding flow analytics for improvement
CREATE TABLE IF NOT EXISTS onboarding_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- Flow tracking
    step_name TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    time_spent_seconds INTEGER, -- Time spent on this step
    
    -- User interaction data
    action_taken TEXT, -- 'completed', 'skipped', 'abandoned', 'error'
    error_message TEXT,
    user_agent TEXT,
    ip_address INET,
    
    -- A/B testing support
    variant_id TEXT, -- For testing different onboarding flows
    cohort_id TEXT, -- For grouping users for analysis
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_user_id ON onboarding_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_step ON onboarding_analytics(step_name, step_number);
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created_at ON onboarding_analytics(created_at);

-- ===================================================================
-- BETA TESTING CONSENT TRACKING
-- ===================================================================

-- Track detailed beta testing consent and preferences
CREATE TABLE IF NOT EXISTS beta_testing_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    
    -- Consent levels
    general_beta_consent BOOLEAN DEFAULT FALSE,
    crash_reporting_consent BOOLEAN DEFAULT FALSE,
    feature_usage_tracking BOOLEAN DEFAULT FALSE,
    feedback_surveys_consent BOOLEAN DEFAULT FALSE,
    user_interviews_consent BOOLEAN DEFAULT FALSE,
    
    -- Contact preferences for beta testing
    contact_email TEXT,
    contact_phone TEXT,
    preferred_contact_method TEXT DEFAULT 'email' -- 'email', 'phone', 'app_notification'
        CHECK (preferred_contact_method IN ('email', 'phone', 'app_notification')),
    
    -- Availability for testing
    available_weekdays BOOLEAN DEFAULT TRUE,
    available_weekends BOOLEAN DEFAULT FALSE,
    available_evenings BOOLEAN DEFAULT TRUE,
    timezone_for_contact TEXT DEFAULT 'UTC',
    
    -- Consent timestamps for compliance
    consented_at TIMESTAMPTZ DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beta_testing_consent_user_id ON beta_testing_consent(user_id);
CREATE INDEX IF NOT EXISTS idx_beta_testing_consent_active ON beta_testing_consent(general_beta_consent) WHERE general_beta_consent = TRUE;

-- ===================================================================
-- TRIGGERS FOR UPDATED_AT
-- ===================================================================

-- Add triggers for the new tables
DO $$ BEGIN
    CREATE TRIGGER trg_user_onboarding_updated
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_calendar_integration_setup_updated
    BEFORE UPDATE ON calendar_integration_setup
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_user_email_preferences_updated
    BEFORE UPDATE ON user_email_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_beta_testing_consent_updated
    BEFORE UPDATE ON beta_testing_consent
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===================================================================
-- HELPER FUNCTIONS FOR ONBOARDING
-- ===================================================================

-- Function to initialize default onboarding record for new users
CREATE OR REPLACE FUNCTION create_default_onboarding_record(user_id_param UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_onboarding (user_id)
    VALUES (user_id_param)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO user_email_preferences (user_id)
    VALUES (user_id_param)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO calendar_integration_setup (user_id)
    VALUES (user_id_param)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO beta_testing_consent (user_id)
    VALUES (user_id_param)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to check onboarding completion status
CREATE OR REPLACE FUNCTION get_onboarding_completion_status(user_id_param UUID)
RETURNS TABLE (
    onboarding_completed BOOLEAN,
    onboarding_step INTEGER,
    missing_steps TEXT[]
) AS $$
DECLARE
    user_onboarding_rec RECORD;
    missing_steps_array TEXT[] := '{}';
BEGIN
    SELECT * INTO user_onboarding_rec
    FROM user_onboarding 
    WHERE user_id = user_id_param;
    
    IF user_onboarding_rec IS NULL THEN
        -- Create default record if it doesn't exist
        PERFORM create_default_onboarding_record(user_id_param);
        RETURN QUERY SELECT FALSE, 0, ARRAY['profile_setup', 'preferences', 'relationships'];
    END IF;
    
    -- Check what steps are still needed
    IF user_onboarding_rec.relationship_style IS NULL THEN
        missing_steps_array := array_append(missing_steps_array, 'relationship_style');
    END IF;
    
    IF user_onboarding_rec.primary_use_case IS NULL THEN
        missing_steps_array := array_append(missing_steps_array, 'primary_use_case');
    END IF;
    
    -- Return the current status
    RETURN QUERY SELECT 
        user_onboarding_rec.onboarding_completed,
        user_onboarding_rec.onboarding_step,
        missing_steps_array;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================
-- COMMENTS FOR DOCUMENTATION
-- ===================================================================
COMMENT ON TABLE user_onboarding IS 'Stores onboarding preferences and completion tracking for users';
COMMENT ON TABLE calendar_integration_setup IS 'Tracks calendar integration setup preferences and status';
COMMENT ON TABLE user_email_preferences IS 'Detailed email notification preferences collected during onboarding';
COMMENT ON TABLE onboarding_analytics IS 'Analytics data for improving the onboarding flow';
COMMENT ON TABLE beta_testing_consent IS 'Beta testing consent and contact preferences';

COMMENT ON FUNCTION create_default_onboarding_record IS 'Creates default onboarding records for new users';
COMMENT ON FUNCTION get_onboarding_completion_status IS 'Returns onboarding completion status and missing steps';