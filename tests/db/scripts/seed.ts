#!/usr/bin/env tsx
/**
 * Database Seeding Script
 * Usage: npm run test:db:seed
 */

import { seedTestDatabase } from '../seed-data';

async function main() {
  console.log('🌱 Starting database seeding...');
  
  try {
    await seedTestDatabase();
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

main();