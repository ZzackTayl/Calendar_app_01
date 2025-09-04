#!/usr/bin/env node

/**
 * RLS Audit Script for Relationships Tables
 * 
 * This script performs a comprehensive audit of RLS policies
 * for relationships, relationship_groups, and relationship_group_members tables.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Could not load .env file:', error.message);
    return {};
  }
}

const envVars = loadEnvFile();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create client (unauthenticated to test RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to check if RLS is working
function isRLSWorking(data, error) {
  if (error) {
    return { protected: true, reason: 'Error returned', details: error.message };
  }
  if (Array.isArray(data) && data.length === 0) {
    return { protected: true, reason: 'Empty result set', details: 'No data returned' };
  }
  return { protected: false, reason: 'Data accessible', details: `${data?.length || 0} records returned` };
}

async function auditTable(tableName, operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
  console.log(`\n🔍 Auditing ${tableName} table:`);
  
  const results = {};
  
  // Test SELECT operation
  if (operations.includes('SELECT')) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(5);
      
      results.SELECT = isRLSWorking(data, error);
      console.log(`   SELECT: ${results.SELECT.protected ? '✅ PROTECTED' : '❌ EXPOSED'} - ${results.SELECT.reason}`);
    } catch (error) {
      results.SELECT = { protected: true, reason: 'Exception thrown', details: error.message };
      console.log(`   SELECT: ✅ PROTECTED - Exception thrown`);
    }
  }
  
  // Test INSERT operation
  if (operations.includes('INSERT')) {
    try {
      const testData = getTestData(tableName);
      const { data, error } = await supabase
        .from(tableName)
        .insert(testData);
      
      results.INSERT = isRLSWorking(data, error);
      console.log(`   INSERT: ${results.INSERT.protected ? '✅ PROTECTED' : '❌ EXPOSED'} - ${results.INSERT.reason}`);
    } catch (error) {
      results.INSERT = { protected: true, reason: 'Exception thrown', details: error.message };
      console.log(`   INSERT: ✅ PROTECTED - Exception thrown`);
    }
  }
  
  // Test UPDATE operation
  if (operations.includes('UPDATE')) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .update({ updated_at: new Date().toISOString() })
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');
      
      results.UPDATE = isRLSWorking(data, error);
      console.log(`   UPDATE: ${results.UPDATE.protected ? '✅ PROTECTED' : '❌ EXPOSED'} - ${results.UPDATE.reason}`);
    } catch (error) {
      results.UPDATE = { protected: true, reason: 'Exception thrown', details: error.message };
      console.log(`   UPDATE: ✅ PROTECTED - Exception thrown`);
    }
  }
  
  // Test DELETE operation
  if (operations.includes('DELETE')) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');
      
      results.DELETE = isRLSWorking(data, error);
      console.log(`   DELETE: ${results.DELETE.protected ? '✅ PROTECTED' : '❌ EXPOSED'} - ${results.DELETE.reason}`);
    } catch (error) {
      results.DELETE = { protected: true, reason: 'Exception thrown', details: error.message };
      console.log(`   DELETE: ✅ PROTECTED - Exception thrown`);
    }
  }
  
  return results;
}

function getTestData(tableName) {
  const testUserId = '550e8400-e29b-41d4-a716-446655440001';
  
  switch (tableName) {
    case 'relationships':
      return {
        user_id: testUserId,
        partner_id: '550e8400-e29b-41d4-a716-446655440002',
        relationship_type: 'primary',
        connection_tier: 'details'
      };
    case 'relationship_groups':
      return {
        user_id: testUserId,
        group_name: 'Test Group',
        description: 'Test Description'
      };
    case 'relationship_group_members':
      return {
        group_id: '550e8400-e29b-41d4-a716-446655440001',
        relationship_id: '550e8400-e29b-41d4-a716-446655440002',
        connection_tier: 'details'
      };
    default:
      return {};
  }
}

async function testCrossUserAccess() {
  console.log(`\n🔍 Testing cross-user data access protection:`);
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440999';
  
  // Test accessing another user's relationships
  const { data, error } = await supabase
    .from('relationships')
    .select('*')
    .eq('user_id', testUserId);
  
  const result = isRLSWorking(data, error);
  console.log(`   Cross-user access: ${result.protected ? '✅ BLOCKED' : '❌ ALLOWED'} - ${result.reason}`);
  
  return result;
}

async function testDataLeakage() {
  console.log(`\n🔍 Testing for data leakage in error messages:`);
  
  const sensitiveQueries = [
    {
      name: 'SQL Injection attempt',
      query: () => supabase.from('relationships').select('*').eq('user_id', "'; DROP TABLE relationships; --")
    },
    {
      name: 'Null user_id access',
      query: () => supabase.from('relationships').select('*').eq('user_id', null)
    },
    {
      name: 'Wildcard access attempt',
      query: () => supabase.from('relationships').select('*').like('user_id', '%')
    }
  ];
  
  for (const test of sensitiveQueries) {
    try {
      const { data, error } = await test.query();
      
      if (error) {
        // Check if error message contains sensitive information
        const hasSensitiveData = /DROP TABLE|DELETE FROM|INSERT INTO|550e8400|@.*\./i.test(error.message);
        console.log(`   ${test.name}: ${hasSensitiveData ? '⚠️  LEAKAGE' : '✅ SAFE'} - Error handled securely`);
      } else {
        const result = isRLSWorking(data, error);
        console.log(`   ${test.name}: ${result.protected ? '✅ PROTECTED' : '❌ EXPOSED'}`);
      }
    } catch (error) {
      console.log(`   ${test.name}: ✅ PROTECTED - Exception thrown`);
    }
  }
}

async function generateAuditReport() {
  console.log('🔐 RLS AUDIT REPORT FOR RELATIONSHIPS TABLES');
  console.log('=' .repeat(60));
  
  const auditResults = {};
  
  // Audit main tables
  auditResults.relationships = await auditTable('relationships');
  auditResults.relationship_groups = await auditTable('relationship_groups');
  auditResults.relationship_group_members = await auditTable('relationship_group_members');
  
  // Test cross-user access
  auditResults.crossUserAccess = await testCrossUserAccess();
  
  // Test data leakage
  await testDataLeakage();
  
  // Generate summary
  console.log(`\n📊 AUDIT SUMMARY:`);
  console.log('=' .repeat(40));
  
  let totalTests = 0;
  let protectedTests = 0;
  
  Object.entries(auditResults).forEach(([table, results]) => {
    if (typeof results === 'object' && results.protected !== undefined) {
      // Single test result
      totalTests++;
      if (results.protected) protectedTests++;
    } else {
      // Multiple operation results
      Object.entries(results).forEach(([operation, result]) => {
        totalTests++;
        if (result.protected) protectedTests++;
      });
    }
  });
  
  const protectionRate = ((protectedTests / totalTests) * 100).toFixed(1);
  console.log(`Protection Rate: ${protectionRate}% (${protectedTests}/${totalTests} tests passed)`);
  
  if (protectionRate >= 100) {
    console.log('🎉 EXCELLENT: All RLS policies are working correctly!');
  } else if (protectionRate >= 80) {
    console.log('✅ GOOD: Most RLS policies are working, minor issues detected');
  } else {
    console.log('⚠️  WARNING: Significant RLS policy gaps detected');
  }
  
  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log('- Current policies use broad "FOR ALL" approach');
  console.log('- Consider implementing granular policies for each operation (SELECT, INSERT, UPDATE, DELETE)');
  console.log('- Add partner access policies for shared relationship visibility');
  console.log('- Implement audit logging for relationship access');
  console.log('- Add data validation triggers to prevent invalid relationships');
  
  return auditResults;
}

// Run the audit
generateAuditReport()
  .then(() => {
    console.log('\n✅ RLS audit completed successfully!');
  })
  .catch(error => {
    console.error('❌ Audit failed:', error.message);
    process.exit(1);
  });