#!/usr/bin/env node

/**
 * Error Logging Setup Script
 * Sets up the error logging system for PolyHarmony Calendar
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupErrorLogging() {
  console.log('🚀 Setting up error logging system...\n');

  try {
    // 1. Read and apply error logging schema
    console.log('📋 Applying error logging schema...');
    const schemaPath = path.join(__dirname, '..', 'schemas', 'error_logging_schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    const { error: schemaError } = await supabase.rpc('exec_sql', { sql: schema });
    if (schemaError) {
      console.error('❌ Failed to apply schema:', schemaError.message);
      return false;
    }
    console.log('✅ Error logging schema applied successfully\n');

    // 2. Verify tables were created
    console.log('🔍 Verifying tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['error_logs', 'system_errors', 'security_events', 'key_audit_log']);

    if (tablesError) {
      console.error('❌ Failed to verify tables:', tablesError.message);
      return false;
    }

    const expectedTables = ['error_logs', 'system_errors', 'security_events', 'key_audit_log'];
    const createdTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !createdTables.includes(t));

    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      return false;
    }
    console.log('✅ All error logging tables created successfully\n');

    // 3. Test error logging functionality
    console.log('🧪 Testing error logging...');
    
    // Test error_logs table
    const testError = {
      error_id: `test-${Date.now()}`,
      error_message: 'Test error message',
      error_stack: 'Test stack trace',
      user_agent: 'Test User Agent',
      url: 'https://test.example.com',
      error_type: 'test_error',
      metadata: { test: true }
    };

    const { error: insertError } = await supabase
      .from('error_logs')
      .insert(testError);

    if (insertError) {
      console.error('❌ Failed to insert test error:', insertError.message);
      return false;
    }
    console.log('✅ Error logging test successful\n');

    // 4. Set up cleanup function
    console.log('🧹 Setting up cleanup function...');
    const cleanupFunction = `
      CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
      RETURNS void AS $$
      BEGIN
          DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '90 days';
          DELETE FROM system_errors WHERE created_at < NOW() - INTERVAL '180 days';
          DELETE FROM security_events WHERE created_at < NOW() - INTERVAL '1 year';
          DELETE FROM key_audit_log WHERE created_at < NOW() - INTERVAL '2 years';
      END;
      $$ LANGUAGE plpgsql;
    `;

    const { error: cleanupError } = await supabase.rpc('exec_sql', { sql: cleanupFunction });
    if (cleanupError) {
      console.error('❌ Failed to create cleanup function:', cleanupError.message);
      return false;
    }
    console.log('✅ Cleanup function created successfully\n');

    // 5. Test cleanup function
    console.log('🧪 Testing cleanup function...');
    const { error: testCleanupError } = await supabase.rpc('cleanup_old_error_logs');
    if (testCleanupError) {
      console.error('❌ Failed to test cleanup function:', testCleanupError.message);
      return false;
    }
    console.log('✅ Cleanup function test successful\n');

    // 6. Create sample error for demonstration
    console.log('📝 Creating sample error for demonstration...');
    const sampleError = {
      error_id: `sample-${Date.now()}`,
      error_message: 'Sample error for demonstration',
      error_stack: 'Sample stack trace\n  at function (file.js:1:1)',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      url: 'https://polyharmony.calendar/calendar',
      error_type: 'sample_error',
      metadata: {
        component: 'CalendarView',
        userId: 'sample-user-123',
        timestamp: new Date().toISOString()
      }
    };

    const { error: sampleErrorInsert } = await supabase
      .from('error_logs')
      .insert(sampleError);

    if (sampleErrorInsert) {
      console.error('❌ Failed to insert sample error:', sampleErrorInsert.message);
      return false;
    }
    console.log('✅ Sample error created successfully\n');

    // 7. Display current error log count
    console.log('📊 Current error log status...');
    const { data: errorCount, error: countError } = await supabase
      .from('error_logs')
      .select('count', { count: 'exact' });

    if (countError) {
      console.error('❌ Failed to get error count:', countError.message);
      return false;
    }

    console.log(`✅ Error logs table contains ${errorCount.length} entries\n`);

    // 8. Success summary
    console.log('🎉 Error logging system setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Error logging schema applied');
    console.log('   ✅ All required tables created');
    console.log('   ✅ Error logging functionality tested');
    console.log('   ✅ Cleanup function configured');
    console.log('   ✅ Sample data created');
    console.log('\n📚 Next steps:');
    console.log('   1. Review the Error Logging Guide: docs/ERROR_LOGGING_GUIDE.md');
    console.log('   2. Set up monitoring alerts for critical errors');
    console.log('   3. Configure external error reporting services (optional)');
    console.log('   4. Schedule regular cleanup jobs');

    return true;

  } catch (error) {
    console.error('❌ Unexpected error during setup:', error.message);
    return false;
  }
}

async function verifyErrorLogging() {
  console.log('🔍 Verifying error logging system...\n');

  try {
    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['error_logs', 'system_errors', 'security_events', 'key_audit_log']);

    if (tablesError) {
      console.error('❌ Failed to verify tables:', tablesError.message);
      return false;
    }

    const expectedTables = ['error_logs', 'system_errors', 'security_events', 'key_audit_log'];
    const createdTables = tables.map(t => t.table_name);
    const missingTables = expectedTables.filter(t => !createdTables.includes(t));

    if (missingTables.length > 0) {
      console.error('❌ Missing tables:', missingTables.join(', '));
      return false;
    }

    // Check table structures
    for (const tableName of expectedTables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_schema', 'public')
        .eq('table_name', tableName);

      if (columnsError) {
        console.error(`❌ Failed to get columns for ${tableName}:`, columnsError.message);
        return false;
      }

      console.log(`✅ ${tableName}: ${columns.length} columns`);
    }

    // Test error insertion
    const testError = {
      error_id: `verify-${Date.now()}`,
      error_message: 'Verification test error',
      user_agent: 'Verification Test',
      url: 'https://test.example.com',
      error_type: 'verification_test'
    };

    const { error: insertError } = await supabase
      .from('error_logs')
      .insert(testError);

    if (insertError) {
      console.error('❌ Failed to insert verification error:', insertError.message);
      return false;
    }

    console.log('✅ Error logging system verification successful');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error during verification:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'setup':
      const setupSuccess = await setupErrorLogging();
      process.exit(setupSuccess ? 0 : 1);
      break;
    
    case 'verify':
      const verifySuccess = await verifyErrorLogging();
      process.exit(verifySuccess ? 0 : 1);
      break;
    
    default:
      console.log('Error Logging Setup Script');
      console.log('\nUsage:');
      console.log('  node scripts/setup-error-logging.js setup   # Set up error logging system');
      console.log('  node scripts/setup-error-logging.js verify # Verify error logging system');
      console.log('\nRequired environment variables:');
      console.log('  NEXT_PUBLIC_SUPABASE_URL');
      console.log('  SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script execution failed:', error.message);
  process.exit(1);
});
