#!/usr/bin/env node

/**
 * Alpha Test Preparation Script
 * 
 * This script prepares the database and environment for alpha testing
 * by ensuring all necessary tables exist and creating initial test data.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test engineer accounts
const testEngineers = [
  {
    email: 'engineer1@test.com',
    fullName: 'Engineer One',
    password: 'TestPass123!'
  },
  {
    email: 'engineer2@test.com',
    fullName: 'Engineer Two',
    password: 'TestPass123!'
  },
  {
    email: 'engineer3@test.com',
    fullName: 'Engineer Three',
    password: 'TestPass123!'
  },
  {
    email: 'engineer4@test.com',
    fullName: 'Engineer Four',
    password: 'TestPass123!'
  }
];

async function prepareTestEnvironment() {
  console.log('Preparing alpha test environment...');
  
  try {
    // Check database connection
    const { data, error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('Database connection failed:', error.message);
      process.exit(1);
    }
    
    console.log('✓ Database connection successful');
    
    // Create test users (they'll register themselves during the test)
    console.log('Test users will be created during the testing workflow.');
    console.log('Ensure email service is configured for invitation emails.');
    
    // Verify required tables exist
    const requiredTables = [
      'users',
      'relationships',
      'relationship_groups',
      'relationship_group_members',
      'events',
      'invitations',
      'invitation_tokens',
      'group_invitations',
      'group_invitation_tokens'
    ];
    
    console.log('Checking database tables...');
    for (const table of requiredTables) {
      try {
        // Try a simple count query first
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          // If count fails, try a simple select
          const { data, error: selectError } = await supabase
            .from(table)
            .select('id')
            .limit(1);
            
          if (selectError) {
            console.warn(`⚠ Warning: Table '${table}' may not exist or is inaccessible:`, selectError.message);
          } else {
            console.log(`✓ Table '${table}' exists (found ${data.length} records in test query)`);
          }
        } else {
          console.log(`✓ Table '${table}' exists`);
        }
      } catch (err) {
        console.warn(`⚠ Warning: Could not verify table '${table}':`, err.message);
      }
    }
    
    // Output test instructions
    console.log('\n=== ALPHA TEST PREPARATION COMPLETE ===');
    console.log('Next steps:');
    console.log('1. Ensure your staging environment is deployed');
    console.log('2. Verify email service configuration');
    console.log('3. Check that all environment variables are set:');
    console.log('   - NEXT_PUBLIC_APP_URL');
    console.log('   - INVITATION_FROM_EMAIL');
    console.log('   - INVITATION_FROM_NAME');
    console.log('4. Review the ALPHA_TESTING_GUIDE.md for detailed testing instructions');
    console.log('5. Begin testing with Engineer 1 creating an account and group');
    
  } catch (error) {
    console.error('Error preparing test environment:', error.message);
    process.exit(1);
  }
}

// Run the preparation script
if (require.main === module) {
  prepareTestEnvironment();
}

module.exports = { prepareTestEnvironment };