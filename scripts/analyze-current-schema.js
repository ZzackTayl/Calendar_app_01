/**
 * Analyze Current Schema Script
 * 
 * This script analyzes the current database schema to understand:
 * 1. What tables exist and their structure
 * 2. What privacy levels are currently in use
 * 3. Data integrity issues that need to be addressed
 * 4. Migration requirements for standardization
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCurrentSchema() {
  const analysis = {
    tables: {},
    privacy_levels: {},
    data_integrity: {},
    migration_needs: []
  };

  try {
    console.log('🔍 Analyzing Current Database Schema...');
    console.log('===========================================\n');

    // Analyze Events Table
    await analyzeEventsTable(analysis);
    
    // Analyze Relationships Table
    await analyzeRelationshipsTable(analysis);
    
    // Analyze Event Permissions Table
    await analyzeEventPermissionsTable(analysis);
    
    // Check for missing tables
    await checkMissingTables(analysis);
    
    // Generate migration recommendations
    generateMigrationPlan(analysis);
    
    // Output comprehensive report
    outputAnalysisReport(analysis);
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

async function analyzeEventsTable(analysis) {
  console.log('📅 Analyzing Events Table...');
  
  try {
    // Try to get table structure by attempting queries
    const { data: sampleData, error: selectError } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (selectError) {
      analysis.tables.events = { exists: false, error: selectError };
      console.log('❌ Events table not accessible:', selectError.message);
      return;
    }
    
    analysis.tables.events = { 
      exists: true, 
      structure: sampleData?.[0] ? Object.keys(sampleData[0]) : [],
      sample_count: sampleData?.length || 0
    };
    
    // Test privacy levels in use
    if (analysis.tables.events.structure.includes('privacy_level')) {
      await analyzePrivacyLevels('events', 'privacy_level', analysis);
    }
    
    console.log(`✅ Events table exists with columns: ${analysis.tables.events.structure.join(', ')}`);
    
  } catch (error) {
    analysis.tables.events = { exists: false, error: error.message };
    console.log('❌ Events table analysis failed:', error.message);
  }
}

async function analyzeRelationshipsTable(analysis) {
  console.log('👥 Analyzing Relationships Table...');
  
  try {
    const { data: sampleData, error: selectError } = await supabase
      .from('relationships')
      .select('*')
      .limit(1);
    
    if (selectError) {
      analysis.tables.relationships = { exists: false, error: selectError };
      console.log('❌ Relationships table not accessible:', selectError.message);
      return;
    }
    
    analysis.tables.relationships = { 
      exists: true, 
      structure: sampleData?.[0] ? Object.keys(sampleData[0]) : [],
      sample_count: sampleData?.length || 0
    };
    
    // Test privacy levels in use
    if (analysis.tables.relationships.structure.includes('default_privacy_level')) {
      await analyzePrivacyLevels('relationships', 'default_privacy_level', analysis);
    }
    if (analysis.tables.relationships.structure.includes('privacy_level')) {
      await analyzePrivacyLevels('relationships', 'privacy_level', analysis);
    }
    
    console.log(`✅ Relationships table exists with columns: ${analysis.tables.relationships.structure.join(', ')}`);
    
  } catch (error) {
    analysis.tables.relationships = { exists: false, error: error.message };
    console.log('❌ Relationships table analysis failed:', error.message);
  }
}

async function analyzeEventPermissionsTable(analysis) {
  console.log('🔒 Analyzing Event Permissions Table...');
  
  try {
    const { data: sampleData, error: selectError } = await supabase
      .from('event_permissions')
      .select('*')
      .limit(1);
    
    if (selectError) {
      analysis.tables.event_permissions = { exists: false, error: selectError };
      console.log('❌ Event permissions table not accessible:', selectError.message);
      return;
    }
    
    analysis.tables.event_permissions = { 
      exists: true, 
      structure: sampleData?.[0] ? Object.keys(sampleData[0]) : [],
      sample_count: sampleData?.length || 0
    };
    
    // Test privacy levels in use
    if (analysis.tables.event_permissions.structure.includes('permission_level')) {
      await analyzePrivacyLevels('event_permissions', 'permission_level', analysis);
    }
    
    console.log(`✅ Event permissions table exists with columns: ${analysis.tables.event_permissions.structure.join(', ')}`);
    
  } catch (error) {
    analysis.tables.event_permissions = { exists: false, error: error.message };
    console.log('❌ Event permissions table analysis failed:', error.message);
  }
}

async function analyzePrivacyLevels(tableName, columnName, analysis) {
  try {
    // Try to get distinct privacy levels
    const { data: privacyData, error } = await supabase
      .from(tableName)
      .select(columnName)
      .not(columnName, 'is', null);
    
    if (error) {
      console.log(`⚠️ Could not analyze privacy levels in ${tableName}.${columnName}:`, error.message);
      return;
    }
    
    const privacyLevels = [...new Set(privacyData.map(row => row[columnName]))].filter(Boolean);
    
    if (!analysis.privacy_levels[tableName]) {
      analysis.privacy_levels[tableName] = {};
    }
    
    analysis.privacy_levels[tableName][columnName] = {
      values: privacyLevels,
      count: privacyData.length,
      distribution: privacyLevels.reduce((acc, level) => {
        acc[level] = privacyData.filter(row => row[columnName] === level).length;
        return acc;
      }, {})
    };
    
    console.log(`  📊 Privacy levels in ${tableName}.${columnName}:`, privacyLevels);
    
  } catch (error) {
    console.log(`❌ Privacy level analysis failed for ${tableName}.${columnName}:`, error.message);
  }
}

async function checkMissingTables(analysis) {
  console.log('📋 Checking for Missing Tables...');
  
  const expectedTables = [
    'users',
    'events', 
    'relationships',
    'relationship_groups',
    'event_permissions',
    'invitations',
    'calendar_integrations',
    'user_preferences'
  ];
  
  analysis.tables.missing = [];
  
  for (const tableName of expectedTables) {
    if (!analysis.tables[tableName] || !analysis.tables[tableName].exists) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          analysis.tables.missing.push(tableName);
          console.log(`❌ Table ${tableName} is missing or not accessible`);
        } else {
          console.log(`✅ Table ${tableName} exists`);
          if (!analysis.tables[tableName]) {
            analysis.tables[tableName] = {
              exists: true,
              structure: data?.[0] ? Object.keys(data[0]) : [],
              sample_count: data?.length || 0
            };
          }
        }
      } catch (error) {
        analysis.tables.missing.push(tableName);
        console.log(`❌ Table ${tableName} check failed:`, error.message);
      }
    }
  }
}

function generateMigrationPlan(analysis) {
  console.log('\n🗺️ Generating Migration Plan...');
  
  analysis.migration_needs = [];
  
  // Check privacy level standardization needs
  const validPrivacyLevels = ['private', 'visible', 'semi_private', 'public'];
  
  Object.entries(analysis.privacy_levels).forEach(([tableName, columns]) => {
    Object.entries(columns).forEach(([columnName, data]) => {
      const invalidLevels = data.values.filter(level => !validPrivacyLevels.includes(level));
      
      if (invalidLevels.length > 0) {
        analysis.migration_needs.push({
          type: 'privacy_level_standardization',
          table: tableName,
          column: columnName,
          invalid_values: invalidLevels,
          affected_rows: invalidLevels.reduce((acc, level) => acc + data.distribution[level], 0),
          priority: 'HIGH'
        });
      }
    });
  });
  
  // Check for missing tables
  if (analysis.tables.missing.length > 0) {
    analysis.migration_needs.push({
      type: 'missing_tables',
      tables: analysis.tables.missing,
      priority: 'MEDIUM'
    });
  }
  
  // Check for missing columns
  if (analysis.tables.events?.exists) {
    const expectedEventColumns = ['id', 'user_id', 'title', 'start_time', 'end_time', 'privacy_level'];
    const missingColumns = expectedEventColumns.filter(col => 
      !analysis.tables.events.structure.includes(col)
    );
    
    if (missingColumns.length > 0) {
      analysis.migration_needs.push({
        type: 'missing_columns',
        table: 'events',
        columns: missingColumns,
        priority: 'HIGH'
      });
    }
  }
}

function outputAnalysisReport(analysis) {
  console.log('\n📊 COMPREHENSIVE SCHEMA ANALYSIS REPORT');
  console.log('==========================================');
  
  // Table Structure Summary
  console.log('\n📋 TABLE STRUCTURE SUMMARY:');
  Object.entries(analysis.tables).forEach(([tableName, tableInfo]) => {
    if (tableName !== 'missing') {
      console.log(`  ${tableInfo.exists ? '✅' : '❌'} ${tableName}: ${
        tableInfo.exists ? 
        `${tableInfo.structure.length} columns, ${tableInfo.sample_count} sample records` :
        `Not accessible - ${tableInfo.error?.message || 'Unknown error'}`
      }`);
    }
  });
  
  if (analysis.tables.missing?.length > 0) {
    console.log(`  ❌ Missing Tables: ${analysis.tables.missing.join(', ')}`);
  }
  
  // Privacy Levels Summary
  console.log('\n🔒 PRIVACY LEVELS ANALYSIS:');
  if (Object.keys(analysis.privacy_levels).length === 0) {
    console.log('  ⚠️ No privacy level data found in accessible tables');
  } else {
    Object.entries(analysis.privacy_levels).forEach(([tableName, columns]) => {
      console.log(`  📊 ${tableName}:`);
      Object.entries(columns).forEach(([columnName, data]) => {
        console.log(`    - ${columnName}: ${JSON.stringify(data.values)} (${data.count} total records)`);
        Object.entries(data.distribution).forEach(([level, count]) => {
          console.log(`      * ${level}: ${count} records`);
        });
      });
    });
  }
  
  // Migration Needs Summary
  console.log('\n🚨 MIGRATION REQUIREMENTS:');
  if (analysis.migration_needs.length === 0) {
    console.log('  ✅ No critical migration issues detected');
  } else {
    analysis.migration_needs.forEach(need => {
      console.log(`  🔥 [${need.priority}] ${need.type}:`);
      switch (need.type) {
        case 'privacy_level_standardization':
          console.log(`    - Table: ${need.table}.${need.column}`);
          console.log(`    - Invalid values: ${need.invalid_values.join(', ')}`);
          console.log(`    - Affected rows: ${need.affected_rows}`);
          break;
        case 'missing_tables':
          console.log(`    - Tables: ${need.tables.join(', ')}`);
          break;
        case 'missing_columns':
          console.log(`    - Table: ${need.table}`);
          console.log(`    - Columns: ${need.columns.join(', ')}`);
          break;
      }
    });
  }
  
  console.log('\n==========================================');
  console.log('✅ Schema analysis completed');
}

// Run the analysis
analyzeCurrentSchema()
  .then(analysis => {
    console.log('\n💾 Analysis completed successfully');
    
    // Save analysis to file for further review
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/zackstewart/Calendar_app_01/SCHEMA_ANALYSIS_REPORT.json', 
      JSON.stringify(analysis, null, 2)
    );
    console.log('📁 Full analysis saved to SCHEMA_ANALYSIS_REPORT.json');
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });