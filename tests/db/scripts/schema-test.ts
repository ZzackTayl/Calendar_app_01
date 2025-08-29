#!/usr/bin/env tsx
/**
 * Schema Validation Script
 * Usage: npm run test:db:schema
 */

import { validateTestDatabaseSchema, generateSchemaValidationReport } from '../schema-validation';

async function main() {
  console.log('📋 Running schema validation tests...');
  
  try {
    const result = await validateTestDatabaseSchema();
    
    if (result.passed) {
      console.log('✅ Schema validation: PASSED');
    } else {
      console.log('❌ Schema validation: FAILED');
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Generate detailed report
    const report = await generateSchemaValidationReport();
    console.log('\n' + '='.repeat(50));
    console.log(report);

    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  }
}

main();