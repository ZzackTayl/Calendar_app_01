#!/usr/bin/env node

/**
 * Detailed User Profiles Diagnostic
 * Tests specific patterns that might be causing login issues
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Detailed User Profiles Diagnostic');
console.log('===================================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function runDetailedDiagnostic() {
  try {
    console.log('1. Testing basic table access...');
    const { data: basicTest, error: basicError } = await supabase
      .from('user_profiles')
      .select('id, time_zone')
      .limit(1);

    if (basicError) {
      console.log('   ❌ Basic query failed:', basicError.message);
    } else {
      console.log('   ✅ Basic query works');
    }

    console.log('\n2. Testing RLS policy behavior...');
    // Test what happens when we try to access without proper auth context
    const { data: rlsTest, error: rlsError } = await supabase
      .from('user_profiles')
      .select('time_zone')
      .eq('id', '00000000-0000-0000-0000-000000000000');

    if (rlsError) {
      console.log('   ❌ RLS test failed:', rlsError.message);
      if (rlsError.message.includes('user_id')) {
        console.log('   🔍 RLS error mentions user_id - this suggests schema mismatch');
      }
    } else {
      console.log('   ✅ RLS test passed');
    }

    console.log('\n3. Testing column existence with information_schema...');
    // Try to query information schema to see actual table structure
    const { data: schemaInfo, error: schemaError } = await supabase
      .rpc('get_table_columns', { table_name: 'user_profiles' });

    if (schemaError) {
      console.log('   ❌ Cannot access schema info:', schemaError.message);
    } else if (schemaInfo && schemaInfo.length > 0) {
      console.log('   ✅ Schema info accessible');
      console.log('   📋 Columns found:');
      schemaInfo.forEach(col => {
        console.log(`      - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('   ⚠️  No columns found or empty result');
    }

    console.log('\n4. Testing specific login-related queries...');
    // Test the exact pattern that might be used during login
    const testQueries = [
      { name: 'Select time_zone only', query: () => supabase.from('user_profiles').select('time_zone') },
      { name: 'Select with id filter', query: () => supabase.from('user_profiles').select('time_zone').eq('id', 'test') },
      { name: 'Select multiple columns', query: () => supabase.from('user_profiles').select('id, time_zone, email_notifications') },
      { name: 'Select with limit', query: () => supabase.from('user_profiles').select('time_zone').limit(1) }
    ];

    for (const test of testQueries) {
      try {
        const { data, error } = await test.query();
        if (error) {
          console.log(`   ❌ ${test.name}: ${error.message}`);
          if (error.code === 'PGRST116') {
            console.log('   🎯 PGRST116 ERROR FOUND! This is likely the login issue.');
          }
        } else {
          console.log(`   ✅ ${test.name}: Success`);
        }
      } catch (err) {
        console.log(`   ❌ ${test.name}: Exception - ${err.message}`);
      }
    }

    console.log('\n5. Testing auth context simulation...');
    // Test if the issue is related to missing auth context
    const { data: authTest, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.log('   ❌ No authenticated user (expected for anon key)');
    } else {
      console.log('   ✅ Authenticated user found:', authTest.user?.id);
    }

    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('====================');
    console.log('Based on the test results above:');
    console.log('');
    console.log('LIKELY CAUSES OF LOGIN ISSUES:');
    console.log('1. RLS policies are blocking access to user_profiles table');
    console.log('2. Schema mismatch - table may be missing expected columns');
    console.log('3. Authentication context not properly set during login');
    console.log('4. PGRST116 errors occurring on specific query patterns');
    console.log('');
    console.log('RECOMMENDED ACTIONS:');
    console.log('1. Check RLS policies on user_profiles table');
    console.log('2. Verify table schema matches expected structure');
    console.log('3. Test authentication flow with proper user context');
    console.log('4. Review login code for correct Supabase client usage');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

runDetailedDiagnostic().catch(console.error);