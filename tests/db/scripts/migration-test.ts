#!/usr/bin/env tsx
/**
 * Migration Testing Script
 * Usage: npm run test:db:migration
 */

import { testAllMigrations, generateMigrationTestReport } from '../migration-testing';

async function main() {
  console.log('🔄 Running migration tests...');
  
  try {
    const result = await testAllMigrations();
    
    if (result.totalFailed === 0) {
      console.log('✅ Migration tests: PASSED');
      console.log(`${result.totalPassed}/${result.migrations.length} migrations passed`);
    } else {
      console.log('❌ Migration tests: FAILED');
      console.log(`${result.totalFailed}/${result.migrations.length} migrations failed`);
      
      // Show failed migrations
      result.migrations
        .filter(m => !m.passed)
        .forEach(migration => {
          console.log(`\n❌ ${migration.migrationFile}:`);
          migration.errors.forEach(error => console.log(`  - ${error}`));
        });
    }

    // Generate detailed report
    const report = await generateMigrationTestReport();
    console.log('\n' + '='.repeat(50));
    console.log(report);

    process.exit(result.totalFailed === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Migration testing failed:', error);
    process.exit(1);
  }
}

main();