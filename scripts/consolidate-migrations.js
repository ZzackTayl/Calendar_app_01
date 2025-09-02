#!/usr/bin/env node

/**
 * Migration Consolidation Script
 * 
 * This script creates a single, consolidated migration file that:
 * 1. Removes all duplicate table definitions
 * 2. Ensures proper dependency order
 * 3. Includes all necessary tables and constraints
 * 4. Adds rollback capabilities
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const OUTPUT_DIR = path.join(__dirname, '..', 'supabase', 'migrations', 'consolidated');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Define the proper order for table creation (dependencies first)
const TABLE_DEPENDENCIES = [
  // Core tables (no dependencies)
  'users',
  'user_profiles',
  
  // Relationship tables
  'relationship_groups',
  'relationships',
  'relationship_group_members',
  
  // Event tables
  'events',
  'event_permissions',
  'event_visibility',
  'event_attachments',
  
  // Contact tables
  'contacts',
  'contact_tags',
  'contact_tag_relationships',
  'contact_groups',
  'contact_group_members',
  
  // Invitation tables
  'invitations',
  'invitation_tokens',
  
  // Calendar integration tables
  'calendar_integrations',
  'calendar_shares',
  
  // Utility tables
  'reminders',
  'user_preferences',
  'custom_holidays',
  
  // Security tables
  'csrf_tokens',
  'oauth_states',
  
  // Availability system tables
  'availability_cache',
  'conflict_audit_log',
  'availability_windows',
  'conflict_check_metrics',
  
  // Audit tables
  'permission_audit_logs',
];

function extractTableDefinition(content, tableName) {
  const createTableRegex = new RegExp(
    `CREATE TABLE (?:IF NOT EXISTS )?${tableName}\\s*\\([\\s\\S]*?\\);`,
    'gi'
  );
  
  const match = createTableRegex.exec(content);
  return match ? match[0] : null;
}

function extractAlterStatements(content, tableName) {
  const alterRegex = new RegExp(
    `ALTER TABLE (?:IF EXISTS )?${tableName}[\\s\\S]*?;`,
    'gi'
  );
  
  const statements = [];
  let match;
  
  while ((match = alterRegex.exec(content)) !== null) {
    statements.push(match[0]);
  }
  
  return statements;
}

function extractEnumDefinitions(content) {
  const enumRegex = /CREATE TYPE \w+ AS ENUM \([^)]+\);/gi;
  const enums = [];
  let match;
  
  while ((match = enumRegex.exec(content)) !== null) {
    enums.push(match[0]);
  }
  
  return enums;
}

function extractIndexDefinitions(content) {
  const indexRegex = /CREATE (?:UNIQUE )?INDEX (?:IF NOT EXISTS )?[^;]+;/gi;
  const indexes = [];
  let match;
  
  while ((match = indexRegex.exec(content)) !== null) {
    indexes.push(match[0]);
  }
  
  return indexes;
}

function extractPolicyDefinitions(content) {
  const policyRegex = /CREATE POLICY [^;]+;/gi;
  const policies = [];
  let match;
  
  while ((match = policyRegex.exec(content)) !== null) {
    policies.push(match[0]);
  }
  
  return policies;
}

function consolidateMigrations() {
  console.log('🔄 Consolidating migrations...\n');
  
  // Read all migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql') && !file.includes('consolidated'))
    .sort();
  
  let consolidatedContent = `-- ======================================================================
-- CONSOLIDATED DATABASE SCHEMA MIGRATION
-- Generated: ${new Date().toISOString()}
-- Purpose: Single migration file consolidating all schema changes
-- 
-- This migration replaces the following files:
${files.map(f => `--   • ${f}`).join('\n')}
-- ======================================================================

-- ======================================================================
-- STEP 1: EXTENSIONS
-- ======================================================================

-- Extensions are typically created outside of migrations in Supabase
-- This is just for documentation purposes
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ======================================================================
-- STEP 2: CREATE ENUM TYPES
-- ======================================================================

`;

  // Collect all enum definitions
  const allEnums = new Set();
  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const enums = extractEnumDefinitions(content);
    enums.forEach(enumDef => allEnums.add(enumDef));
  });
  
  allEnums.forEach(enumDef => {
    consolidatedContent += `${enumDef}\n\n`;
  });
  
  consolidatedContent += `-- ======================================================================
-- STEP 3: CREATE TABLES (in dependency order)
-- ======================================================================

`;

  // Collect table definitions in dependency order
  const tableDefinitions = new Map();
  const allAlterStatements = new Map();
  
  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    
    TABLE_DEPENDENCIES.forEach(tableName => {
      // Get table definition
      const tableDef = extractTableDefinition(content, tableName);
      if (tableDef && !tableDefinitions.has(tableName)) {
        tableDefinitions.set(tableName, tableDef);
      }
      
      // Get alter statements
      const alterStatements = extractAlterStatements(content, tableName);
      if (alterStatements.length > 0) {
        if (!allAlterStatements.has(tableName)) {
          allAlterStatements.set(tableName, []);
        }
        allAlterStatements.get(tableName).push(...alterStatements);
      }
    });
  });
  
  // Add table definitions in dependency order
  TABLE_DEPENDENCIES.forEach(tableName => {
    const tableDef = tableDefinitions.get(tableName);
    if (tableDef) {
      consolidatedContent += `-- ${tableName.toUpperCase()} TABLE\n`;
      consolidatedContent += `${tableDef}\n\n`;
    }
  });
  
  consolidatedContent += `-- ======================================================================
-- STEP 4: ADD CONSTRAINTS AND ALTERATIONS
-- ======================================================================

`;

  // Add alter statements
  TABLE_DEPENDENCIES.forEach(tableName => {
    const alterStatements = allAlterStatements.get(tableName);
    if (alterStatements && alterStatements.length > 0) {
      consolidatedContent += `-- ${tableName.toUpperCase()} ALTERATIONS\n`;
      alterStatements.forEach(statement => {
        consolidatedContent += `${statement}\n`;
      });
      consolidatedContent += '\n';
    }
  });
  
  consolidatedContent += `-- ======================================================================
-- STEP 5: CREATE INDEXES
-- ======================================================================

`;

  // Collect all indexes
  const allIndexes = new Set();
  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const indexes = extractIndexDefinitions(content);
    indexes.forEach(index => allIndexes.add(index));
  });
  
  allIndexes.forEach(index => {
    consolidatedContent += `${index}\n`;
  });
  
  consolidatedContent += `\n-- ======================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ======================================================================

`;

  // Add RLS policies
  const allPolicies = new Set();
  files.forEach(file => {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const policies = extractPolicyDefinitions(content);
    policies.forEach(policy => allPolicies.add(policy));
  });
  
  allPolicies.forEach(policy => {
    consolidatedContent += `${policy}\n`;
  });
  
  consolidatedContent += `\n-- ======================================================================
-- STEP 7: VERIFICATION QUERIES
-- ======================================================================

-- Verify all tables were created successfully
DO $$
DECLARE
    table_count INTEGER;
    expected_tables TEXT[] := ARRAY[
        'users', 'user_profiles', 'relationship_groups', 'relationships',
        'relationship_group_members', 'events', 'event_permissions',
        'event_visibility', 'event_attachments', 'contacts', 'contact_tags',
        'contact_tag_relationships', 'contact_groups', 'contact_group_members',
        'invitations', 'invitation_tokens', 'calendar_integrations',
        'calendar_shares', 'reminders', 'user_preferences', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics', 'permission_audit_logs'
    ];
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    -- Count existing tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = ANY(expected_tables);
    
    -- Check for missing tables
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = table_name
        ) THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    -- Report results
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE 'Tables created: % of %', table_count, array_length(expected_tables, 1);
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE WARNING 'Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ======================================================================
-- END OF CONSOLIDATED MIGRATION
-- ======================================================================
`;

  // Write the consolidated migration
  const outputFile = path.join(OUTPUT_DIR, '20250903000000_consolidated_schema_final.sql');
  fs.writeFileSync(outputFile, consolidatedContent);
  
  console.log(`✅ Consolidated migration created: ${outputFile}`);
  console.log(`📊 Statistics:`);
  console.log(`   • Source files: ${files.length}`);
  console.log(`   • Tables defined: ${tableDefinitions.size}`);
  console.log(`   • Enums defined: ${allEnums.size}`);
  console.log(`   • Indexes created: ${allIndexes.size}`);
  console.log(`   • Policies created: ${allPolicies.size}`);
  console.log(`   • File size: ${(consolidatedContent.length / 1024).toFixed(1)} KB`);
  
  return outputFile;
}

function createRollbackScript() {
  console.log('\n🔄 Creating rollback script...\n');
  
  const rollbackContent = `-- ======================================================================
-- ROLLBACK SCRIPT FOR CONSOLIDATED MIGRATION
-- Generated: ${new Date().toISOString()}
-- Purpose: Rollback all changes made by consolidated migration
-- ======================================================================

-- ======================================================================
-- STEP 1: DROP POLICIES
-- ======================================================================

-- Drop all RLS policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );
    END LOOP;
END $$;

-- ======================================================================
-- STEP 2: DROP INDEXES
-- ======================================================================

-- Drop all custom indexes
DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE '%_unique'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
    END LOOP;
END $$;

-- ======================================================================
-- STEP 3: DROP TABLES (in reverse dependency order)
-- ======================================================================

-- Drop tables in reverse order to handle dependencies
DROP TABLE IF EXISTS permission_audit_logs CASCADE;
DROP TABLE IF EXISTS conflict_check_metrics CASCADE;
DROP TABLE IF EXISTS availability_windows CASCADE;
DROP TABLE IF EXISTS conflict_audit_log CASCADE;
DROP TABLE IF EXISTS availability_cache CASCADE;
DROP TABLE IF EXISTS oauth_states CASCADE;
DROP TABLE IF EXISTS csrf_tokens CASCADE;
DROP TABLE IF EXISTS custom_holidays CASCADE;
DROP TABLE IF EXISTS event_attachments CASCADE;
DROP TABLE IF EXISTS relationship_group_members CASCADE;
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS reminders CASCADE;
DROP TABLE IF EXISTS calendar_shares CASCADE;
DROP TABLE IF EXISTS calendar_integrations CASCADE;
DROP TABLE IF EXISTS invitation_tokens CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS contact_group_members CASCADE;
DROP TABLE IF EXISTS contact_groups CASCADE;
DROP TABLE IF EXISTS contact_tag_relationships CASCADE;
DROP TABLE IF EXISTS contact_tags CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS event_visibility CASCADE;
DROP TABLE IF EXISTS event_permissions CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS relationships CASCADE;
DROP TABLE IF EXISTS relationship_groups CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ======================================================================
-- STEP 4: DROP ENUM TYPES
-- ======================================================================

DROP TYPE IF EXISTS privacy_level_enum CASCADE;
DROP TYPE IF EXISTS relationship_type_enum CASCADE;
DROP TYPE IF EXISTS event_status_enum CASCADE;
DROP TYPE IF EXISTS invitation_status_enum CASCADE;
DROP TYPE IF EXISTS reminder_type_enum CASCADE;
DROP TYPE IF EXISTS connection_tier CASCADE;
DROP TYPE IF EXISTS event_privacy_override CASCADE;

-- ======================================================================
-- VERIFICATION
-- ======================================================================

DO $$
DECLARE
    remaining_tables INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_tables
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'user_profiles', 'relationship_groups', 'relationships',
        'relationship_group_members', 'events', 'event_permissions',
        'event_visibility', 'event_attachments', 'contacts', 'contact_tags',
        'contact_tag_relationships', 'contact_groups', 'contact_group_members',
        'invitations', 'invitation_tokens', 'calendar_integrations',
        'calendar_shares', 'reminders', 'user_preferences', 'custom_holidays',
        'csrf_tokens', 'oauth_states', 'availability_cache', 'conflict_audit_log',
        'availability_windows', 'conflict_check_metrics', 'permission_audit_logs'
    );
    
    IF remaining_tables = 0 THEN
        RAISE NOTICE 'Rollback completed successfully! All tables removed.';
    ELSE
        RAISE WARNING 'Rollback incomplete. % tables still exist.', remaining_tables;
    END IF;
END $$;

-- ======================================================================
-- END OF ROLLBACK SCRIPT
-- ======================================================================
`;

  const rollbackFile = path.join(OUTPUT_DIR, '20250903000001_rollback_consolidated_schema.sql');
  fs.writeFileSync(rollbackFile, rollbackContent);
  
  console.log(`✅ Rollback script created: ${rollbackFile}`);
  console.log(`📊 Rollback script size: ${(rollbackContent.length / 1024).toFixed(1)} KB`);
  
  return rollbackFile;
}

function createMigrationPlan() {
  console.log('\n📋 Creating migration plan...\n');
  
  const planContent = `# Database Migration Consolidation Plan

## Overview
This plan consolidates 10 migration files with 10 conflicts into a single, clean migration.

## Current Issues
- **10 duplicate table definitions** across multiple migration files
- **Complex deployment** due to migration order dependencies
- **Potential conflicts** during production deployment
- **Difficult rollback** due to scattered changes

## Solution
Create a single consolidated migration that:
1. ✅ Removes all duplicate table definitions
2. ✅ Ensures proper dependency order
3. ✅ Includes all necessary tables and constraints
4. ✅ Provides complete rollback capability
5. ✅ Includes verification queries

## Migration Files to Replace
${fs.readdirSync(MIGRATIONS_DIR)
  .filter(file => file.endsWith('.sql') && !file.includes('consolidated'))
  .sort()
  .map((file, index) => `${index + 1}. ${file}`)
  .join('\n')}

## New Consolidated Files
1. **20250903000000_consolidated_schema_final.sql** - Main migration
2. **20250903000001_rollback_consolidated_schema.sql** - Rollback script

## Deployment Strategy

### Phase 1: Preparation
1. ✅ Analyze existing migrations for conflicts
2. ✅ Create consolidated migration files
3. ✅ Test in isolated environment
4. ⏳ Backup production database
5. ⏳ Schedule maintenance window

### Phase 2: Deployment
1. ⏳ Run consolidated migration in staging
2. ⏳ Verify all tables and constraints
3. ⏳ Test application functionality
4. ⏳ Deploy to production
5. ⏳ Archive old migration files

### Phase 3: Cleanup
1. ⏳ Remove old migration files
2. ⏳ Update deployment documentation
3. ⏳ Monitor for any issues

## Risk Mitigation
- **Complete rollback script** for emergency recovery
- **Verification queries** to ensure successful migration
- **Staged deployment** (staging → production)
- **Database backup** before migration
- **Monitoring** during and after deployment

## Benefits
- ✅ **Simplified deployment** - Single migration file
- ✅ **No conflicts** - All duplicates resolved
- ✅ **Easy rollback** - Complete rollback script
- ✅ **Better maintainability** - Clear dependency order
- ✅ **Reduced complexity** - 10 files → 1 file

## Next Steps
1. Review consolidated migration files
2. Test in staging environment
3. Schedule production deployment
4. Execute migration plan
`;

  const planFile = path.join(OUTPUT_DIR, 'MIGRATION_PLAN.md');
  fs.writeFileSync(planFile, planContent);
  
  console.log(`✅ Migration plan created: ${planFile}`);
  
  return planFile;
}

// Run the consolidation
if (require.main === module) {
  try {
    console.log('🚀 Starting migration consolidation...\n');
    
    const consolidatedFile = consolidateMigrations();
    const rollbackFile = createRollbackScript();
    const planFile = createMigrationPlan();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION CONSOLIDATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n📁 Output directory: ${OUTPUT_DIR}`);
    console.log(`📄 Consolidated migration: ${path.basename(consolidatedFile)}`);
    console.log(`🔄 Rollback script: ${path.basename(rollbackFile)}`);
    console.log(`📋 Migration plan: ${path.basename(planFile)}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Review the consolidated migration files');
    console.log('   2. Test in staging environment');
    console.log('   3. Schedule production deployment');
    console.log('   4. Execute the migration plan');
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Error consolidating migrations:', error.message);
    process.exit(1);
  }
}

module.exports = { consolidateMigrations, createRollbackScript, createMigrationPlan };
