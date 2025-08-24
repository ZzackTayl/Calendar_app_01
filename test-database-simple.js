#!/usr/bin/env node

/**
 * Simple Database Connectivity Test
 * Tests basic connection to Supabase without schema dependencies
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
    // Test 1: Basic connection by listing tables
    console.log('1. Testing basic connection...');
    const { data, error } = await supabase
      .from('events')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('⚠️  Events table test failed, trying relationships...');
      const { data: relData, error: relError } = await supabase
        .from('relationships')
        .select('count')
        .limit(1);
      
      if (relError) throw relError;
      console.log('✅ Database connection successful (relationships table accessible)');
    } else {
      console.log('✅ Database connection successful (events table accessible)');
    }

    // Test 2: Check if tables exist
    console.log('\n2. Checking available tables...');
    const tables = ['events', 'relationships', 'relationship_groups', 'relationship_group_members'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`⚠️  ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: accessible (${count || 0} rows)`);
        }
      } catch (e) {
        console.log(`❌ ${table}: ${e.message}`);
      }
    }

    console.log('\n🎉 Database connectivity verified!');
    console.log('✅ Supabase connection working');
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