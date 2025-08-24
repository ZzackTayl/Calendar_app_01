#!/usr/bin/env node

/**
 * Complete User Journey Test Script
 * Tests the full flow: signup → login → create relationship → create event
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

async function testCompleteUserJourney() {
  console.log('🧪 Testing Complete User Journey...\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPass123!';
  const testName = 'Test Developer';

  try {
    // Step 1: Sign up new user
    console.log('1. Creating new user account...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName
        }
      }
    });

    if (signUpError) throw signUpError;
    console.log('✅ User account created:', signUpData.user?.email);

    // Step 2: Sign in with new user
    console.log('\n2. Signing in with new account...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (signInError) throw signInError;
    console.log('✅ User signed in successfully');

    // Step 3: Create a relationship
    console.log('\n3. Creating test relationship...');
    const testRelationship = {
      user_id: signInData.user.id,
      partner_name: 'Test Partner',
      partner_email: 'partner@example.com',
      relationship_type: 'primary',
      color: '#FF6B6B',
      privacy_level: 'full_access',
      is_active: true
    };

    const { data: relationshipData, error: relationshipError } = await supabase
      .from('relationships')
      .insert(testRelationship)
      .select()
      .single();

    if (relationshipError) throw relationshipError;
    console.log('✅ Relationship created:', relationshipData.id);

    // Step 4: Create an event
    console.log('\n4. Creating test event...');
    const testEvent = {
      owner_id: signInData.user.id,
      title: 'Test Date Night',
      description: 'Testing event creation with new user',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      location: 'Test Location',
      privacy_level: 'private',
      relationship_id: relationshipData.id
    };

    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single();

    if (eventError) throw eventError;
    console.log('✅ Event created:', eventData.id);

    // Step 5: Verify data persistence
    console.log('\n5. Verifying data persistence...');
    
    // Check relationships
    const { data: userRelationships, error: relCheckError } = await supabase
      .from('relationships')
      .select('*')
      .eq('user_id', signInData.user.id);

    if (relCheckError) throw relCheckError;
    console.log(`✅ User has ${userRelationships.length} relationship(s)`);

    // Check events
    const { data: userEvents, error: eventCheckError } = await supabase
      .from('events')
      .select('*')
      .eq('owner_id', signInData.user.id);

    if (eventCheckError) throw eventCheckError;
    console.log(`✅ User has ${userEvents.length} event(s)`);

    // Step 6: Clean up test data
    console.log('\n6. Cleaning up test data...');
    
    // Delete events
    await supabase.from('events').delete().eq('owner_id', signInData.user.id);
    
    // Delete relationships
    await supabase.from('relationships').delete().eq('user_id', signInData.user.id);
    
    // Sign out
    await supabase.auth.signOut();
    
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Complete User Journey Test PASSED!');
    console.log('✅ User registration working');
    console.log('✅ Authentication working');
    console.log('✅ Relationship creation working');
    console.log('✅ Event creation working');
    console.log('✅ Data persistence verified');
    console.log('\n📋 Ready for remote developers to create real accounts!');

  } catch (error) {
    console.error('❌ User journey test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check Supabase Auth settings in dashboard');
    console.error('2. Verify email confirmation is disabled for testing');
    console.error('3. Ensure RLS policies allow user data creation');
    console.error('4. Check database schema matches application requirements');
    process.exit(1);
  }
}

// Run the test
testCompleteUserJourney();