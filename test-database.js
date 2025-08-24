#!/usr/bin/env node

/**
 * Database Connectivity Test Script
 * Tests connection to Supabase and basic CRUD operations
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🧪 Testing Database Connectivity...\n');

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...');
    const { data: health, error: healthError } = await supabase
      .from('events')
      .select('count')
      .limit(1);
    
    if (healthError) throw healthError;
    console.log('✅ Basic connection successful');

    // Test 2: Create test data
    console.log('\n2. Creating test event...');
    const testEvent = {
      title: 'Test Event - Database Connectivity Check',
      description: 'This is a test event to verify database connectivity',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      owner_id: 'test-user-' + Date.now(),
      privacy_level: 'public'
    };

    const { data: createdEvent, error: createError } = await supabase
      .from('events')
      .insert(testEvent)
      .select()
      .single();

    if (createError) throw createError;
    console.log('✅ Test event created:', createdEvent.id);

    // Test 3: Read test data
    console.log('\n3. Reading test event...');
    const { data: readEvent, error: readError } = await supabase
      .from('events')
      .select('*')
      .eq('id', createdEvent.id)
      .single();

    if (readError) throw readError;
    console.log('✅ Test event retrieved:', readEvent.title);

    // Test 4: Update test data
    console.log('\n4. Updating test event...');
    const { data: updatedEvent, error: updateError } = await supabase
      .from('events')
      .update({ title: 'Updated Test Event' })
      .eq('id', createdEvent.id)
      .select()
      .single();

    if (updateError) throw updateError;
    console.log('✅ Test event updated:', updatedEvent.title);

    // Test 5: Delete test data
    console.log('\n5. Cleaning up test event...');
    const { error: deleteError } = await supabase
      .from('events')
      .delete()
      .eq('id', createdEvent.id);

    if (deleteError) throw deleteError;
    console.log('✅ Test event cleaned up');

    console.log('\n🎉 All database tests passed!');
    console.log('✅ Database connectivity verified');
    console.log('✅ CRUD operations working correctly');
    console.log('✅ Ready for remote developer access');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check your internet connection');
    console.error('2. Verify Supabase project is active');
    console.error('3. Check environment variables in .env.local');
    console.error('4. Ensure Supabase URL and key are correct');
    process.exit(1);
  }
}

// Run the test
testDatabase();