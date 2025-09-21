#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[ERROR] Missing required environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('[INFO] Applying subscription tier migration...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250907000000_add_subscription_tiers.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql does not exist, fall back to manual execution
      console.log('[WARN] exec_sql not available, attempting direct migration...');
      console.log('\n[ACTION] Please run the following SQL in your Supabase SQL Editor:\n');
      console.log('='.repeat(60));
      console.log(migrationSQL);
      console.log('='.repeat(60));
      console.log('\n[INFO] After running the SQL, your subscription tiers will be set up.');
      return;
    }

    console.log('[SUCCESS] Subscription tier migration applied successfully!');

    // Verify the migration
    const { data: testProfile, error: testError } = await supabase
      .from('user_profiles')
      .select('id, subscription_tier, max_file_size_mb')
      .limit(1)
      .single();

    if (testError && testError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('[ERROR] Error verifying migration:', testError);
    } else {
      console.log('[SUCCESS] Migration verified - subscription_tier column exists.');
      if (testProfile) {
        console.log(`[INFO] Sample profile: ${testProfile.id} (${testProfile.subscription_tier})`);
      }
    }
  } catch (error) {
    console.error('[ERROR] Error applying migration:', error);
    process.exit(1);
  }
}

// Run the migration
applyMigration().then(() => {
  console.log('\n[INFO] Done!');
  console.log('\n[INFO] Next steps:');
  console.log('1. New users default to the "free" tier (3MB uploads).');
  console.log('2. To upgrade a user to premium (10MB), set subscription_tier to "premium".');
  console.log('3. The API will automatically enforce these limits.');
});
