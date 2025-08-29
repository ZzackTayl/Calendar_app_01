/**
 * Apply Database Migration Script
 * 
 * This script applies the database migration using Supabase service role key.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, serviceKey);

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.error('SQL Error:', error);
      return false;
    }
    console.log('SQL executed successfully');
    return true;
  } catch (error) {
    console.error('Execution error:', error);
    return false;
  }
}

async function applyMigration() {
  console.log('Starting database migration...\n');
  
  // Step 1: Create enum types
  console.log('STEP 1: Creating enum types...');
  const enumSQL = `
    DO $$ 
    BEGIN
        CREATE TYPE privacy_level_enum AS ENUM (
            'private',
            'visible',
            'semi_private',
            'public'
        );
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    
    DO $$ 
    BEGIN
        CREATE TYPE relationship_type_enum AS ENUM (
            'primary',
            'secondary', 
            'nesting',
            'long_distance',
            'casual',
            'friendship',
            'other'
        );
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    
    DO $$ 
    BEGIN
        CREATE TYPE event_status_enum AS ENUM (
            'confirmed',
            'tentative', 
            'cancelled'
        );
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
    
    DO $$ 
    BEGIN
        CREATE TYPE invitation_status_enum AS ENUM (
            'pending',
            'accepted',
            'declined', 
            'expired',
            'cancelled'
        );
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END $$;
  `;
  
  if (!(await executeSQL(enumSQL))) {
    console.error('Failed to create enum types');
    return false;
  }
  
  // Step 2: Add missing columns to existing tables
  console.log('\nSTEP 2: Adding missing columns...');
  const alterEventsSQL = `
    ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS user_id UUID,
    ADD COLUMN IF NOT EXISTS privacy_level privacy_level_enum DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS relationship_id UUID,
    ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6',
    ADD COLUMN IF NOT EXISTS status event_status_enum DEFAULT 'confirmed',
    ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
    ADD COLUMN IF NOT EXISTS event_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS google_calendar_id TEXT,
    ADD COLUMN IF NOT EXISTS google_event_id TEXT,
    ADD COLUMN IF NOT EXISTS caldav_uid TEXT;
  `;
  
  if (!(await executeSQL(alterEventsSQL))) {
    console.error('Failed to alter events table');
    return false;
  }
  
  const alterUsersSQL = `
    ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS time_zone TEXT DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS default_privacy_level privacy_level_enum DEFAULT 'private',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'enterprise')),
    ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS public_key TEXT;
  `;
  
  if (!(await executeSQL(alterUsersSQL))) {
    console.error('Failed to alter users table');
    return false;
  }
  
  // Step 3: Create missing tables - one at a time
  console.log('\nSTEP 3: Creating missing tables...');
  
  const tables = [
    {
      name: 'relationships',
      sql: `
        CREATE TABLE IF NOT EXISTS relationships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            partner_id UUID,
            partner_email TEXT,
            partner_name TEXT,
            group_id UUID,
            relationship_type relationship_type_enum DEFAULT 'other',
            default_privacy_level privacy_level_enum DEFAULT 'private',
            start_date DATE,
            birthday DATE,
            anniversary_date DATE,
            color TEXT DEFAULT '#3B82F6',
            notes TEXT,
            relationship_details JSONB DEFAULT '{}',
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
    },
    {
      name: 'user_preferences',
      sql: `
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
        );`
    }
  ];
  
  for (const table of tables) {
    console.log(`Creating ${table.name} table...`);
    if (!(await executeSQL(table.sql))) {
      console.error(`Failed to create ${table.name} table`);
      return false;
    }
  }
  
  console.log('\n✅ Database migration completed successfully!');
  return true;
}

// Run the migration
applyMigration()
  .then(success => {
    if (success) {
      console.log('🎉 Migration applied successfully');
      process.exit(0);
    } else {
      console.log('❌ Migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Migration failed with error:', error);
    process.exit(1);
  });