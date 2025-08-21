/**
 * Enhanced Schema Deployment Script
 * 
 * This script deploys the enhanced schema to a Supabase database.
 * It uses the Supabase CLI to apply the migration.
 * 
 * Usage:
 * 1. Make sure Supabase CLI is installed: npm install -g supabase
 * 2. Login to Supabase: supabase login
 * 3. Link your project: supabase link --project-ref your-project-ref
 * 4. Run this script: node deploy-enhanced-schema.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const MIGRATION_FILE = path.join(__dirname, '../supabase/migrations/20250822000000_enhanced_mvp_schema.sql');
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a database backup before applying migrations
 */
function createBackup() {
  try {
    console.log('Creating database backup...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);
    
    execSync(`supabase db dump -f ${backupFile}`, { stdio: 'inherit' });
    console.log(`Backup created at ${backupFile}`);
    return true;
  } catch (error) {
    console.error('Failed to create backup:', error.message);
    return false;
  }
}

/**
 * Apply the migration using Supabase CLI
 */
function applyMigration() {
  try {
    console.log('Applying migration...');
    execSync(`supabase migration up`, { stdio: 'inherit' });
    console.log('Migration applied successfully');
    return true;
  } catch (error) {
    console.error('Migration failed:', error.message);
    return false;
  }
}

/**
 * Verify that all tables exist after migration
 */
function verifyMigration() {
  try {
    console.log('Verifying migration...');
    
    // Check that new tables exist
    const tables = [
      'user_profiles',
      'contacts',
      'contact_group_members',
      'event_attachments',
      'event_permissions',
      'event_templates',
      'reminders',
      'custom_holidays'
    ];
    
    // Run a SQL query to verify tables exist
    const checkTablesCmd = `supabase db execute --single-transaction "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('${tables.join("','")}');"`;
    const result = execSync(checkTablesCmd).toString();
    
    console.log('Verification result:', result);
    
    // Simple check to see if output contains all table names
    const missingTables = tables.filter(table => !result.includes(table));
    
    if (missingTables.length > 0) {
      console.error(`Missing tables after migration: ${missingTables.join(', ')}`);
      return false;
    }
    
    console.log('Migration verified successfully. All tables exist.');
    return true;
  } catch (error) {
    console.error('Verification failed:', error.message);
    return false;
  }
}

/**
 * Main deployment function
 */
async function deployEnhancedSchema() {
  console.log('Starting enhanced schema deployment...');
  
  // Validate migration file exists
  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`Migration file not found: ${MIGRATION_FILE}`);
    process.exit(1);
  }
  
  // Create backup
  if (!createBackup()) {
    const response = await askQuestion('Backup failed. Continue anyway? (y/n): ');
    if (response.toLowerCase() !== 'y') {
      console.log('Deployment aborted.');
      process.exit(1);
    }
  }
  
  // Apply migration
  if (!applyMigration()) {
    console.error('Deployment failed during migration step.');
    process.exit(1);
  }
  
  // Verify migration
  if (!verifyMigration()) {
    console.error('Deployment completed but verification failed.');
    process.exit(1);
  }
  
  console.log('Enhanced schema deployment completed successfully!');
}

// Helper function to ask questions
function askQuestion(query) {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => readline.question(query, ans => {
    readline.close();
    resolve(ans);
  }))
}

// Run the deployment
deployEnhancedSchema().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});
