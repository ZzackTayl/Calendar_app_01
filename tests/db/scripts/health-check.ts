#!/usr/bin/env tsx
/**
 * Database Health Check Script
 * Usage: npm run test:db:health
 */

import { dbTestUtils } from '../test-utilities';

async function main() {
  console.log('🏥 Running database health check...');
  
  try {
    const healthResult = await dbTestUtils.healthCheck();
    
    if (healthResult.healthy) {
      console.log('✅ Database health check: PASSED');
      console.log('All systems operational');
    } else {
      console.log('❌ Database health check: FAILED');
      console.log('\nFailed checks:');
      Object.entries(healthResult.checks).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`  - ${check}: FAILED`);
        }
      });
      
      if (healthResult.errors.length > 0) {
        console.log('\nErrors:');
        healthResult.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

    // Show detailed status
    console.log('\n📊 HEALTH CHECK DETAILS');
    console.log('=======================');
    Object.entries(healthResult.checks).forEach(([check, passed]) => {
      console.log(`${check}: ${passed ? '✅ OK' : '❌ FAILED'}`);
    });

    // Get database statistics
    const stats = await dbTestUtils.getDatabaseStats();
    console.log('\n📈 DATABASE STATISTICS');
    console.log('======================');
    Object.entries(stats).forEach(([table, count]) => {
      console.log(`${table}: ${count >= 0 ? count : 'ERROR'} records`);
    });

    process.exit(healthResult.healthy ? 0 : 1);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  }
}

main();