#!/usr/bin/env tsx
/**
 * Complete Database Validation Script
 * Usage: npm run test:db:validate
 */

import { validateTestDatabaseSchema } from '../schema-validation';
import { validateTypeConsistency } from '../type-consistency';
import { testAllMigrations } from '../migration-testing';

async function main() {
  console.log('🔍 Starting comprehensive database validation...');
  
  let hasErrors = false;

  try {
    // Run schema validation
    console.log('\n📋 Running schema validation...');
    const schemaResult = await validateTestDatabaseSchema();
    
    if (schemaResult.passed) {
      console.log('✅ Schema validation: PASSED');
    } else {
      console.log('❌ Schema validation: FAILED');
      console.log('Errors:', schemaResult.errors);
      hasErrors = true;
    }

    if (schemaResult.warnings.length > 0) {
      console.log('⚠️  Schema warnings:', schemaResult.warnings);
    }

    // Run type consistency validation
    console.log('\n🔧 Running type consistency validation...');
    const typeResult = await validateTypeConsistency();
    
    if (typeResult.passed) {
      console.log('✅ Type consistency validation: PASSED');
    } else {
      console.log('❌ Type consistency validation: FAILED');
      console.log('Errors:', typeResult.errors);
      hasErrors = true;
    }

    if (typeResult.warnings.length > 0) {
      console.log('⚠️  Type warnings:', typeResult.warnings);
    }

    // Run migration tests
    console.log('\n🔄 Running migration tests...');
    const migrationResult = await testAllMigrations();
    
    if (migrationResult.totalFailed === 0) {
      console.log('✅ Migration tests: PASSED');
    } else {
      console.log('❌ Migration tests: FAILED');
      console.log(`${migrationResult.totalFailed}/${migrationResult.migrations.length} migrations failed`);
      hasErrors = true;
    }

    // Summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('===================');
    console.log(`Schema Validation: ${schemaResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Type Consistency: ${typeResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Migration Tests: ${migrationResult.totalFailed === 0 ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (hasErrors) {
      console.log('\n❌ Overall validation: FAILED');
      process.exit(1);
    } else {
      console.log('\n🎉 Overall validation: PASSED');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Validation failed with exception:', error);
    process.exit(1);
  }
}

main();