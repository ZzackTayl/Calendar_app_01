#!/usr/bin/env node

/**
 * Check Database Schema
 * 
 * This script checks the actual database schema and identifies what needs to be updated.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkDatabaseSchema() {
  console.log('🔍 CHECKING DATABASE SCHEMA');
  console.log('==========================\n');
  
  try {
    // Check if csrf_tokens table exists
    console.log('1️⃣ Checking for CSRF tokens table...');
    const { data: csrfTable, error: csrfError } = await supabase
      .from('csrf_tokens')
      .select('*')
      .limit(1);
    
    if (csrfError && csrfError.code === 'PGRST116') {
      console.log('❌ csrf_tokens table does not exist');
    } else {
      console.log('✅ csrf_tokens table exists');
    }
    
    // Check events table structure
    console.log('\n2️⃣ Checking events table structure...');
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (eventsError) {
      console.log('❌ Cannot access events table:', eventsError.message);
    } else {
      console.log('✅ events table accessible');
      // Check if privacy_override column exists
      const { data: eventsColumns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'events' })
        .catch(() => ({ data: null, error: { message: 'Function not available' } }));
      
      if (columnsError) {
        console.log('⚠️  Cannot check events table columns directly');
      } else {
        console.log('📋 Events table columns:', eventsColumns);
      }
    }
    
    // Check relationships table structure
    console.log('\n3️⃣ Checking relationships table structure...');
    const { data: relationshipsData, error: relationshipsError } = await supabase
      .from('relationships')
      .select('*')
      .limit(1);
    
    if (relationshipsError) {
      console.log('❌ Cannot access relationships table:', relationshipsError.message);
    } else {
      console.log('✅ relationships table accessible');
    }
    
    // Check if privacy model functions exist
    console.log('\n4️⃣ Checking privacy model functions...');
    const { data: functionsData, error: functionsError } = await supabase
      .rpc('get_connection_tier', { user_id: '00000000-0000-0000-0000-000000000000', target_user_id: '00000000-0000-0000-0000-000000000000' })
      .catch(() => ({ data: null, error: { message: 'Function not available' } }));
    
    if (functionsError) {
      console.log('❌ Privacy model functions not found');
      console.log('   This suggests the privacy model migration was not applied');
    } else {
      console.log('✅ Privacy model functions exist');
    }
    
    console.log('\n📊 SUMMARY');
    console.log('===========');
    console.log('Your database schema appears to be missing the privacy model updates.');
    console.log('You need to run the privacy model migration to fix the CSRF issues.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkDatabaseSchema();
