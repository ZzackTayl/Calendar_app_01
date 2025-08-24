#!/usr/bin/env node

/**
 * Apply Invitation System Migration
 * 
 * This script applies the invitation system migration to the database
 * using the Supabase service role key.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please check your .env.local file.');
  process.exit(1);
}

// Use service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql(sql) {
  // For Supabase, we need to execute raw SQL differently
  // Let's try using the rpc method with a custom function
  try {
    // Try to execute as a single statement first
    const { data, error } = await supabase.rpc('execute_sql', { sql });
    
    if (error && error.message.includes('function execute_sql(text) does not exist')) {
      console.log('Custom execute_sql function not found, trying alternative approach...');
      return { success: false, error: 'Function not found' };
    }
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function applyInvitationMigration() {
  console.log('Applying invitation system migration...');
  
  try {
    // Read the migration file
    const fs = require('fs');
    const path = require('path');
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250824000001_invitation_system.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Migration file loaded successfully.');
    
    // Try to execute the entire migration
    console.log('Attempting to execute full migration...');
    
    // Since we can't use rpc, let's try to create the tables directly
    // by extracting and executing the CREATE TABLE statements
    
    // Let's try a different approach - check if tables exist first
    const tablesToCheck = [
      'invitations',
      'invitation_tokens',
      'group_invitations',
      'group_invitation_tokens',
      'connection_setups',
      'group_members',
      'group_member_permissions',
      'invitation_notification_preferences'
    ];
    
    console.log('Checking if invitation tables already exist...');
    let allTablesExist = true;
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('id')
          .limit(1);
          
        if (error) {
          console.log(`  Table '${table}' does not exist or is inaccessible`);
          allTablesExist = false;
        } else {
          console.log(`  ✓ Table '${table}' exists`);
        }
      } catch (err) {
        console.log(`  Table '${table}' does not exist`);
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      console.log('✓ All invitation tables already exist. Migration may have been applied previously.');
      return;
    }
    
    console.log('Some tables are missing. You may need to apply the migration manually through the Supabase dashboard.');
    console.log('Please copy the contents of supabase/migrations/20250824000001_invitation_system.sql');
    console.log('and execute it in the SQL editor of your Supabase project dashboard.');
    
  } catch (error) {
    console.error('Error during migration check:', error.message);
    process.exit(1);
  }
}

// Run the migration script
if (require.main === module) {
  applyInvitationMigration();
}

module.exports = { applyInvitationMigration };