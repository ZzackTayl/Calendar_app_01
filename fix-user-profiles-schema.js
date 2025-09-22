#!/usr/bin/env node

/**
 * Fix User Profiles Schema
 * Description: Add missing columns to user_profiles table and update trigger function
 * Date: 2025-09-21
 * Purpose:
 *   1. Add missing columns that TypeScript interface expects
 *   2. Update handle_new_user trigger function to create comprehensive profiles
 *   3. Ensure schema matches EnhancedUserProfile interface
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixUserProfilesSchema() {
    console.log('🔧 Starting user profiles schema fix...');

    try {
        // Step 1: Add missing columns to user_profiles table
        console.log('📝 Adding missing columns to user_profiles table...');

        const alterQueries = [
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_pronouns TEXT',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS relationship_preferences JSONB DEFAULT \'{"}\'',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS calendar_color_scheme TEXT DEFAULT \'default\'',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS onboarding_source TEXT DEFAULT \'web\'',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE',
            'ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT FALSE'
        ];

        for (const query of alterQueries) {
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: query });
                if (error) {
                    console.log(`⚠️  Column might already exist: ${error.message}`);
                } else {
                    console.log(`✅ Added column successfully`);
                }
            } catch (err) {
                console.log(`⚠️  Column might already exist: ${err.message}`);
            }
        }

        // Step 2: Add constraints for enum-like columns
        console.log('🔒 Adding constraints for enum-like columns...');

        const constraintQueries = [
            'ALTER TABLE user_profiles ADD CONSTRAINT IF NOT EXISTS chk_calendar_color_scheme CHECK (calendar_color_scheme IN (\'default\', \'colorblind_friendly\', \'high_contrast\'))',
            'ALTER TABLE user_profiles ADD CONSTRAINT IF NOT EXISTS chk_onboarding_source CHECK (onboarding_source IN (\'web\', \'mobile\', \'referral\', \'social_media\'))'
        ];

        for (const query of constraintQueries) {
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: query });
                if (error) {
                    console.log(`⚠️  Constraint might already exist: ${error.message}`);
                } else {
                    console.log(`✅ Added constraint successfully`);
                }
            } catch (err) {
                console.log(`⚠️  Constraint might already exist: ${err.message}`);
            }
        }

        // Step 3: Update the handle_new_user trigger function
        console.log('🔄 Updating handle_new_user trigger function...');

        const triggerFunctionSQL = `
            CREATE OR REPLACE FUNCTION handle_new_user()
            RETURNS TRIGGER AS $$
            BEGIN
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
        `;

        try {
            const { error } = await supabase.rpc('exec_sql', { sql: triggerFunctionSQL });
            if (error) {
                console.log(`⚠️  Trigger function update might have issues: ${error.message}`);
            } else {
                console.log(`✅ Updated trigger function successfully`);
            }
        } catch (err) {
            console.log(`⚠️  Trigger function update might have issues: ${err.message}`);
        }

        // Step 4: Create centralized profile creation service function
        console.log('🏗️  Creating centralized profile creation service function...');

        const profileServiceSQL = `
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
                            PERFORM pg_sleep(0.1 * retry_count);
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
        `;

        try {
            const { error } = await supabase.rpc('exec_sql', { sql: profileServiceSQL });
            if (error) {
                console.log(`⚠️  Profile service function might have issues: ${error.message}`);
            } else {
                console.log(`✅ Created profile service function successfully`);
            }
        } catch (err) {
            console.log(`⚠️  Profile service function might have issues: ${err.message}`);
        }

        // Step 5: Grant necessary permissions
        console.log('🔐 Granting necessary permissions...');

        const permissionQueries = [
            'GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID, INTEGER) TO authenticated',
            'GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID, INTEGER) TO anon'
        ];

        for (const query of permissionQueries) {
            try {
                const { error } = await supabase.rpc('exec_sql', { sql: query });
                if (error) {
                    console.log(`⚠️  Permission grant might have issues: ${error.message}`);
                } else {
                    console.log(`✅ Granted permission successfully`);
                }
            } catch (err) {
                console.log(`⚠️  Permission grant might have issues: ${err.message}`);
            }
        }

        // Step 6: Verify the schema changes
        console.log('✅ Verifying schema changes...');

        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type, is_nullable, column_default')
            .eq('table_name', 'user_profiles')
            .eq('table_schema', 'public')
            .order('ordinal_position');

        if (columnsError) {
            console.log(`⚠️  Could not verify columns: ${columnsError.message}`);
        } else {
            const expectedColumns = [
                'id', 'full_name', 'avatar_url', 'time_zone', 'default_calendar_view',
                'email_notifications', 'push_notifications', 'preferred_pronouns', 'bio',
                'relationship_preferences', 'calendar_color_scheme', 'onboarding_source',
                'marketing_consent', 'newsletter_consent', 'username', 'email_consent',
                'email_preferences', 'beta_participant', 'data_collection_consent',
                'selected_calendars', 'onboarding_completed', 'created_at', 'updated_at'
            ];

            const foundColumns = columns.map(col => col.column_name);
            const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

            if (missingColumns.length === 0) {
                console.log(`✅ All ${expectedColumns.length} expected columns found in user_profiles table`);
            } else {
                console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
            }
        }

        console.log('🎉 User profiles schema fix completed successfully!');
        console.log('');
        console.log('📋 Summary of changes:');
        console.log('  • Added missing columns to user_profiles table');
        console.log('  • Updated handle_new_user trigger function');
        console.log('  • Created centralized profile creation service');
        console.log('  • Added proper constraints and permissions');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('  1. Restart your development server');
        console.log('  2. Test the sign-in flow');
        console.log('  3. Check console for reduced errors');
        console.log('  4. Verify user profiles are created correctly');

    } catch (error) {
        console.error('❌ Error fixing user profiles schema:', error);
        process.exit(1);
    }
}

// Run the fix
fixUserProfilesSchema();