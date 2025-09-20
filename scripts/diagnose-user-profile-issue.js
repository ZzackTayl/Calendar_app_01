#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseUserProfileIssue() {
  const userId = '8d46e542-e016-4b0a-92e7-d8c4aaa1c13a';

  console.log('🔍 Diagnosing User Profile Issue');
  console.log('User ID:', userId);
  console.log('');

  try {
    // 1. Check if user exists in auth.users
    console.log('1. Checking auth.users table...');
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    console.log('   Auth user exists:', !!authUser?.user);
    if (authError) console.log('   Auth error:', authError.message);
    if (authUser?.user) {
      console.log('   Email:', authUser.user.email);
      console.log('   Created:', authUser.user.created_at);
      console.log('   Email confirmed:', !!authUser.user.email_confirmed_at);
    }
    console.log('');

    // 2. Check if profile exists in user_profiles
    console.log('2. Checking user_profiles table...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('   Profile exists:', !!profile);
    if (profileError) console.log('   Profile error:', profileError.message);
    if (profile) {
      console.log('   Profile data:', JSON.stringify(profile, null, 2));
    }
    console.log('');

    // 3. Check user_profiles table structure
    console.log('3. Checking user_profiles table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('   ❌ Table access error:', tableError.message);
    } else {
      console.log('   ✅ user_profiles table accessible');
      if (tableInfo && tableInfo.length > 0) {
        console.log('   Sample record fields:', Object.keys(tableInfo[0]));
      }
    }
    console.log('');

    // 4. Try the exact query that's failing
    console.log('4. Testing the failing query...');
    const { data: timeZoneData, error: timeZoneError } = await supabase
      .from('user_profiles')
      .select('time_zone')
      .eq('id', userId)
      .single();

    if (timeZoneError) {
      console.log('   ❌ Exact error reproduced:', timeZoneError.message);
      console.log('   Error code:', timeZoneError.code);
      console.log('   Error details:', timeZoneError.details);
    } else {
      console.log('   ✅ Query successful:', timeZoneData);
    }
    console.log('');

    // 5. Check if we can create a profile
    console.log('5. Testing profile creation...');
    if (!profile) {
      const { data: createResult, error: createError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          time_zone: 'UTC',
          email_notifications: true,
          push_notifications: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.log('   ❌ Profile creation failed:', createError.message);
      } else {
        console.log('   ✅ Profile created successfully:', createResult);
      }
    } else {
      console.log('   ℹ️  Profile already exists, skipping creation test');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  }
}

diagnoseUserProfileIssue();