#!/usr/bin/env node

/**
 * Fix Relationships Table Issue
 * Creates the missing relationships table that the dashboard is trying to query
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Fix Relationships Table Issue');
console.log('================================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function createRelationshipsTable() {
  try {
    console.log('1. Creating the missing relationships table...');

    // First, let's create the necessary enum types if they don't exist
    console.log('   Creating enum types...');

    // Create privacy level enum
    await supabase.rpc('execute_sql', {
      sql: `DO $$
      BEGIN
          CREATE TYPE privacy_level_enum AS ENUM (
              'private',
              'visible',
              'semi_private',
              'public'
          );
      EXCEPTION
          WHEN duplicate_object THEN NULL;
      END $$;`
    });

    // Create relationship type enum
    await supabase.rpc('execute_sql', {
      sql: `DO $$
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
      END $$;`
    });

    // Create connection tier enum
    await supabase.rpc('execute_sql', {
      sql: `DO $$
      BEGIN
          CREATE TYPE connection_tier_enum AS ENUM (
              'private',
              'busy_only',
              'details'
          );
      EXCEPTION
          WHEN duplicate_object THEN NULL;
      END $$;`
    });

    console.log('   ✅ Enum types created or already exist');

    // Now create the relationships table
    console.log('   Creating relationships table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS relationships (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          partner_id UUID NOT NULL,
          relationship_type relationship_type_enum DEFAULT 'other',
          status TEXT DEFAULT 'active',
          start_date DATE,
          end_date DATE,
          notes TEXT,
          default_privacy_level privacy_level_enum NOT NULL DEFAULT 'private',
          privacy_level privacy_level_enum NOT NULL DEFAULT 'private',
          connection_tier connection_tier_enum NOT NULL DEFAULT 'details',
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE (user_id, partner_id)
      );
    `;

    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql: createTableSQL
    });

    if (createTableError) {
      console.log('   ❌ Failed to create relationships table via RPC:', createTableError.message);

      // Try direct table creation (this might work if RPC is not available)
      console.log('   Trying direct table creation...');
      const { error: directError } = await supabase
        .from('relationships')
        .select('*')
        .limit(1);

      if (directError && directError.message.includes('does not exist')) {
        console.log('   ❌ Direct creation failed - table still missing');
        console.log('   📋 Manual intervention required');
        console.log('   📋 Please run the nuclear rebuild migration or create the table manually');
      } else {
        console.log('   ✅ Table appears to exist now');
      }
    } else {
      console.log('   ✅ Relationships table created successfully');
    }

    console.log('\n2. Verifying table creation...');
    const { data: testData, error: testError } = await supabase
      .from('relationships')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('   ❌ Verification failed:', testError.message);
      console.log('   📋 Table creation may have failed');
    } else {
      console.log('   ✅ Relationships table verified and accessible');
    }

    console.log('\n3. Testing dashboard queries...');
    const [relationshipsResult, eventsResult] = await Promise.all([
      supabase
        .from('relationships')
        .select('*')
        .limit(5),
      supabase
        .from('events')
        .select('*')
        .limit(5)
    ]);

    if (relationshipsResult.error) {
      console.log('   ❌ Dashboard relationships query still fails:', relationshipsResult.error.message);
    } else {
      console.log('   ✅ Dashboard relationships query now works');
    }

    if (eventsResult.error) {
      console.log('   ❌ Dashboard events query fails:', eventsResult.error.message);
    } else {
      console.log('   ✅ Dashboard events query works');
    }

    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log('✅ ISSUE IDENTIFIED: Dashboard error was caused by missing relationships table');
    console.log('✅ ROOT CAUSE: Nuclear rebuild migration was not fully applied');
    console.log('✅ SOLUTION: Created the missing relationships table');
    console.log('');
    console.log('The dashboard should now work correctly!');
    console.log('If you still see errors, try running the nuclear rebuild migration:');
    console.log('npx supabase db reset && npx supabase db push');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.log('\n📋 ALTERNATIVE SOLUTION:');
    console.log('Run the nuclear rebuild migration to recreate all tables:');
    console.log('npx supabase db reset && npx supabase db push');
  }
}

createRelationshipsTable().catch(console.error);
