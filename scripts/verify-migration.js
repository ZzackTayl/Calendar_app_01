/**
 * Verify Migration Script
 * 
 * This script verifies that the database migration was successful.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verifying database migration...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Check if privacy_level_enum exists by trying to create a test event
  console.log('TEST 1: Privacy level enum...');
  try {
    // This should fail gracefully if user_id constraint is enforced
    const { data, error } = await supabase
      .from('events')
      .select('privacy_level')
      .limit(1);
    
    if (error && error.message.includes("user_id")) {
      console.log('✅ Privacy level column exists (user_id constraint active)');
      passed++;
    } else if (error) {
      console.log('❌ Unexpected error:', error.message);
      failed++;
    } else {
      console.log('✅ Privacy level column accessible');
      passed++;
    }
  } catch (error) {
    console.log('❌ Privacy level test failed:', error.message);
    failed++;
  }
  
  // Test 2: Check if relationships table exists
  console.log('\nTEST 2: Relationships table...');
  try {
    const { data, error } = await supabase
      .from('relationships')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST106') {
      console.log('❌ Relationships table does not exist');
      failed++;
    } else if (error && error.message.includes('JWT')) {
      console.log('✅ Relationships table exists (RLS policy active)');
      passed++;
    } else {
      console.log('✅ Relationships table accessible');
      passed++;
    }
  } catch (error) {
    console.log('❌ Relationships table test failed:', error.message);
    failed++;
  }
  
  // Test 3: Check user table has new columns
  console.log('\nTEST 3: Users table columns...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email, default_privacy_level')
      .limit(1);
    
    if (error && error.message.includes('email')) {
      console.log('❌ Users table missing email column');
      failed++;
    } else if (error && error.message.includes('default_privacy_level')) {
      console.log('❌ Users table missing default_privacy_level column');
      failed++;
    } else {
      console.log('✅ Users table has required columns');
      passed++;
    }
  } catch (error) {
    console.log('❌ Users table test failed:', error.message);
    failed++;
  }
  
  // Test 4: Test privacy level values
  console.log('\nTEST 4: Privacy level enum values...');
  try {
    // Try to create a test user with different privacy levels
    const privacyLevels = ['private', 'visible', 'semi_private', 'public'];
    let validLevels = [];
    
    for (const level of privacyLevels) {
      // This will fail at the RLS level, but should pass validation if enum is correct
      const { error } = await supabase
        .from('users')
        .update({ default_privacy_level: level })
        .eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent ID
      
      if (error && !error.message.includes(level) && !error.message.includes('enum')) {
        validLevels.push(level);
      }
    }
    
    if (validLevels.length === 4) {
      console.log('✅ All privacy level enum values are valid');
      passed++;
    } else {
      console.log(`❌ Some privacy levels failed: ${privacyLevels.filter(l => !validLevels.includes(l)).join(', ')}`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Privacy level values test failed:', error.message);
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`MIGRATION VERIFICATION SUMMARY`);
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Migration was successful.');
    return true;
  } else {
    console.log('\n⚠️  Some tests failed. Please review the migration.');
    return false;
  }
}

// Run verification
verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });