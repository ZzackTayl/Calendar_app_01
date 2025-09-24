#!/usr/bin/env node

/**
 * Vercel Environment Variables Fix Guide
 * This script shows you exactly what to update in Vercel
 */

console.log('🚨 VERCEL ENVIRONMENT VARIABLES FIX NEEDED')
console.log('==========================================')
console.log()
console.log('❌ PROBLEM: Your production app is still using the old Supabase project')
console.log('   Current (WRONG): mqmtsiqalclkfeursrsa.supabase.co')
console.log('   Should be:       lkkmhmeywoczjskqvljh.supabase.co')
console.log()

console.log('🔧 HOW TO FIX:')
console.log('==============')
console.log()
console.log('1. Go to Vercel Dashboard:')
console.log('   https://vercel.com/dashboard')
console.log()
console.log('2. Click on your Calendar app project')
console.log()
console.log('3. Go to: Settings → Environment Variables')
console.log()
console.log('4. Update these variables:')
console.log()
console.log('   Variable: NEXT_PUBLIC_SUPABASE_URL')
console.log('   Value:    [Use the correct staging Supabase URL]')
console.log()
console.log('   Variable: NEXT_PUBLIC_SUPABASE_ANON_KEY')
console.log('   Value:    [Use the correct staging Supabase anon key]')
console.log()
console.log('5. Click "Save" for each variable')
console.log()
console.log('6. Go to Deployments tab and click "Redeploy" on latest deployment')
console.log()

console.log('⚡ AFTER FIXING:')
console.log('================')
console.log('✅ Your production app will connect to the correct Supabase project')
console.log('✅ Email confirmations will work')
console.log('✅ Signup will work properly')
console.log('✅ No more 500 errors')
console.log()

console.log('🧪 TO TEST LOCALLY (meanwhile):')
console.log('================================')
console.log('Your local environment is already correct!')
console.log('Run: npm run dev')
console.log('Then test signup at: http://localhost:3000/auth/signup')
console.log()

console.log('💡 WHY THIS HAPPENED:')
console.log('======================')
console.log('Your local .env.local has the correct project, but Vercel production')
console.log('environment variables still had the old project from before we fixed it.')
console.log()
console.log('Once you update Vercel, both local AND production will work! 🎉')
