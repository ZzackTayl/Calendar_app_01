#!/usr/bin/env node

/**
 * Diagnose User Profiles Database Issue
 * This script helps identify why users are getting PGRST116 errors
 */

const { createClient } = require('@supabase/supabase-js');

// You'll need to set these environment variables or update them here
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_KEY';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || SUPABASE_URL === 'YOUR_SUPABASE_URL') {
  console.error('❌ Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function diagnoseUserProfilesIssue() {
  console.log('🔍 Diagnosing User Profiles Database Issue...\n');

  try {
    // 1. Check if user_profiles table exists
    console.log('1️⃣ Checking if user_profiles table exists...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_profiles');

    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError.message);
    } else if (tables && tables.length > 0) {
      console.log('✅ user_profiles table exists');
    } else {
      console.log('❌ user_profiles table does NOT exist');
      console.log('   This is likely the cause of PGRST116 errors');
      return;
    }

    // 2. Check table structure
    console.log('\n2️⃣ Checking user_profiles table structure...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'user_profiles')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ Error checking columns:', columnsError.message);
    } else {
      console.log('✅ Table structure:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}${col.is_nullable === 'YES' ? ' (nullable)' : ' (not null)'}`);
      });

      // Check for critical missing fields
      const columnNames = columns.map(c => c.column_name);
      const requiredFields = ['id', 'time_zone', 'full_name', 'email_notifications', 'push_notifications'];
      const enhancedFields = ['preferred_pronouns', 'bio', 'marketing_consent', 'newsletter_consent', 'calendar_color_scheme'];

      console.log('\n   Field Status:');
      requiredFields.forEach(field => {
        const exists = columnNames.includes(field);
        console.log(`   ${exists ? '✅' : '❌'} ${field} ${exists ? 'exists' : 'MISSING'}`);
      });

      console.log('\n   Enhanced Fields (may be missing in older schemas):');
      enhancedFields.forEach(field => {
        const exists = columnNames.includes(field);
        console.log(`   ${exists ? '✅' : '⚠️ '} ${field} ${exists ? 'exists' : 'missing'}`);
      });
    }

    // 3. Check RLS policies
    console.log('\n3️⃣ Checking Row Level Security policies...');
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, permissive, roles, cmd, qual')
      .eq('tablename', 'user_profiles');

    if (policiesError) {
      console.error('❌ Error checking RLS policies:', policiesError.message);
    } else if (policies && policies.length > 0) {
      console.log('✅ RLS policies found:');
      policies.forEach(policy => {
        console.log(`   - ${policy.policyname} (${policy.cmd})`);
      });
    } else {
      console.log('❌ No RLS policies found for user_profiles table');
      console.log('   This could cause permission issues');
    }

    // 4. Check if RLS is enabled
    console.log('\n4️⃣ Checking if RLS is enabled...');
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', 'user_profiles');

    if (rlsError) {
      console.error('❌ Error checking RLS status:', rlsError.message);
    } else if (rlsStatus && rlsStatus.length > 0) {
      const isEnabled = rlsStatus[0].rowsecurity;
      console.log(`${isEnabled ? '✅' : '❌'} RLS is ${isEnabled ? 'enabled' : 'disabled'}`);
    }

    // 5. Test a simple query
    console.log('\n5️⃣ Testing simple query...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('user_profiles')
        .select('id, time_zone')
        .limit(1);

      if (testError) {
        console.error('❌ Query failed:', testError.message);
        if (testError.code === 'PGRST116') {
          console.log('   This is the PGRST116 error you\'re experiencing!');
          console.log('   It usually means the table exists but columns are missing');
        }
      } else {
        console.log('✅ Basic query successful');
        console.log(`   Found ${testData ? testData.length : 0} test records`);
      }
    } catch (queryError) {
      console.error('❌ Query exception:', queryError.message);
    }

    // 6. Check for user records in auth.users
    console.log('\n6️⃣ Checking auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error checking auth users:', authError.message);
    } else {
      console.log(`✅ Found ${authUsers.users.length} users in auth.users`);

      if (authUsers.users.length > 0) {
        // Check if any of these users have profiles
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('id')
          .in('id', authUsers.users.slice(0, 5).map(u => u.id)); // Check first 5 users

        if (profilesError) {
          console.error('❌ Error checking user profiles:', profilesError.message);
        } else {
          console.log(`   ${profiles ? profiles.length : 0} of these users have profiles in user_profiles table`);
        }
      }
    }

    console.log('\n📋 DIAGNOSIS SUMMARY:');
    console.log('=====================================');
    console.log('The PGRST116 error "Cannot coerce the result to a single JSON object - 0 rows returned"');
    console.log('typically occurs when:');
    console.log('1. The table exists but is missing expected columns');
    console.log('2. The user ID doesn\'t have a corresponding profile record');
    console.log('3. RLS policies are blocking access');
    console.log('4. The query is requesting columns that don\'t exist');
    console.log('\n📝 RECOMMENDED ACTIONS:');
    console.log('1. Run the migration script: migrations/fix_user_profiles_schema.sql');
    console.log('2. Ensure user profiles are created when users sign up');
    console.log('3. Check that the frontend is requesting valid column names');
    console.log('4. Verify authentication is working properly');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

// Run the diagnosis
diagnoseUserProfilesIssue().catch(console.error);