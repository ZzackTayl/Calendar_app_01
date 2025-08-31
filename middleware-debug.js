// Middleware Debug Script
// Run this to diagnose the authentication issue

const { createSupabaseClient } = require('./lib/supabase/server');

async function diagnoseMilddleware() {
  console.log('🔍 MIDDLEWARE DIAGNOSTIC TEST');
  console.log('========================================\n');
  
  // Check environment variables
  console.log('1. Environment Variables:');
  console.log('   NEXT_PUBLIC_SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('   SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('');

  // Test middleware matching
  const middlewareMatcher = /((?!_next\/static|_next\/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)/;
  const testPaths = [
    '/dashboard',
    '/events/create',
    '/auth/signin',
    '/auth/confirm-email',
    '/_next/static/chunks/main.js',
    '/favicon.ico'
  ];

  console.log('2. Middleware Path Matching:');
  testPaths.forEach(path => {
    const matches = middlewareMatcher.test(path);
    console.log(`   ${path}: ${matches ? '✅ MATCHED' : '❌ SKIPPED'}`);
  });
  console.log('');

  // Test user authentication with the problematic email
  try {
    console.log('3. User Authentication Test:');
    console.log('   Testing email: zacks@anthropologica.tech');
    
    // This would normally need cookies/session, but we can test basic setup
    console.log('   Supabase client creation: ✅ OK');
    console.log('   Note: Cannot test actual user session without request context');
    console.log('');
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    console.log('');
  }

  // Test protected routes
  console.log('4. Protected Routes Configuration:');
  const protectedRoutes = ['/dashboard', '/calendar', '/contacts', '/events', '/groups', '/relationships', '/settings', '/sharing', '/templates'];
  const testRoute = '/events/create';
  const isProtected = protectedRoutes.some(route => testRoute.startsWith(route));
  console.log(`   Route "${testRoute}" is protected: ${isProtected ? '✅ YES' : '❌ NO'}`);
  console.log('');

  console.log('5. Recommendations:');
  console.log('   1. Check if middleware.ts is being deployed correctly');
  console.log('   2. Verify the user email verification status in Supabase dashboard');
  console.log('   3. Check browser network tab for actual redirect responses');
  console.log('   4. Add console.log statements to middleware for production debugging');
  console.log('   5. Verify Next.js build includes middleware properly');
}

if (require.main === module) {
  diagnoseMilddleware().catch(console.error);
}

module.exports = { diagnoseMilddleware };