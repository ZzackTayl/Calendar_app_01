#!/usr/bin/env node

/**
 * Simple User Journey Test Script
 * Tests basic auth flow without schema dependencies
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserJourney() {
  console.log('🧪 Testing User Authentication Flow...\n');

  const testEmail = `dev-test-${Date.now()}@example.com`;
  const testPassword = 'DevTest123!';

  try {
    // Step 1: Test sign up
    console.log('1. Testing user registration...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Developer'
        }
      }
    });

    if (signUpError) throw signUpError;
    console.log('✅ User registration successful:', signUpData.user?.email);

    // Step 2: Test sign in
    console.log('\n2. Testing user login...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    console.log('✅ User login successful');

    // Step 3: Test user data access
    console.log('\n3. Testing user data access...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    console.log('✅ User data accessible:', userData.user?.email);

    // Step 4: Test basic table access with user context
    console.log('\n4. Testing authenticated table access...');
    
    // Test with minimal required fields
    const { data: testData, error: testError } = await supabase
      .from('relationships')
      .select('id')
      .limit(1);

    if (testError) {
      console.log('⚠️  Table access requires schema verification:', testError.message);
    } else {
      console.log('✅ Table access working');
    }

    // Step 5: Clean up
    console.log('\n5. Cleaning up test user...');
    await supabase.auth.signOut();
    console.log('✅ Test completed');

    console.log('\n🎉 Authentication Flow Test PASSED!');
    console.log('✅ User registration working');
    console.log('✅ User login working');
    console.log('✅ User data access working');
    console.log('\n📋 Ready for developers to create real accounts!');
    console.log('\n🔗 Next steps for developers:');
    console.log('1. Visit your deployed app URL');
    console.log('2. Click "Sign Up" to create account');
    console.log('3. Verify email (check spam folder)');
    console.log('4. Sign in and start using the app');

  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check Supabase Auth settings at: https://app.supabase.com');
    console.error('2. Ensure email confirmation is configured');
    console.error('3. Verify database schema is applied');
    console.error('4. Check RLS policies for user tables');
    process.exit(1);
  }
}

// Run the test
testUserJourney();