#!/usr/bin/env node

/**
 * Script to apply the group permissions fix migration to Supabase
 * 
 * Usage:
 *   npm run fix:group-permissions
 *   
 * Or directly:
 *   node scripts/apply-group-permissions-fix.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  console.error('\nPlease check your .env.local file.');
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Starting group permissions fix migration...\n');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  // Read migration SQL
  const migrationPath = path.join(__dirname, '..', 'migrations', 'fix-group-permissions-comprehensive.sql');
  let migrationSQL;
  
  try {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Loaded migration file from:', migrationPath);
  } catch (error) {
    console.error('❌ Failed to read migration file:', error.message);
    process.exit(1);
  }

  // Execute migration
  console.log('\n📝 Executing migration...\n');
  
  try {
    // Note: Supabase doesn't support multi-statement SQL through the JS client
    // So we need to execute this through the Supabase Dashboard SQL Editor
    // or use the Supabase CLI
    
    console.log('⚠️  Important: This migration needs to be run through one of these methods:\n');
    console.log('Option 1: Supabase Dashboard');
    console.log('  1. Go to your Supabase project dashboard');
    console.log('  2. Navigate to the SQL Editor');
    console.log('  3. Copy and paste the contents of:');
    console.log(`     ${migrationPath}`);
    console.log('  4. Click "Run" to execute the migration\n');
    
    console.log('Option 2: Supabase CLI');
    console.log('  1. Make sure Supabase CLI is installed');
    console.log('  2. Run the following command:');
    console.log(`     supabase db push --file ${migrationPath}\n`);
    
    console.log('Option 3: Direct Database Connection');
    console.log('  1. Connect to your database using psql or another PostgreSQL client');
    console.log('  2. Execute the migration file:\n');
    console.log(`     psql -h YOUR_DB_HOST -U YOUR_DB_USER -d YOUR_DB_NAME -f ${migrationPath}\n`);
    
    // For now, let's at least verify the current state
    console.log('📊 Checking current database state...\n');
    
    // Check if group_member_permissions table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'group_member_permissions')
      .single();
    
    if (tableError && tableError.code !== 'PGRST116') {
      console.log('❓ Could not check for group_member_permissions table');
    } else if (tables) {
      console.log('✅ group_member_permissions table already exists');
    } else {
      console.log('⚠️  group_member_permissions table does not exist - migration needed');
    }
    
    // Check for relationship_group_members table
    const { data: groupMembersTable, error: groupMembersError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'relationship_group_members')
      .single();
    
    if (!groupMembersError && groupMembersTable) {
      console.log('✅ relationship_group_members table exists (correct table name)');
    } else {
      console.log('❌ relationship_group_members table not found');
    }
    
  } catch (error) {
    console.error('❌ Error during migration check:', error.message);
  }

  console.log('\n📋 Migration Summary:');
  console.log('  - Fixes table name references from group_members to relationship_group_members');
  console.log('  - Ensures group_member_permissions table exists');
  console.log('  - Updates helper functions to include group-based permissions');
  console.log('  - Adds proper indexes and constraints\n');
  
  console.log('🎯 Next Steps:');
  console.log('  1. Run the migration using one of the methods above');
  console.log('  2. Verify the migration succeeded by checking the logs');
  console.log('  3. Run tests to ensure permissions work correctly:');
  console.log('     npm test -- __tests__/permissions/');
}

// Run the migration
applyMigration().catch(console.error);
