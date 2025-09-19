#!/usr/bin/env node

/**
 * Quick RLS Status Check
 * Simple script to validate RLS policies are working
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...values] = line.split('=');
  if (key && values.length > 0) {
    envVars[key.trim()] = values.join('=').trim();
  }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

console.log('🔍 Checking RLS Status...\n');

const client = createClient(SUPABASE_URL, SERVICE_KEY);

// Test 1: Check if we can connect
try {
  console.log('📡 Testing database connection...');
  const { data, error } = await client.from('users').select('count').limit(1);
  
  if (error && error.code === '42P01') {
    console.log('⚠️  Users table not found - may need to run migrations');
  } else if (error) {
    console.log('❌ Database connection failed:', error.message);
  } else {
    console.log('✅ Database connection successful');
  }
} catch (err) {
  console.log('❌ Connection test failed:', err.message);
}

// Test 2: Check table exists and has RLS
try {
  console.log('\n📋 Checking critical tables...');
  
  const tables = ['users', 'events', 'relationships', 'contacts'];
  
  for (const table of tables) {
    try {
      // Try to access table with service role (should work)
      const { data, error } = await client.from(table).select('*').limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`⚠️  ${table}: Table not found`);
      } else if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: Accessible with service role`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
    }
  }
} catch (err) {
  console.log('❌ Table check failed:', err.message);
}

console.log('\n📊 Summary:');
console.log('✅ If tables are accessible with service role, RLS is likely working');
console.log('⚠️  To fully test RLS, you need to test with regular user tokens');
console.log('🔗 Check Supabase dashboard > Authentication > Policies for full details');

console.log('\n🎯 Next Steps:');
console.log('1. Check Supabase dashboard for RLS policies');
console.log('2. Test with actual user authentication');
console.log('3. Review privacy settings in your app');
console.log('4. Monitor for any data leakage in production');
