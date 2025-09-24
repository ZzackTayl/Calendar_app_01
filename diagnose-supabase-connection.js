#!/usr/bin/env node

/**
 * Diagnose Supabase Connection Issues
 *
 * This script checks the Supabase connection and credentials
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Diagnosing Supabase Connection...');
console.log('=====================================');

// Check environment variables
console.log('\n1. Environment Variables:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !anonKey) {
  console.log('\n❌ CRITICAL: Missing required Supabase credentials');
  console.log('   Please check your .env.local file');
  process.exit(1);
}

// Test basic connection with anon key
async function testConnections() {
  console.log('\n2. Testing connection with anon key...');
  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    // Try a simple query
    const { data, error } = await supabaseAnon
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('   ❌ Connection failed:', error.message);

      // Try with service role key if anon fails
      if (serviceRoleKey) {
        console.log('\n3. Testing connection with service role key...');
        const supabaseService = createClient(supabaseUrl, serviceRoleKey);

        const { data: serviceData, error: serviceError } = await supabaseService
          .from('users')
          .select('count', { count: 'exact', head: true });

        if (serviceError) {
          console.log('   ❌ Service role connection also failed:', serviceError.message);
          console.log('\n💡 Possible issues:');
          console.log('   - Invalid API keys');
          console.log('   - Network connectivity issues');
          console.log('   - Supabase project paused or deleted');
          console.log('   - RLS policies blocking access');
        } else {
          console.log('   ✅ Service role connection successful');
          console.log('   User count:', serviceData);
        }
      }
    } else {
      console.log('   ✅ Anon connection successful');
      console.log('   User count:', data);
    }

  } catch (error) {
    console.log('   ❌ Connection error:', error.message);
  }

  // Check if local database is being used instead
  console.log('\n4. Checking database configuration...');
  const databaseUrl = process.env.DATABASE_URL;
  console.log('   DATABASE_URL:', databaseUrl ? '✅ Set (local DB)' : '❌ Not set (using Supabase)');

  if (databaseUrl) {
    console.log('   💡 Using local PostgreSQL database instead of Supabase');
  } else {
    console.log('   💡 Using Supabase for database operations');
  }

  console.log('\n📋 RECOMMENDATIONS:');
  console.log('   1. Verify your Supabase project is active');
  console.log('   2. Check that API keys are correct in .env.local');
  console.log('   3. Ensure RLS policies allow the required operations');
  console.log('   4. Consider using local Docker setup for development');
}

testConnections();
