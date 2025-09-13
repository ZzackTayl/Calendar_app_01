#!/usr/bin/env node

/**
 * Fix Authentication Issues Script
 * 
 * This script helps you:
 * 1. Clear all browser storage (cookies, localStorage)
 * 2. Sign out from Supabase
 * 3. Create missing user record in database
 */

console.log('🔧 AUTH ISSUES FIX SCRIPT');
console.log('========================\n');

console.log('YOUR CURRENT ISSUES:');
console.log('1. ❌ You have a lingering session that auto-redirects to dashboard');
console.log('2. ❌ Dashboard has no styling (CSS not loading)');
console.log('3. ❌ Database error: No user record in users table');
console.log('4. ❌ Homepage auto-redirects when it shouldn\'t\n');

console.log('IMMEDIATE FIXES TO APPLY:\n');

console.log('📱 STEP 1: CLEAR YOUR BROWSER');
console.log('==============================');
console.log('1. Open your site in browser');
console.log('2. Open DevTools (F12)');
console.log('3. Go to Application tab → Storage');
console.log('4. Click "Clear site data" button');
console.log('5. OR use an Incognito/Private window\n');

console.log('🔐 STEP 2: SIGN OUT COMPLETELY');
console.log('===============================');
console.log('If you can access any page, add this to the URL:');
console.log('   /api/auth/signout');
console.log('Or run this in browser console:');
console.log(`
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
location.reload();
`);

console.log('\n💾 STEP 3: CREATE USER RECORD IN DATABASE');
console.log('==========================================');
console.log('The error "Cannot coerce the result to a single JSON object" means');
console.log('your user exists in auth.users but NOT in public.users table.\n');

console.log('Go to Supabase SQL Editor and run:');
console.log('-----------------------------------\n');

const createUserSQL = `
-- Check if user exists in auth.users but not in public.users
INSERT INTO public.users (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
  NOW(),
  NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email = 'zacks@anthropologica.tech';

-- Verify the user was created
SELECT * FROM public.users WHERE email = 'zacks@anthropologica.tech';
`;

console.log(createUserSQL);

console.log('\n🚀 STEP 4: FIX THE AUTO-REDIRECT ISSUE');
console.log('========================================');
console.log('The homepage shouldn\'t auto-redirect logged-in users.');
console.log('This needs to be fixed in the code.\n');

console.log('🎨 STEP 5: FIX DASHBOARD STYLING');
console.log('=================================');
console.log('The dashboard CSS isn\'t loading. This might be because:');
console.log('1. Tailwind classes are being purged incorrectly');
console.log('2. CSS file isn\'t being imported properly');
console.log('3. Production build is missing styles\n');

console.log('📋 WHAT TO DO NOW:');
console.log('==================');
console.log('1. ✅ Clear your browser storage (Step 1)');
console.log('2. ✅ Run the SQL query in Supabase (Step 3)');
console.log('3. ✅ Let me fix the code issues (I\'ll do this next)');
console.log('4. ✅ Test in a clean incognito window\n');

console.log('After you clear browser storage and run the SQL, the site should:');
console.log('• Show the homepage (not auto-redirect)');
console.log('• Let you sign in properly');
console.log('• Show dashboard with proper styling');
console.log('• No more database errors\n');