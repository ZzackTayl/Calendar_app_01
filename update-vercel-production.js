#!/usr/bin/env node

/* eslint-env node */
/* eslint-disable no-restricted-syntax, no-new-wrappers */
/* global process, console, Buffer */

/**
 * Update Vercel Production Environment Variables and Deploy
 *
 * This script helps you update your Vercel deployment to use the correct
 * Supabase project configuration.
 *
 * @fileoverview Deployment script - contains intentional hardcoded credentials for setup
 * @suppress {checkTypes} linter warnings about hardcoded secrets
 */

// NOTE: This is a one-time deployment script, not production code.
// The hardcoded values below are intentionally displayed for easy copy-paste into Vercel.
// They will be replaced with environment variables in the actual production app.
//
// Linter warning about "hardcoded secrets" is expected and acceptable here:
// - This is a setup script, not runtime code
// - The values need to be visible for manual copy-paste
// - They will be replaced with env vars in production
// - Security risk is minimal as this is a one-time setup tool

// Load configuration from environment variables - NO HARDCODED SECRETS
const fs = require('fs');
const path = require('path');

// Load from .env.local first
function loadFromEnvFile() {
  try {
    const envPath = path.resolve(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const config = {};

      const lines = envContent.split('\n');
      for (const line of lines) {
        if (line.includes('=')) {
          const [key, ...valueParts] = line.split('=');
          const value = valueParts.join('=');
          if (key === 'NEXT_PUBLIC_SUPABASE_URL') config.supabaseUrl = value;
          if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') config.anonKey = value;
          if (key === 'SUPABASE_SERVICE_ROLE_KEY') config.serviceKey = value;
        }
      }
      return config;
    }
  } catch (e) {
    // Ignore file read errors
  }
  return {};
}

// Load from process.env with fallbacks
const envConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
};

// Merge with .env.local values (they take precedence)
const fileConfig = loadFromEnvFile();
const CONFIG = { ...envConfig, ...fileConfig };

// Validate required configuration
if (!CONFIG.supabaseUrl) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_URL environment variable is required');
  console.log('💡 Set it with: export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"');
  process.exit(1);
}

if (!CONFIG.anonKey) {
  console.error('❌ ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  console.log('💡 Set it with: export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"');
  process.exit(1);
}

console.log('🔧 VERCEL PRODUCTION UPDATE REQUIRED');
console.log('=====================================');
console.log();

console.log('❌ PROBLEM: Your production app is STILL using the old Supabase project');
console.log('   The JavaScript console error shows:');
console.log('   POST https://mqmtsiqalclkfeursrsa.supabase.co/auth/v1/signup 500');
console.log();
console.log('   This means Vercel production environment variables are NOT updated yet.');
console.log();

console.log('🔧 IMMEDIATE ACTIONS REQUIRED:');
console.log('===============================');
console.log();

console.log('1. UPDATE VERCEL ENVIRONMENT VARIABLES:');
console.log('   Go to: https://vercel.com/dashboard');
console.log('   → Click on your Calendar app project');
console.log('   → Go to Settings → Environment Variables');
console.log();
console.log('   UPDATE these variables:');
console.log('   ┌──────────────────────────────────────────────────────────────────────┐');
console.log('   │ Variable: NEXT_PUBLIC_SUPABASE_URL                                   │');
console.log(`   │ Value:    ${CONFIG.supabaseUrl}                                      │`);
console.log('   │                                                                      │');
console.log('   │ Variable: NEXT_PUBLIC_SUPABASE_ANON_KEY                              │');
console.log(`   │ Value:    ${CONFIG.anonKey.substring(0, 50)}...                     │`);
console.log('   │                                                                      │');
console.log('   │ Variable: SUPABASE_SERVICE_ROLE_KEY (if you have it)                 │');
console.log(`   │ Value:    ${CONFIG.serviceKey.substring(0, 50)}...                   │`);
console.log('   └──────────────────────────────────────────────────────────────────────┘');
console.log();

console.log('2. REDEPLOY YOUR APPLICATION:');
console.log('   Option A - Via Vercel Dashboard:');
console.log('   → Go to Deployments tab');
console.log('   → Click "Redeploy" on the latest deployment');
console.log();
console.log('   Option B - Via Git push:');
console.log('   → Make any small commit and push to trigger redeployment');
console.log();

console.log('3. TEST THE FIX:');
console.log('   After redeployment completes:');
console.log('   → Visit your production URL');
console.log('   → Try to sign up');
console.log('   → The console error should be gone');
console.log('   → Email confirmations should work');
console.log();

console.log('📋 VERIFICATION CHECKLIST:');
console.log('==========================');
console.log('□ Updated NEXT_PUBLIC_SUPABASE_URL in Vercel');
console.log('□ Updated NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel');  
console.log('□ Updated SUPABASE_SERVICE_ROLE_KEY in Vercel (if applicable)');
console.log('□ Redeployed the application');
console.log('□ Tested signup on production URL');
console.log('□ Verified console errors are gone');
console.log('□ Confirmed email confirmations work');
console.log();

console.log('🚨 WHY THIS HAPPENED:');
console.log('=====================');
console.log('Your local .env.local was already updated with the correct project,');
console.log('but Vercel production environment variables were never updated.');
console.log('Environment variables in deployment platforms are separate from');
console.log('your local .env files and must be updated manually.');
console.log();

console.log('✅ AFTER FIXING:');
console.log('================');
console.log('✅ Production will use the correct Supabase project');
console.log('✅ Email confirmations will work properly');
console.log('✅ No more 500 errors during signup');
console.log('✅ All authentication flows will work');
console.log();

console.log('💡 If you need help with Vercel CLI instead:');
console.log('=============================================');
console.log('You can also use Vercel CLI to update environment variables:');
console.log();
console.log('   vercel env add NEXT_PUBLIC_SUPABASE_URL production');
console.log(`   # Then enter: ${CONFIG.supabaseUrl}`);
console.log();
console.log('   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production');
console.log('   # Then enter the anon key shown above');
console.log();
console.log('   vercel --prod  # Redeploy to production');
console.log();
