#!/usr/bin/env node

/**
 * Database Schema Verification Script
 * 
 * This script checks what tables actually exist in your production database
 * before running any RLS migrations. Run this first to see what's available.
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifyDatabaseSchema() {
  console.log('🔍 VERIFYING DATABASE SCHEMA\n');
  console.log(`📡 Connected to: ${SUPABASE_URL}\n`);
  
  // Core tables we're looking for
  const expectedTables = [
    'relationships',     // HIGHEST PRIORITY
    'users', 
    'events',
    'contacts',
    'invitations',
    'relationship_groups',
    'relationship_group_members'
  ];
  
  console.log('🎯 CHECKING CRITICAL TABLES:');
  const existingTables = [];
  const missingTables = [];
  
  for (const table of expectedTables) {
    try {
      // Try to query the table with limit 0 to check existence
      const { error } = await adminClient
        .from(table)
        .select('*')
        .limit(0);
      
      if (!error) {
        existingTables.push(table);
        const priority = table === 'relationships' ? '🔥 CRITICAL' : '✅';
        console.log(`   ${priority} ${table}`);
      } else {
        missingTables.push(table);
        console.log(`   ❌ ${table} - ${error.message}`);
      }
    } catch (err) {
      missingTables.push(table);
      console.log(`   ❌ ${table} - ${err.message}`);
    }
  }
  
  console.log('\n📊 SCHEMA ANALYSIS:');
  console.log(`   ✅ Found tables: ${existingTables.length}`);
  console.log(`   ❌ Missing tables: ${missingTables.length}`);
  console.log(`   📈 Schema completeness: ${((existingTables.length / expectedTables.length) * 100).toFixed(1)}%`);
  
  if (existingTables.includes('relationships')) {
    console.log('\n🎉 CRITICAL SUCCESS: relationships table found!');
    console.log('   ✅ The safe RLS migration can fix your data access issue.');
  } else {
    console.log('\n❌ CRITICAL ISSUE: relationships table not found!');
    console.log('   ⚠️  Cannot fix relationship data access without this table.');
    console.log('   💡 Check if the table has a different name or schema.');
  }
  
  // Check for any existing RLS policies
  console.log('\n🔍 CHECKING EXISTING RLS POLICIES:');
  try {
    const { data: policies, error } = await adminClient.rpc('exec_sql', {
      sql_query: `
        SELECT 
          tablename,
          policyname,
          cmd,
          roles
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN (${existingTables.map(t => `'${t}'`).join(', ')})
        ORDER BY tablename, policyname;
      `
    });
    
    if (!error && policies) {
      console.log('   📋 Found existing RLS policies (will be updated):');
      // Note: policies might be returned as a string, need to parse
      console.log('   ℹ️  Run the migration to see detailed policy information');
    } else {
      console.log('   ℹ️  No existing RLS policies found or unable to check');
    }
  } catch (err) {
    console.log('   ℹ️  Could not check existing policies (normal for some setups)');
  }
  
  console.log('\n📝 RECOMMENDATIONS:');
  
  if (existingTables.length === 0) {
    console.log('   ❌ No tables found. Check your database connection and schema.');
    console.log('   💡 Verify SUPABASE_SERVICE_ROLE_KEY has proper permissions.');
  } else if (existingTables.includes('relationships')) {
    console.log('   ✅ Ready to run safe RLS migration!');
    console.log('   🚀 Run: node scripts/deploy-safe-rls.js');
    console.log('   📄 Or apply SQL directly: psql -f scripts/safe-rls-policies.sql');
  } else {
    console.log('   ⚠️  Partial schema found. Migration will apply to available tables only.');
    console.log('   🔍 Consider investigating why core tables are missing.');
  }
  
  // List all public tables for reference
  console.log('\n🗂️  ALL PUBLIC TABLES IN DATABASE:');
  try {
    const { data: allTables, error } = await adminClient.rpc('exec_sql', {
      sql_query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `
    });
    
    if (!error) {
      console.log('   📋 Available tables for reference:');
      // Note: result might be a string, so this is informational
      console.log('   ℹ️  Check Supabase dashboard for complete table list');
    }
  } catch (err) {
    console.log('   ℹ️  Could not list all tables (permissions may be limited)');
  }
  
  return {
    existingTables,
    missingTables,
    canProceed: existingTables.length > 0,
    relationshipsFound: existingTables.includes('relationships')
  };
}

// Run verification
if (require.main === module) {
  verifyDatabaseSchema()
    .then((result) => {
      console.log(`\n✨ Schema verification completed!`);
      
      if (result.relationshipsFound) {
        console.log(`🎯 Ready to fix relationship access issue!`);
        process.exit(0);
      } else if (result.canProceed) {
        console.log(`⚠️  Can proceed with partial migration.`);
        process.exit(0);
      } else {
        console.log(`❌ Cannot proceed - no compatible tables found.`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Verification failed:', error.message);
      console.error('🔍 Check your database connection and credentials.');
      process.exit(1);
    });
}

module.exports = { verifyDatabaseSchema };