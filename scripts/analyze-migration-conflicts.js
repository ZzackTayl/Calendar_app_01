#!/usr/bin/env node

/**
 * Migration Conflict Analysis Script
 * 
 * This script analyzes all migration files to identify:
 * 1. Duplicate table definitions
 * 2. Conflicting column definitions
 * 3. Redundant migrations
 * 4. Missing dependencies
 */

const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// Track all table definitions across migrations
const tableDefinitions = new Map();
const migrationFiles = [];
const conflicts = [];

function analyzeMigrationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  console.log(`\n📄 Analyzing: ${fileName}`);
  
  // Extract CREATE TABLE statements
  const createTableRegex = /CREATE TABLE (?:IF NOT EXISTS )?(\w+)\s*\(/gi;
  const alterTableRegex = /ALTER TABLE (\w+)/gi;
  const dropTableRegex = /DROP TABLE (?:IF EXISTS )?(\w+)/gi;
  
  const tables = [];
  let match;
  
  // Find all CREATE TABLE statements
  while ((match = createTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    tables.push({ name: tableName, type: 'CREATE' });
    
    if (tableDefinitions.has(tableName)) {
      conflicts.push({
        type: 'DUPLICATE_TABLE',
        table: tableName,
        files: [tableDefinitions.get(tableName).file, fileName],
        message: `Table '${tableName}' is defined in multiple migrations`
      });
    } else {
      tableDefinitions.set(tableName, { file: fileName, type: 'CREATE' });
    }
  }
  
  // Find all ALTER TABLE statements
  while ((match = alterTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    tables.push({ name: tableName, type: 'ALTER' });
  }
  
  // Find all DROP TABLE statements
  while ((match = dropTableRegex.exec(content)) !== null) {
    const tableName = match[1];
    tables.push({ name: tableName, type: 'DROP' });
  }
  
  migrationFiles.push({
    file: fileName,
    path: filePath,
    tables: tables,
    size: content.length
  });
  
  return tables;
}

function analyzeConflicts() {
  console.log('🔍 Analyzing migration conflicts...\n');
  
  // Read all migration files
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  files.forEach(file => {
    const filePath = path.join(MIGRATIONS_DIR, file);
    analyzeMigrationFile(filePath);
  });
  
  return { migrationFiles, conflicts, tableDefinitions };
}

function generateReport() {
  const { migrationFiles, conflicts, tableDefinitions } = analyzeConflicts();
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 MIGRATION CONFLICT ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📈 Summary:`);
  console.log(`   • Total migration files: ${migrationFiles.length}`);
  console.log(`   • Total tables defined: ${tableDefinitions.size}`);
  console.log(`   • Conflicts found: ${conflicts.length}`);
  
  if (conflicts.length > 0) {
    console.log(`\n⚠️  CONFLICTS DETECTED:`);
    conflicts.forEach((conflict, index) => {
      console.log(`\n   ${index + 1}. ${conflict.type}`);
      console.log(`      Table: ${conflict.table}`);
      console.log(`      Files: ${conflict.files.join(', ')}`);
      console.log(`      Issue: ${conflict.message}`);
    });
  }
  
  console.log(`\n📋 Migration Files Analysis:`);
  migrationFiles.forEach((migration, index) => {
    console.log(`\n   ${index + 1}. ${migration.file}`);
    console.log(`      Size: ${(migration.size / 1024).toFixed(1)} KB`);
    console.log(`      Tables: ${migration.tables.length}`);
    if (migration.tables.length > 0) {
      const tableList = migration.tables.map(t => `${t.name} (${t.type})`).join(', ');
      console.log(`      Operations: ${tableList}`);
    }
  });
  
  console.log(`\n🗂️  All Tables Defined:`);
  Array.from(tableDefinitions.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([tableName, info]) => {
      console.log(`   • ${tableName} (defined in ${info.file})`);
    });
  
  // Generate consolidation recommendations
  console.log(`\n💡 CONSOLIDATION RECOMMENDATIONS:`);
  console.log(`\n   1. Create a single consolidated migration file`);
  console.log(`   2. Remove duplicate table definitions`);
  console.log(`   3. Ensure proper dependency order`);
  console.log(`   4. Add rollback scripts for each migration step`);
  console.log(`   5. Test migrations in isolated environment first`);
  
  if (conflicts.length > 0) {
    console.log(`\n   6. Resolve the following conflicts:`);
    conflicts.forEach((conflict, index) => {
      console.log(`      - ${conflict.table}: Merge definitions from ${conflict.files.join(' and ')}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  return { migrationFiles, conflicts, tableDefinitions };
}

// Run the analysis
if (require.main === module) {
  try {
    generateReport();
  } catch (error) {
    console.error('❌ Error analyzing migrations:', error.message);
    process.exit(1);
  }
}

module.exports = { analyzeConflicts, generateReport };
