#!/usr/bin/env node

/**
 * PolyHarmony Backup Validation System
 * 
 * This script validates the integrity and completeness of database backups
 * Runs daily to ensure backup systems are functioning correctly
 * 
 * Usage: node scripts/backup-validation.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BACKUP_LOG_DIR = './backups/logs';
const VALIDATION_TIMEOUT = 30000; // 30 seconds

/**
 * Critical tables that must exist and have data for the application to function
 */
const CRITICAL_TABLES = [
  'users',
  'events', 
  'relationships',
  'event_sharing',
  'user_profiles'
];

/**
 * Optional tables that should exist but may be empty in new installations
 */
const OPTIONAL_TABLES = [
  'calendar_integrations',
  'notifications',
  'security_audit_log',
  'invitations'
];

/**
 * Main backup validation function
 */
async function validateBackupIntegrity() {
  const startTime = Date.now();
  const validationResults = {
    timestamp: new Date().toISOString(),
    status: 'unknown',
    duration: 0,
    tables: {},
    errors: [],
    warnings: [],
    summary: {}
  };

  try {
    console.log('🔍 Starting backup validation...');
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test basic connectivity
    await testDatabaseConnectivity(supabase, validationResults);
    
    // Validate critical tables
    await validateCriticalTables(supabase, validationResults);
    
    // Validate optional tables
    await validateOptionalTables(supabase, validationResults);
    
    // Check data consistency
    await validateDataConsistency(supabase, validationResults);
    
    // Check schema integrity
    await validateSchemaIntegrity(supabase, validationResults);
    
    // Generate summary
    generateValidationSummary(validationResults);
    
    // Log results
    await logValidationResults(validationResults);
    
    const duration = Date.now() - startTime;
    validationResults.duration = duration;
    validationResults.status = validationResults.errors.length === 0 ? 'success' : 'failed';
    
    console.log(`✅ Backup validation completed in ${duration}ms`);
    console.log(`Status: ${validationResults.status}`);
    
    if (validationResults.errors.length > 0) {
      console.log(`❌ Errors found: ${validationResults.errors.length}`);
      validationResults.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (validationResults.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${validationResults.warnings.length}`);
      validationResults.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    return validationResults;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    validationResults.duration = duration;
    validationResults.status = 'error';
    validationResults.errors.push(`Fatal validation error: ${error.message}`);
    
    console.error('❌ Backup validation failed:', error);
    
    // Send critical alert for validation failures
    await sendValidationAlert('VALIDATION_FAILED', error.message, validationResults);
    
    return validationResults;
  }
}

/**
 * Test basic database connectivity
 */
async function testDatabaseConnectivity(supabase, results) {
  try {
    console.log('  📡 Testing database connectivity...');
    
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Database connectivity failed: ${error.message}`);
    }
    
    results.tables.connectivity = {
      status: 'success',
      responseTime,
      details: `Database connection successful in ${responseTime}ms`
    };
    
    console.log(`    ✅ Connected in ${responseTime}ms`);
    
  } catch (error) {
    results.errors.push(`Database connectivity test failed: ${error.message}`);
    results.tables.connectivity = {
      status: 'error',
      error: error.message
    };
    throw error;
  }
}

/**
 * Validate critical tables exist and have expected structure
 */
async function validateCriticalTables(supabase, results) {
  console.log('  🗃️  Validating critical tables...');
  
  for (const tableName of CRITICAL_TABLES) {
    try {
      const startTime = Date.now();
      
      // Check table exists and get row count
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        throw new Error(`Table access failed: ${error.message}`);
      }
      
      results.tables[tableName] = {
        status: 'success',
        exists: true,
        rowCount: count || 0,
        responseTime,
        critical: true
      };
      
      console.log(`    ✅ ${tableName}: ${count || 0} rows (${responseTime}ms)`);
      
      // Warn if critical tables are empty (might be new installation)
      if ((count || 0) === 0 && tableName !== 'security_audit_log') {
        results.warnings.push(`Critical table '${tableName}' is empty`);
      }
      
    } catch (error) {
      results.errors.push(`Critical table validation failed for '${tableName}': ${error.message}`);
      results.tables[tableName] = {
        status: 'error',
        exists: false,
        error: error.message,
        critical: true
      };
      console.log(`    ❌ ${tableName}: ${error.message}`);
    }
  }
}

