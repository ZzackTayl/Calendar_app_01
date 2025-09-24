#!/usr/bin/env node

/**
 * Comprehensive Database Verification Tests
 *
 * This script performs systematic verification of all database components
 * after schema fixes, providing detailed pass/fail reports.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 COMPREHENSIVE DATABASE VERIFICATION TESTS');
console.log('==========================================\n');

const results = {
  connectivity: { status: 'unknown', details: [] },
  tables: { status: 'unknown', details: [] },
  rls_policies: { status: 'unknown', details: [] },
  user_operations: { status: 'unknown', details: [] },
  service_role: { status: 'unknown', details: [] },
  schema_alignment: { status: 'unknown', details: [] }
};

// Test 1: Database Connectivity
async function testConnectivity() {
  console.log('1. TESTING DATABASE CONNECTIVITY');
  console.log('===============================');

  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    // Test basic connection
    const { data, error } = await supabaseAnon
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      results.connectivity.status = 'FAIL';
      results.connectivity.details.push(`❌ Anon connection failed: ${error.message}`);
    } else {
      results.connectivity.status = 'PASS';
      results.connectivity.details.push('✅ Anon connection successful');
    }

    // Test service role connection
    if (serviceRoleKey) {
      const supabaseService = createClient(supabaseUrl, serviceRoleKey);
      const { error: serviceError } = await supabaseService
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (serviceError) {
        results.service_role.status = 'FAIL';
        results.service_role.details.push(`❌ Service role connection failed: ${serviceError.message}`);
      } else {
        results.service_role.status = 'PASS';
        results.service_role.details.push('✅ Service role connection successful');
      }
    } else {
      results.service_role.status = 'FAIL';
      results.service_role.details.push('❌ Service role key not configured');
    }

  } catch (error) {
    results.connectivity.status = 'FAIL';
    results.connectivity.details.push(`❌ Connection error: ${error.message}`);
  }

  console.log('');
}

// Test 2: Table Existence and Structure
async function testTableStructure() {
  console.log('2. TESTING TABLE EXISTENCE AND STRUCTURE');
  console.log('=======================================');

  const requiredTables = [
    'users', 'user_profiles', 'events', 'event_participants',
    'event_tags', 'user_settings', 'notification_settings', 'user_sessions'
  ];

  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    for (const tableName of requiredTables) {
      const { data, error, count } = await supabaseAnon
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        results.tables.status = 'FAIL';
        results.tables.details.push(`❌ ${tableName}: ${error.message}`);
      } else {
        results.tables.status = 'PASS';
        results.tables.details.push(`✅ ${tableName}: ${count || 0} rows`);
      }
    }

  } catch (error) {
    results.tables.status = 'FAIL';
    results.tables.details.push(`❌ Table check error: ${error.message}`);
  }

  console.log('');
}

// Test 3: RLS Policies
async function testRLSPolicies() {
  console.log('3. TESTING RLS POLICIES');
  console.log('=======================');

  const policyTests = [
    {
      table: 'users',
      operation: 'SELECT',
      testData: {},
      expectedError: false
    },
    {
      table: 'user_profiles',
      operation: 'SELECT',
      testData: {},
      expectedError: false
    },
    {
      table: 'events',
      operation: 'SELECT',
      testData: {},
      expectedError: false
    }
  ];

  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    for (const test of policyTests) {
      const { error } = await supabaseAnon
        .from(test.table)
        .select('*', { count: 'exact', head: true });

      if (error && !test.expectedError) {
        results.rls_policies.status = 'FAIL';
        results.rls_policies.details.push(`❌ ${test.table} ${test.operation}: ${error.message}`);
      } else {
        results.rls_policies.status = 'PASS';
        results.rls_policies.details.push(`✅ ${test.table} ${test.operation}: Permitted`);
      }
    }

    // Test policy enforcement (should fail without auth)
    const { error: insertError } = await supabaseAnon
      .from('users')
      .insert({ email: 'test@example.com' });

    if (insertError && insertError.message.includes('row-level security policy')) {
      results.rls_policies.status = 'PASS';
      results.rls_policies.details.push('✅ RLS policies properly enforced (insert blocked without auth)');
    } else {
      results.rls_policies.status = 'FAIL';
      results.rls_policies.details.push('⚠️  RLS policies may not be properly enforced');
    }

  } catch (error) {
    results.rls_policies.status = 'FAIL';
    results.rls_policies.details.push(`❌ RLS test error: ${error.message}`);
  }

  console.log('');
}

// Test 4: User Operations
async function testUserOperations() {
  console.log('4. TESTING USER OPERATIONS');
  console.log('===========================');

  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    // Test operations that should work without auth (public data)
    const publicOperations = [
      { table: 'users', operation: 'SELECT', shouldWork: true },
      { table: 'user_profiles', operation: 'SELECT', shouldWork: true }
    ];

    for (const op of publicOperations) {
      const { error } = await supabaseAnon
        .from(op.table)
        .select('*', { count: 'exact', head: true });

      if (error && op.shouldWork) {
        results.user_operations.status = 'FAIL';
        results.user_operations.details.push(`❌ ${op.table} ${op.operation}: ${error.message}`);
      } else {
        results.user_operations.status = 'PASS';
        results.user_operations.details.push(`✅ ${op.table} ${op.operation}: Working`);
      }
    }

  } catch (error) {
    results.user_operations.status = 'FAIL';
    results.user_operations.details.push(`❌ User operations test error: ${error.message}`);
  }

  console.log('');
}

// Test 5: Schema Alignment
async function testSchemaAlignment() {
  console.log('5. TESTING SCHEMA ALIGNMENT');
  console.log('===========================');

  const requiredTables = [
    'users', 'user_profiles', 'events', 'event_participants',
    'event_tags', 'user_settings', 'notification_settings', 'user_sessions'
  ];

  try {
    const supabaseAnon = createClient(supabaseUrl, anonKey);

    // Test each required table exists by attempting to query it
    const missingTables = [];
    const existingTables = [];

    for (const tableName of requiredTables) {
      const { error } = await supabaseAnon
        .from(tableName)
        .select('count', { count: 'exact', head: true });

      if (error) {
        missingTables.push(tableName);
        results.schema_alignment.details.push(`❌ Table ${tableName}: ${error.message}`);
      } else {
        existingTables.push(tableName);
        results.schema_alignment.details.push(`✅ Table ${tableName}: Exists`);
      }
    }

    if (missingTables.length > 0) {
      results.schema_alignment.status = 'FAIL';
      results.schema_alignment.details.push(`❌ Missing tables: ${missingTables.join(', ')}`);
    } else {
      results.schema_alignment.status = 'PASS';
      results.schema_alignment.details.push(`✅ All required tables present: ${existingTables.join(', ')}`);
    }

  } catch (error) {
    results.schema_alignment.status = 'FAIL';
    results.schema_alignment.details.push(`❌ Schema alignment test error: ${error.message}`);
  }

  console.log('');
}

// Generate Report
function generateReport() {
  console.log('📋 COMPREHENSIVE VERIFICATION REPORT');
  console.log('==================================');

  Object.entries(results).forEach(([component, result]) => {
    const status = result.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    console.log(`\n${component.toUpperCase()}: ${status}`);

    if (result.details.length > 0) {
      result.details.forEach(detail => console.log(`  ${detail}`));
    }
  });

  console.log('\n🔧 RECOMMENDATIONS');
  console.log('=================');

  if (results.service_role.status === 'FAIL') {
    console.log('1. 🔑 SERVICE ROLE KEY: Invalid or expired service role key detected');
    console.log('   - Regenerate the service role key in Supabase dashboard');
    console.log('   - Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  if (results.rls_policies.status === 'FAIL') {
    console.log('2. 🛡️  RLS POLICIES: Row Level Security policies need adjustment');
    console.log('   - Review and fix RLS policies in Supabase dashboard');
    console.log('   - Ensure policies allow appropriate access levels');
  }

  if (results.schema_alignment.status === 'PASS') {
    console.log('3. ✅ SCHEMA: All required tables are present and aligned');
  }

  console.log('\n📊 OVERALL STATUS');
  console.log('================');
  const passedTests = Object.values(results).filter(r => r.status === 'PASS').length;
  const totalTests = Object.keys(results).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);

  console.log(`Passed: ${passedTests}/${totalTests} (${successRate}%)`);

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Database is fully functional!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Database needs attention');
  }
}

// Run all tests
async function runAllTests() {
  await testConnectivity();
  await testTableStructure();
  await testRLSPolicies();
  await testUserOperations();
  await testSchemaAlignment();
  generateReport();
}

runAllTests().catch(console.error);
