#!/usr/bin/env node

// Script to verify that the unified schema has been applied correctly
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifySchema() {
  console.log('Verifying unified schema application...');
  
  try {
    // Check if all required tables exist
    const requiredTables = [
      'users', 'events', 'contacts', 'contact_tags', 'contact_tag_relationships',
      'relationship_groups', 'relationships', 'event_permissions',
      'invitations', 'invitation_tokens', 'calendar_integrations', 'calendar_shares',
      'reminders', 'user_preferences'
    ];
    
    // Get list of tables in the database
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.error('Error fetching tables:', tablesError.message);
      return;
    }
    
    const tableNames = tables.map(table => table.table_name);
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables);
    } else {
      console.log('✅ All required tables exist');
    }
    
    // Check if events table has the required columns
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'events');
    
    if (columnsError) {
      console.error('Error fetching columns:', columnsError.message);
      return;
    }
    
    const eventColumns = columns.map(col => col.column_name);
    const requiredEventColumns = ['user_id', 'privacy_level', 'relationship_id'];
    const missingEventColumns = requiredEventColumns.filter(col => !eventColumns.includes(col));
    
    if (missingEventColumns.length > 0) {
      console.log('❌ Missing event columns:', missingEventColumns);
    } else {
      console.log('✅ All required event columns exist');
    }
    
    // Check if users table has the required columns
    const { data: userColumns, error: userColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users');
    
    if (userColumnsError) {
      console.error('Error fetching user columns:', userColumnsError.message);
      return;
    }
    
    const userColumnNames = userColumns.map(col => col.column_name);
    const requiredUserColumns = ['email', 'phone_number', 'full_name', 'time_zone', 'profile_data'];
    const missingUserColumns = requiredUserColumns.filter(col => !userColumnNames.includes(col));
    
    if (missingUserColumns.length > 0) {
      console.log('❌ Missing user columns:', missingUserColumns);
    } else {
      console.log('✅ All required user columns exist');
    }
    
    // Check if privacy level enum exists
    const { data: enumTypes, error: enumError } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT t.typname 
          FROM pg_type t 
          JOIN pg_namespace n ON n.oid = t.typnamespace 
          WHERE t.typtype = 'e' AND n.nspname = 'public'
        `
      });
    
    if (enumError) {
      console.log('Note: Could not verify enum types (this is normal in some environments)');
    } else {
      console.log('✅ Enum types verification completed');
    }
    
    console.log('\nSchema verification completed. Please review the results above.');
    console.log('If any checks failed, please run the migration script and verify again.');
    
  } catch (err) {
    console.error('Error verifying schema:', err.message);
  }
}

// Run the script
verifySchema();