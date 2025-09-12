#!/usr/bin/env node

/**
 * Email Setup Diagnostic Script
 * 
 * This script checks your current email configuration and identifies what needs to be set up.
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

console.log('🔍 EMAIL SETUP DIAGNOSTIC');
console.log('========================\n');

// Check environment variables
console.log('📋 Environment Variables Check:');
console.log('--------------------------------');

const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  'RESEND_API_KEY': process.env.RESEND_API_KEY,
  'INVITATION_FROM_EMAIL': process.env.INVITATION_FROM_EMAIL,
  'INVITATION_FROM_NAME': process.env.INVITATION_FROM_NAME,
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL
};

let missingVars = [];
let presentVars = [];

Object.entries(requiredVars).forEach(([key, value]) => {
  if (value) {
    console.log(`✅ ${key}: ${key.includes('KEY') ? '***SET***' : value}`);
    presentVars.push(key);
  } else {
    console.log(`❌ ${key}: MISSING`);
    missingVars.push(key);
  }
});

console.log('\n📊 Summary:');
console.log(`   ✅ Present: ${presentVars.length}/${Object.keys(requiredVars).length}`);
console.log(`   ❌ Missing: ${missingVars.length}/${Object.keys(requiredVars).length}`);

if (missingVars.length > 0) {
  console.log('\n🚨 CRITICAL ISSUES FOUND:');
  console.log('   You need to set up these environment variables:');
  missingVars.forEach(varName => {
    console.log(`   - ${varName}`);
  });
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Create a .env.local file in your project root');
  console.log('   2. Add the missing environment variables');
  console.log('   3. Follow the COMPLETE_EMAIL_SETUP_GUIDE.md');
  console.log('\n   Example .env.local content:');
  console.log('   ```');
  console.log('   NEXT_PUBLIC_SUPABASE_URL=https://lkkmhmeywoczjskqvljh.supabase.co');
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('   RESEND_API_KEY=re_your_resend_api_key_here');
  console.log('   INVITATION_FROM_EMAIL=noreply@yourdomain.com');
  console.log('   INVITATION_FROM_NAME=PolyHarmony');
  console.log('   NEXT_PUBLIC_APP_URL=https://calendar-app-01.vercel.app');
  console.log('   ```');
} else {
  console.log('\n✅ All environment variables are present!');
  console.log('\n🔧 Next Steps:');
  console.log('   1. Check Supabase dashboard settings');
  console.log('   2. Verify domain in Resend');
  console.log('   3. Test email verification flow');
  console.log('   4. Run: node test-email-verification.js');
}

console.log('\n📚 For detailed setup instructions, see:');
console.log('   COMPLETE_EMAIL_SETUP_GUIDE.md');