/**
 * Validate optional tables
 */
async function validateOptionalTables(supabase, results) {
  console.log('  📋 Validating optional tables...');
  
  for (const tableName of OPTIONAL_TABLES) {
    try {
      const startTime = Date.now();
      
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      
      const responseTime = Date.now() - startTime;
      
      if (error) {
        // Optional tables may not exist, so this is just a warning
        results.warnings.push(`Optional table '${tableName}' not accessible: ${error.message}`);
        results.tables[tableName] = {
          status: 'warning',
          exists: false,
          error: error.message,
          critical: false
        };
        console.log(`    ⚠️  ${tableName}: Not accessible`);
        continue;
      }
      
      results.tables[tableName] = {
        status: 'success',
        exists: true,
        rowCount: count || 0,
        responseTime,
        critical: false
      };
      
      console.log(`    ✅ ${tableName}: ${count || 0} rows (${responseTime}ms)`);
      
    } catch (error) {
      results.warnings.push(`Optional table validation warning for '${tableName}': ${error.message}`);
      results.tables[tableName] = {
        status: 'warning',
        exists: false,
        error: error.message,
        critical: false
      };
    }
  }
}

/**
 * Validate data consistency between related tables
 */
async function validateDataConsistency(supabase, results) {
  console.log('  🔗 Validating data consistency...');
  
  const consistencyChecks = [];
  
  try {
    // Check that all events have valid users
    const { data: orphanedEvents, error: eventsError } = await supabase
      .from('events')
      .select('id, user_id')
      .not('user_id', 'in', `(${await getUserIds(supabase)})`);
    
    if (eventsError) throw eventsError;
    
    if (orphanedEvents && orphanedEvents.length > 0) {
      results.errors.push(`Found ${orphanedEvents.length} events with invalid user references`);
      consistencyChecks.push({
        check: 'events_user_references',
        status: 'failed',
        issues: orphanedEvents.length
      });
    } else {
      consistencyChecks.push({
        check: 'events_user_references', 
        status: 'passed',
        issues: 0
      });
    }
    
    // Check that all relationships have valid user references
    const { data: orphanedRelationships, error: relationshipsError } = await supabase
      .from('relationships')
      .select('id, user_id, related_user_id')
      .or(`user_id.not.in.(${await getUserIds(supabase)}),related_user_id.not.in.(${await getUserIds(supabase)})`);
    
    if (relationshipsError) throw relationshipsError;
    
    if (orphanedRelationships && orphanedRelationships.length > 0) {
      results.errors.push(`Found ${orphanedRelationships.length} relationships with invalid user references`);
      consistencyChecks.push({
        check: 'relationships_user_references',
        status: 'failed', 
        issues: orphanedRelationships.length
      });
    } else {
      consistencyChecks.push({
        check: 'relationships_user_references',
        status: 'passed',
        issues: 0
      });
    }
    
    results.consistency = consistencyChecks;
    
    const failedChecks = consistencyChecks.filter(check => check.status === 'failed').length;
    console.log(`    📊 Consistency checks: ${consistencyChecks.length - failedChecks}/${consistencyChecks.length} passed`);
    
  } catch (error) {
    results.errors.push(`Data consistency validation failed: ${error.message}`);
    console.log(`    ❌ Consistency validation error: ${error.message}`);
  }
}

/**
 * Get all user IDs for consistency checking
 */
async function getUserIds(supabase) {
  const { data, error } = await supabase
    .from('users')
    .select('id');
  
  if (error) throw error;
  
  return data.map(user => user.id).join(',');
}

/**
 * Validate schema integrity by checking key columns exist
 */
