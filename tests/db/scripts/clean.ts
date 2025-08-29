#!/usr/bin/env tsx
/**
 * Database Cleanup Script
 * Usage: npm run test:db:clean
 */

import { cleanTestDatabase } from '../cleanup';

async function main() {
  console.log('🧹 Starting database cleanup...');
  
  try {
    await cleanTestDatabase();
    console.log('🎉 Database cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    process.exit(1);
  }
}

main();