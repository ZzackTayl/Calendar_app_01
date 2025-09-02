#!/usr/bin/env node

/**
 * Check User Email Verification Status
 * 
 * This script checks if a user's email is verified and can manually verify them if needed.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUserVerification(email) {
  console.log(`🔍 Checking verification status for: ${email}`);
  
  try {
    // Get user by email using the correct table
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, email_confirmed_at, created_at')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching user:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[0];
    console.log('📊 User Status:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`);
    
    if (!user.email_confirmed_at) {
      console.log('\n⚠️  Email not verified!');
      console.log('This is why you can\'t create events.');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question('\nDo you want to manually verify this email? (y/N): ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log('🔧 Manually verifying email...');
          
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              email_confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
          
          if (updateError) {
            console.error('❌ Error updating user:', updateError.message);
          } else {
            console.log('✅ Email manually verified!');
            console.log('You should now be able to create events.');
          }
        } else {
          console.log('❌ Email verification skipped');
        }
        rl.close();
      });
    } else {
      console.log('✅ Email is verified!');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node check-user-verification.js <email>');
  console.log('Example: node check-user-verification.js user@example.com');
  process.exit(1);
}

checkUserVerification(email);
