#!/usr/bin/env node

/**
 * Check Supabase OTP Settings
 * 
 * This script helps you check the current OTP (email confirmation) expiration settings
 * in your Supabase project and provides guidance on extending them if needed.
 */

console.log('🔍 Checking Supabase OTP Settings...\n');

console.log('📋 How to Check Your Supabase OTP Settings:');
console.log('==========================================');
console.log();
console.log('1. Go to: https://supabase.com/dashboard');
console.log('2. Select your project: lkkmhmeywoczjskqvljh');
console.log('3. Go to Authentication → Settings');
console.log('4. Look for "Email OTP Expiry" setting');
console.log();

console.log('🕒 Typical OTP Expiration Times:');
console.log('================================');
console.log('• Default: 24 hours (86400 seconds)');
console.log('• Recommended for testing: 1-2 hours');
console.log('• Production: 24 hours is usually good');
console.log();

console.log('⚡ Quick Fix Options:');
console.log('=====================');
console.log();
console.log('Option A - Extend OTP Expiry (if needed):');
console.log('1. In Supabase Dashboard → Authentication → Settings');
console.log('2. Find "Email OTP Expiry" setting');
console.log('3. Increase to 3600 (1 hour) or 7200 (2 hours) for testing');
console.log('4. Save the changes');
console.log();

console.log('Option B - Test with Fresh Email:');
console.log('1. Use a completely new email address');
console.log('2. Sign up at: https://calendar-app-01-87u3qjg9v-anthropologica.vercel.app');
console.log('3. Check email immediately');
console.log('4. Click confirmation link within 5 minutes');
console.log();

console.log('Option C - Resend Confirmation:');
console.log('1. Try signing in with your existing account');
console.log('2. If it says "Email not confirmed", look for a "Resend confirmation" option');
console.log('3. Click resend to get a fresh confirmation link');
console.log();

console.log('🧪 Testing Checklist:');
console.log('=====================');
console.log('□ Use fresh email address (not previously used)');
console.log('□ Sign up on production site');
console.log('□ Check email within 2-3 minutes');
console.log('□ Click confirmation link immediately');
console.log('□ Should redirect to app without errors');
console.log();

console.log('🔧 Troubleshooting:');
console.log('===================');
console.log('If you still get "OTP expired":');
console.log('• The email took too long to arrive');
console.log('• You clicked an old confirmation link');
console.log('• Multiple signups with same email caused conflicts');
console.log('• OTP expiry time is too short');
console.log();

console.log('✅ Success Indicators:');
console.log('======================');
console.log('• Confirmation link redirects to your app');
console.log('• URL shows /dashboard or main app page');
console.log('• No error parameters in URL');
console.log('• You can access the app features');
console.log();
