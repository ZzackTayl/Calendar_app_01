/**
 * Privacy Level Migration Validation Script
 * 
 * This script validates the privacy level migration by testing:
 * 1. Database schema consistency
 * 2. API endpoint functionality  
 * 3. Data integrity
 * 4. Frontend/backend integration
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

// Standard privacy levels that should be supported
const EXPECTED_PRIVACY_LEVELS = ['private', 'visible', 'semi_private', 'public'];
const LEGACY_PRIVACY_LEVELS = ['full_access', 'limited_access', 'busy_only', 'hidden'];

async function validatePrivacyMigration() {
  console.log('🔍 VALIDATING PRIVACY LEVEL MIGRATION');
  console.log('====================================\n');

  const results = {
    database_schema: {},
    data_integrity: {},
    api_functionality: {},
    migration_log: {},
    overall_status: 'unknown'
  };

  try {
    // Phase 1: Validate Database Schema
    await validateDatabaseSchema(results);
    
    // Phase 2: Validate Data Integrity  
    await validateDataIntegrity(results);
    
    // Phase 3: Validate API Functionality
    await validateApiFunctionality(results);
    
    // Phase 4: Check Migration Log
    await checkMigrationLog(results);
    
    // Phase 5: Generate Overall Assessment
    generateOverallAssessment(results);
    
    // Output Results
    outputValidationResults(results);
    
    return results;
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    results.overall_status = 'failed';
    results.error = error.message;
    return results;
  }
}

async function validateDatabaseSchema(results) {
  console.log('📊 Validating Database Schema...');
  
  results.database_schema = {
    privacy_enum_values: null,
    events_table: { exists: false, has_privacy_column: false },
    relationships_table: { exists: false, has_privacy_columns: false },
    event_permissions_table: { exists: false, has_privacy_column: false },
    issues: []
  };

  try {
    // Check if privacy enum includes 'public'
    const { data: enumData, error: enumError } = await supabase
      .rpc('get_enum_values', { enum_name: 'privacy_level_enum' })
      .catch(() => ({ data: null, error: 'Function not available' }));

    if (enumError) {
      results.database_schema.issues.push(`Could not check enum values: ${enumError}`);
    } else if (enumData) {
      results.database_schema.privacy_enum_values = enumData;
      
      const hasPublic = enumData.includes('public');
      if (!hasPublic) {
        results.database_schema.issues.push('Enum missing public value');
      }
      console.log(`  ✅ Privacy enum values: ${enumData.join(', ')}`);
    }

    // Validate events table
    const { data: eventsSample, error: eventsError } = await supabase
      .from('events')
      .select('privacy_level')
      .limit(1);

    if (!eventsError) {
      results.database_schema.events_table.exists = true;
      results.database_schema.events_table.has_privacy_column = true;
      console.log('  ✅ Events table has privacy_level column');
    } else {
      results.database_schema.issues.push(`Events table issue: ${eventsError.message}`);
    }

    // Validate relationships table
    const { data: relationshipsSample, error: relationshipsError } = await supabase
      .from('relationships')
      .select('default_privacy_level, privacy_level')
      .limit(1);

    if (!relationshipsError) {
      results.database_schema.relationships_table.exists = true;
      results.database_schema.relationships_table.has_privacy_columns = true;
      console.log('  ✅ Relationships table has privacy columns');
    } else {
      results.database_schema.issues.push(`Relationships table issue: ${relationshipsError.message}`);
    }

    // Validate event_permissions table
    const { data: permissionsSample, error: permissionsError } = await supabase
      .from('event_permissions')
      .select('permission_level')
      .limit(1);

    if (!permissionsError) {
      results.database_schema.event_permissions_table.exists = true;
      results.database_schema.event_permissions_table.has_privacy_column = true;
      console.log('  ✅ Event permissions table has permission_level column');
    } else {
      results.database_schema.issues.push(`Event permissions table issue: ${permissionsError.message}`);
    }

  } catch (error) {
    results.database_schema.issues.push(`Schema validation error: ${error.message}`);
  }
}

async function validateDataIntegrity(results) {
  console.log('\n📈 Validating Data Integrity...');
  
  results.data_integrity = {
    privacy_distributions: {},
    legacy_values_found: [],
    invalid_values_found: [],
    total_records: 0,
    issues: []
  };

  try {
    // Check events privacy levels
    if (results.database_schema.events_table.exists) {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('privacy_level');

      if (!eventsError && eventsData) {
        const eventsDistribution = eventsData.reduce((acc, row) => {
          const level = row.privacy_level;
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {});

        results.data_integrity.privacy_distributions.events = eventsDistribution;
        results.data_integrity.total_records += eventsData.length;

        // Check for legacy values
        const legacyInEvents = Object.keys(eventsDistribution)
          .filter(level => LEGACY_PRIVACY_LEVELS.includes(level));
        if (legacyInEvents.length > 0) {
          results.data_integrity.legacy_values_found.push(...legacyInEvents.map(level => `events.${level}`));
        }

        // Check for invalid values
        const invalidInEvents = Object.keys(eventsDistribution)
          .filter(level => !EXPECTED_PRIVACY_LEVELS.includes(level) && !LEGACY_PRIVACY_LEVELS.includes(level));
        if (invalidInEvents.length > 0) {
          results.data_integrity.invalid_values_found.push(...invalidInEvents.map(level => `events.${level}`));
        }

        console.log(`  📊 Events privacy distribution:`, eventsDistribution);
      }
    }

    // Check relationships privacy levels
    if (results.database_schema.relationships_table.exists) {
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('default_privacy_level, privacy_level');

      if (!relationshipsError && relationshipsData) {
        const relationshipsDistribution = relationshipsData.reduce((acc, row) => {
          const level = row.default_privacy_level || row.privacy_level;
          if (level) {
            acc[level] = (acc[level] || 0) + 1;
          }
          return acc;
        }, {});

        results.data_integrity.privacy_distributions.relationships = relationshipsDistribution;
        results.data_integrity.total_records += relationshipsData.length;

        // Check for legacy values
        const legacyInRelationships = Object.keys(relationshipsDistribution)
          .filter(level => LEGACY_PRIVACY_LEVELS.includes(level));
        if (legacyInRelationships.length > 0) {
          results.data_integrity.legacy_values_found.push(...legacyInRelationships.map(level => `relationships.${level}`));
        }

        console.log(`  📊 Relationships privacy distribution:`, relationshipsDistribution);
      }
    }

    // Check event_permissions privacy levels
    if (results.database_schema.event_permissions_table.exists) {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('event_permissions')
        .select('permission_level');

      if (!permissionsError && permissionsData) {
        const permissionsDistribution = permissionsData.reduce((acc, row) => {
          const level = row.permission_level;
          if (level) {
            acc[level] = (acc[level] || 0) + 1;
          }
          return acc;
        }, {});

        results.data_integrity.privacy_distributions.event_permissions = permissionsDistribution;
        results.data_integrity.total_records += permissionsData.length;

        console.log(`  📊 Event permissions privacy distribution:`, permissionsDistribution);
      }
    }

    // Summary
    if (results.data_integrity.legacy_values_found.length > 0) {
      results.data_integrity.issues.push(`Legacy privacy values found: ${results.data_integrity.legacy_values_found.join(', ')}`);
    }

    if (results.data_integrity.invalid_values_found.length > 0) {
      results.data_integrity.issues.push(`Invalid privacy values found: ${results.data_integrity.invalid_values_found.join(', ')}`);
    }

    console.log(`  📊 Total records analyzed: ${results.data_integrity.total_records}`);

  } catch (error) {
    results.data_integrity.issues.push(`Data integrity validation error: ${error.message}`);
  }
}

async function validateApiFunctionality(results) {
  console.log('\n🔧 Validating API Functionality...');
  
  results.api_functionality = {
    privacy_level_tests: {},
    issues: []
  };

  // Test each privacy level by attempting to create test data
  for (const privacyLevel of EXPECTED_PRIVACY_LEVELS) {
    try {
      console.log(`  Testing privacy level: ${privacyLevel}`);
      
      // Test with a minimal event creation (we'll delete it immediately)
      const testEvent = {
        title: `Test Event - ${privacyLevel}`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        privacy_level: privacyLevel,
        user_id: '00000000-0000-0000-0000-000000000000' // Test UUID
      };

      const { data: createData, error: createError } = await supabase
        .from('events')
        .insert(testEvent)
        .select()
        .single();

      if (createError) {
        results.api_functionality.privacy_level_tests[privacyLevel] = {
          status: 'failed',
          error: createError.message
        };
        
        if (createError.message.includes('invalid input value for enum')) {
          results.api_functionality.issues.push(`Privacy level '${privacyLevel}' not accepted by database enum`);
        } else {
          results.api_functionality.issues.push(`API test failed for '${privacyLevel}': ${createError.message}`);
        }
        
        console.log(`    ❌ Failed: ${createError.message}`);
      } else {
        results.api_functionality.privacy_level_tests[privacyLevel] = {
          status: 'success',
          created_id: createData?.id
        };
        
        console.log(`    ✅ Success`);
        
        // Clean up test data
        if (createData?.id) {
          await supabase
            .from('events')
            .delete()
            .eq('id', createData.id);
        }
      }

    } catch (error) {
      results.api_functionality.privacy_level_tests[privacyLevel] = {
        status: 'error',
        error: error.message
      };
      results.api_functionality.issues.push(`API test error for '${privacyLevel}': ${error.message}`);
    }
  }
}

async function checkMigrationLog(results) {
  console.log('\n📋 Checking Migration Log...');
  
  results.migration_log = {
    migration_exists: false,
    phases_completed: [],
    issues: []
  };

  try {
    const { data: logData, error: logError } = await supabase
      .from('migration_log')
      .select('*')
      .eq('migration_name', 'privacy_level_standardization')
      .order('created_at', { ascending: true });

    if (logError) {
      results.migration_log.issues.push(`Could not access migration log: ${logError.message}`);
    } else if (logData && logData.length > 0) {
      results.migration_log.migration_exists = true;
      results.migration_log.phases_completed = logData.map(log => ({
        phase: log.phase,
        status: log.status,
        details: log.details,
        timestamp: log.created_at
      }));

      console.log(`  📋 Migration log found with ${logData.length} entries`);
      
      const completionLog = logData.find(log => log.phase === 'completion' && log.status === 'success');
      if (completionLog) {
        console.log('  ✅ Migration marked as completed successfully');
      } else {
        results.migration_log.issues.push('Migration not marked as completed successfully');
      }

      const failedPhases = logData.filter(log => log.status === 'failed');
      if (failedPhases.length > 0) {
        results.migration_log.issues.push(`Failed phases: ${failedPhases.map(p => p.phase).join(', ')}`);
      }

    } else {
      results.migration_log.issues.push('No migration log entries found');
    }

  } catch (error) {
    results.migration_log.issues.push(`Migration log check error: ${error.message}`);
  }
}

function generateOverallAssessment(results) {
  console.log('\n🎯 Generating Overall Assessment...');
  
  const issues = [
    ...results.database_schema.issues,
    ...results.data_integrity.issues,
    ...results.api_functionality.issues,
    ...results.migration_log.issues
  ];

  const criticalIssues = issues.filter(issue => 
    issue.includes('missing') || 
    issue.includes('not accepted') || 
    issue.includes('failed') ||
    issue.includes('invalid')
  );

  const warnings = issues.filter(issue => 
    issue.includes('legacy') ||
    issue.includes('warning')
  );

  if (criticalIssues.length === 0 && warnings.length === 0) {
    results.overall_status = 'success';
  } else if (criticalIssues.length === 0) {
    results.overall_status = 'success_with_warnings';
  } else {
    results.overall_status = 'failed';
  }

  results.assessment = {
    total_issues: issues.length,
    critical_issues: criticalIssues.length,
    warnings: warnings.length,
    recommendation: getRecommendation(results.overall_status, criticalIssues, warnings)
  };
}

function getRecommendation(status, criticalIssues, warnings) {
  switch (status) {
    case 'success':
      return 'Migration completed successfully. Privacy levels are fully standardized and functional.';
    case 'success_with_warnings':
      return `Migration mostly successful with ${warnings.length} warnings. Consider addressing: ${warnings.join('; ')}`;
    case 'failed':
      return `Migration has ${criticalIssues.length} critical issues that must be resolved: ${criticalIssues.join('; ')}`;
    default:
      return 'Unable to determine migration status. Manual review required.';
  }
}

function outputValidationResults(results) {
  console.log('\n📊 PRIVACY MIGRATION VALIDATION RESULTS');
  console.log('=====================================\n');

  // Overall Status
  const statusIcon = results.overall_status === 'success' ? '✅' : 
                    results.overall_status === 'success_with_warnings' ? '⚠️' : '❌';
  console.log(`${statusIcon} Overall Status: ${results.overall_status.toUpperCase()}`);
  console.log(`📋 Recommendation: ${results.assessment?.recommendation}\n`);

  // Database Schema Summary
  console.log('📊 DATABASE SCHEMA:');
  console.log(`  - Events table: ${results.database_schema.events_table.exists ? '✅' : '❌'} exists, ${results.database_schema.events_table.has_privacy_column ? '✅' : '❌'} has privacy column`);
  console.log(`  - Relationships table: ${results.database_schema.relationships_table.exists ? '✅' : '❌'} exists, ${results.database_schema.relationships_table.has_privacy_columns ? '✅' : '❌'} has privacy columns`);
  console.log(`  - Event permissions table: ${results.database_schema.event_permissions_table.exists ? '✅' : '❌'} exists, ${results.database_schema.event_permissions_table.has_privacy_column ? '✅' : '❌'} has privacy column`);
  if (results.database_schema.privacy_enum_values) {
    console.log(`  - Privacy enum values: ${results.database_schema.privacy_enum_values.join(', ')}`);
  }

  // Data Integrity Summary
  console.log('\n📈 DATA INTEGRITY:');
  console.log(`  - Total records analyzed: ${results.data_integrity.total_records}`);
  console.log(`  - Legacy values found: ${results.data_integrity.legacy_values_found.length}`);
  console.log(`  - Invalid values found: ${results.data_integrity.invalid_values_found.length}`);
  if (Object.keys(results.data_integrity.privacy_distributions).length > 0) {
    console.log('  - Privacy distributions:');
    Object.entries(results.data_integrity.privacy_distributions).forEach(([table, dist]) => {
      console.log(`    ${table}: ${JSON.stringify(dist)}`);
    });
  }

  // API Functionality Summary
  console.log('\n🔧 API FUNCTIONALITY:');
  EXPECTED_PRIVACY_LEVELS.forEach(level => {
    const test = results.api_functionality.privacy_level_tests[level];
    if (test) {
      const icon = test.status === 'success' ? '✅' : '❌';
      console.log(`  ${icon} ${level}: ${test.status}`);
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
    }
  });

  // Migration Log Summary
  console.log('\n📋 MIGRATION LOG:');
  console.log(`  - Migration logged: ${results.migration_log.migration_exists ? '✅' : '❌'}`);
  console.log(`  - Phases completed: ${results.migration_log.phases_completed.length}`);

  // Issues Summary
  const allIssues = [
    ...results.database_schema.issues,
    ...results.data_integrity.issues,
    ...results.api_functionality.issues,
    ...results.migration_log.issues
  ];

  if (allIssues.length > 0) {
    console.log('\n🚨 ISSUES FOUND:');
    allIssues.forEach((issue, index) => {
      console.log(`  ${index + 1}. ${issue}`);
    });
  }

  console.log('\n=====================================');
  console.log('✅ Validation completed');
}

// Run validation if called directly
if (require.main === module) {
  validatePrivacyMigration()
    .then(results => {
      const fs = require('fs');
      const reportPath = '/Users/zackstewart/Calendar_app_01/PRIVACY_MIGRATION_VALIDATION_REPORT.json';
      fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
      console.log(`\n📁 Full validation report saved to: ${reportPath}`);
      
      const exitCode = results.overall_status === 'failed' ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Validation script failed:', error);
      process.exit(1);
    });
}

module.exports = { validatePrivacyMigration };