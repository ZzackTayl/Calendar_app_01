#!/usr/bin/env node

/**
 * Update Vercel Production Environment Variables and Deploy
 * 
 * This script helps you update your Vercel deployment to use the correct
 * Supabase project configuration.
 */

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
console.log('   │ Value:    https://lkkmhmeywoczjskqvljh.supabase.co                   │');
console.log('   │                                                                      │');
console.log('   │ Variable: NEXT_PUBLIC_SUPABASE_ANON_KEY                              │');
console.log('   │ Value:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZ │');
console.log('   │          SIsInJlZiI6Imxra21obWV5d29jempza3F2bGpoIiwicm9sZSI6ImFub24 │');
console.log('   │          iLCJpYXQiOjE3NTczMDA0NDAsImV4cCI6MjA3Mjg3NjQ0MH0.VE1FLNQb │');
console.log('   │          ehFnL7i88i2j1JAvu2EcJtS8bfhTcHmGfxA                        │');
console.log('   │                                                                      │');
console.log('   │ Variable: SUPABASE_SERVICE_ROLE_KEY (if you have it)                 │');
console.log('   │ Value:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZ │');
console.log('   │          SIsInJlZiI6Imxra21obWV5d29jempza3F2bGpoIiwicm9sZSI6InNlcnZ │');
console.log('   │          pY2Vfcm9sZSIsImlhdCI6MTc1NzMwMDQ0MCwiZXhwIjoyMDcyODc2NDQ │');
console.log('   │          wfQ.5s8f7z3QnGOq7WMIxw6NgVYjZ-7tSlF7IvzjRoM6A_Y            │');
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
console.log('   # Then enter: https://lkkmhmeywoczjskqvljh.supabase.co');
console.log();
console.log('   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production'); 
console.log('   # Then enter the anon key shown above');
console.log();
console.log('   vercel --prod  # Redeploy to production');
console.log();
