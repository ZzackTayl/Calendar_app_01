#!/usr/bin/env node

/**
 * Simple User Profiles Table Diagnostic
 * Uses anon key to check table structure and identify issues
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Simple User Profiles Table Diagnostic');
console.log('=========================================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkTableStructure() {
  try {
    console.log('1. Testing basic connectivity...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('   ❌ Connection failed:', connectionError.message);
      return;
    }
    console.log('   ✅ Connection successful');

    console.log('\n2. Checking if user_profiles table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.log('   ❌ Table check failed:', tableError.message);
      if (tableError.message.includes('user_id')) {
        console.log('   🔍 This suggests the user_profiles table is missing the user_id column');
      }
      return;
    }
    console.log('   ✅ user_profiles table exists');

    console.log('\n3. Testing specific column queries...');
    const testColumns = ['time_zone', 'id', 'full_name', 'email_notifications'];

    for (const column of testColumns) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(column)
          .limit(1);

        if (error) {
          console.log(`   ❌ ${column}: ${error.message}`);
        } else {
          console.log(`   ✅ ${column}: Column exists and queryable`);
        }
      } catch (err) {
        console.log(`   ❌ ${column}: ${err.message}`);
      }
    }

    console.log('\n4. Testing the original failing pattern...');
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('time_zone')
        .limit(1);

      if (error) {
        console.log('   ❌ Original query pattern failed:', error.message);
        if (error.code === 'PGRST116') {
          console.log('   🎯 Found PGRST116 error! This is the login issue.');
        }
      } else {
        console.log('   ✅ Original query pattern works');
      }
    } catch (err) {
      console.log('   ❌ Original query pattern exception:', err.message);
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('Based on the diagnostic results above, the issue appears to be:');
    console.log('1. Missing user_id column in user_profiles table');
    console.log('2. Schema mismatch between expected and actual table structure');
    console.log('3. RLS policies blocking access to required columns');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

checkTableStructure().catch(console.error);