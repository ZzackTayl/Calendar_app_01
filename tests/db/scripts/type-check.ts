#!/usr/bin/env tsx
/**
 * Type Consistency Validation Script
 * Usage: npm run test:db:types
 */

import { validateTypeConsistency, generateTypeConsistencyReport } from '../type-consistency';

async function main() {
  console.log('🔧 Running type consistency validation...');
  
  try {
    const result = await validateTypeConsistency();
    
    if (result.passed) {
      console.log('✅ Type consistency validation: PASSED');
    } else {
      console.log('❌ Type consistency validation: FAILED');
      console.log('\nErrors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

    // Generate detailed report
    const report = await generateTypeConsistencyReport();
    console.log('\n' + '='.repeat(50));
    console.log(report);

    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('❌ Type consistency validation failed:', error);
    process.exit(1);
  }
}

main();