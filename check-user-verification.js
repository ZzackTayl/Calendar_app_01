#!/usr/bin/env node

/**
 * Check User Email Verification Status
 * 
 * This script checks if a user's email is verified and can manually verify them if needed.
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? 'SET' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkUserVerification() {
  try {
    console.log('Checking user verification status...');
    
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    
    console.log('\nUser verification status:');
    console.log('========================');
    
    if (users.length === 0) {
      console.log('No users found in the database.');
      return;
    }
    
    users.forEach(user => {
      const status = user.email_confirmed_at ? '✅ VERIFIED' : '❌ UNVERIFIED';
      const confirmedAt = user.email_confirmed_at ? new Date(user.email_confirmed_at).toLocaleString() : 'Never';
      console.log(`- ${user.email}: ${status}`);
      console.log(`  Confirmed at: ${confirmedAt}`);
      console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
      console.log('');
    });
    
    const verifiedCount = users.filter(u => u.email_confirmed_at).length;
    const unverifiedCount = users.length - verifiedCount;
    
    console.log(`Summary: ${verifiedCount} verified, ${unverifiedCount} unverified out of ${users.length} total users`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserVerification();