async function validateSchemaIntegrity(supabase, results) {
  console.log('  🏗️  Validating schema integrity...');
  
  const schemaChecks = [];
  
  try {
    // Check that critical columns exist by attempting to select them
    const criticalColumns = {
      events: ['id', 'title', 'start_time', 'end_time', 'user_id', 'privacy_level'],
      users: ['id', 'email', 'created_at'],
      relationships: ['id', 'user_id', 'related_user_id', 'relationship_type'],
      event_sharing: ['id', 'event_id', 'shared_with_user_id', 'permission_level']
    };
    
    for (const [tableName, columns] of Object.entries(criticalColumns)) {
      try {
        const selectColumns = columns.join(', ');
        const { data, error } = await supabase
          .from(tableName)
          .select(selectColumns)
          .limit(1);
        
        if (error) throw error;
        
        schemaChecks.push({
          table: tableName,
          columns: columns.length,
          status: 'valid'
        });
        
      } catch (error) {
        results.errors.push(`Schema validation failed for table '${tableName}': ${error.message}`);
        schemaChecks.push({
          table: tableName,
          columns: columns.length,
          status: 'invalid',
          error: error.message
        });
      }
    }
    
    results.schema = schemaChecks;
    
    const validTables = schemaChecks.filter(check => check.status === 'valid').length;
    console.log(`    🏗️  Schema validation: ${validTables}/${schemaChecks.length} tables valid`);
    
  } catch (error) {
    results.errors.push(`Schema integrity validation failed: ${error.message}`);
    console.log(`    ❌ Schema validation error: ${error.message}`);
  }
}

/**
 * Generate validation summary
 */
function generateValidationSummary(results) {
  const totalTables = Object.keys(results.tables).length - 1; // Exclude connectivity
  const successfulTables = Object.values(results.tables).filter(table => table.status === 'success').length;
  const criticalErrors = results.errors.length;
  const warnings = results.warnings.length;
  
  results.summary = {
    totalTables,
    successfulTables,
    criticalErrors,
    warnings,
    overallHealth: criticalErrors === 0 ? 'healthy' : 'unhealthy'
  };
}

/**
 * Log validation results to file
 */
async function logValidationResults(results) {
  try {
    // Ensure backup log directory exists
    await fs.mkdir(BACKUP_LOG_DIR, { recursive: true });
    
    const logFile = path.join(BACKUP_LOG_DIR, `validation-${new Date().toISOString().split('T')[0]}.log`);
    const logEntry = `${results.timestamp} - ${results.status} - ${results.duration}ms - Errors: ${results.errors.length} - Warnings: ${results.warnings.length}\n`;
    
    await fs.appendFile(logFile, logEntry);
    
    // Also save detailed results as JSON
    const detailedLogFile = path.join(BACKUP_LOG_DIR, `validation-detailed-${Date.now()}.json`);
    await fs.writeFile(detailedLogFile, JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Failed to log validation results:', error);
  }
}

/**
 * Send alert for validation failures
 */
async function sendValidationAlert(alertType, message, results) {
  // This would integrate with your alerting system (email, Slack, etc.)
  console.log(`🚨 ALERT: ${alertType} - ${message}`);
  
  // For now, just log the alert
  // In production, implement actual alerting mechanism:
  // - Email notifications
  // - Slack webhooks  
  // - SMS for critical failures
  // - Integration with monitoring systems
  
  const alertData = {
    type: alertType,
    message,
    timestamp: new Date().toISOString(),
    severity: 'high',
    results: {
      errors: results.errors,
      warnings: results.warnings,
      summary: results.summary
    }
  };
  
  try {
    await fs.mkdir(BACKUP_LOG_DIR, { recursive: true });
    const alertFile = path.join(BACKUP_LOG_DIR, `alert-${Date.now()}.json`);
    await fs.writeFile(alertFile, JSON.stringify(alertData, null, 2));
  } catch (error) {
    console.error('Failed to log alert:', error);
  }
}

// Export for use in other modules
module.exports = { validateBackupIntegrity };

// Run validation if this file is executed directly
if (require.main === module) {
  validateBackupIntegrity()
    .then(results => {
      process.exit(results.status === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('Validation script failed:', error);
      process.exit(1);
    });
}