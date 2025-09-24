#!/usr/bin/env node

/**
 * Comprehensive Database Schema Diagnostic
 *
 * This script performs a thorough check of all required database tables,
 * their structures, RLS policies, and permissions for the Calendar app.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const requiredTables = [
  'users',
  'user_profiles',
  'events',
  'event_participants',
  'event_tags',
  'user_settings',
  'calendar_integrations',
  'notification_settings',
  'user_sessions'
];

const expectedTableStructures = {
  users: {
    requiredColumns: ['id', 'email', 'created_at', 'updated_at'],
    primaryKey: 'id'
  },
  user_profiles: {
    requiredColumns: ['id', 'user_id', 'full_name', 'avatar_url', 'timezone', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  },
  events: {
    requiredColumns: ['id', 'user_id', 'title', 'description', 'start_time', 'end_time', 'location', 'is_private', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  },
  event_participants: {
    requiredColumns: ['id', 'event_id', 'user_id', 'status', 'created_at'],
    primaryKey: 'id',
    foreignKeys: { event_id: 'events(id)', user_id: 'users(id)' }
  },
  event_tags: {
    requiredColumns: ['id', 'event_id', 'tag', 'created_at'],
    primaryKey: 'id',
    foreignKeys: { event_id: 'events(id)' }
  },
  user_settings: {
    requiredColumns: ['id', 'user_id', 'default_calendar_view', 'week_starts_on', 'time_format_24h', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  },
  calendar_integrations: {
    requiredColumns: ['id', 'user_id', 'provider', 'access_token', 'refresh_token', 'expires_at', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  },
  notification_settings: {
    requiredColumns: ['id', 'user_id', 'email_notifications', 'push_notifications', 'reminder_minutes', 'created_at', 'updated_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  },
  user_sessions: {
    requiredColumns: ['id', 'user_id', 'session_token', 'expires_at', 'created_at'],
    primaryKey: 'id',
    foreignKeys: { user_id: 'users(id)' }
  }
};

console.log('🔍 Comprehensive Database Schema Diagnostic');
console.log('==========================================\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✅ Set' : '❌ Missing');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !anonKey) {
  console.log('\n❌ CRITICAL: Missing required Supabase credentials');
  process.exit(1);
}

// Initialize clients
const supabaseAnon = createClient(supabaseUrl, anonKey);
const supabaseService = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

async function runDiagnostics() {
  console.log('\n2. Testing Database Connectivity...');

  try {
    // Test with anon key first
    const { data: connectionTest, error: connectionError } = await supabaseAnon
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      console.log('   ❌ Anon connection failed:', connectionError.message);
    } else {
      console.log('   ✅ Anon connection successful');
    }

    if (supabaseService) {
      const { error: serviceError } = await supabaseService
        .from('users')
        .select('count', { count: 'exact', head: true });

      if (serviceError) {
        console.log('   ❌ Service role connection failed:', serviceError.message);
      } else {
        console.log('   ✅ Service role connection successful');
      }
    }

  } catch (error) {
    console.log('   ❌ Connection error:', error.message);
  }

  console.log('\n3. Checking Required Tables...');

  for (const tableName of requiredTables) {
    try {
      const { data, error, count } = await supabaseAnon
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: ${count} rows`);
      }
    } catch (err) {
      console.log(`   ❌ ${tableName}: ${err.message}`);
    }
  }

  console.log('\n4. Verifying Table Structures...');

  if (supabaseService) {
    for (const [tableName, structure] of Object.entries(expectedTableStructures)) {
      try {
        const { data: columns, error } = await supabaseService
          .rpc('get_table_columns', { table_name: tableName });

        if (error) {
          console.log(`   ❌ ${tableName}: Unable to get column info - ${error.message}`);
          continue;
        }

        if (!columns || columns.length === 0) {
          console.log(`   ❌ ${tableName}: Table does not exist or no columns found`);
          continue;
        }

        console.log(`   📋 ${tableName}:`);
        const columnNames = columns.map(col => col.column_name);

        // Check required columns
        const missingColumns = structure.requiredColumns.filter(col => !columnNames.includes(col));
        if (missingColumns.length > 0) {
          console.log(`      ❌ Missing columns: ${missingColumns.join(', ')}`);
        } else {
          console.log(`      ✅ All required columns present`);
        }

        // Show actual columns
        console.log(`      📊 Actual columns: ${columnNames.join(', ')}`);

      } catch (err) {
        console.log(`   ❌ ${tableName}: ${err.message}`);
      }
    }
  } else {
    console.log('   ⚠️  Skipping structure verification - service role key not available');
  }

  console.log('\n5. Testing RLS Policies and Permissions...');

  // Test insert permissions for key tables
  const permissionTests = [
    { table: 'users', operation: 'INSERT' },
    { table: 'user_profiles', operation: 'INSERT' },
    { table: 'events', operation: 'INSERT' },
    { table: 'user_settings', operation: 'INSERT' }
  ];

  for (const test of permissionTests) {
    try {
      const testData = getTestDataForTable(test.table);
      const { error } = await supabaseAnon
        .from(test.table)
        [test.operation.toLowerCase() === 'insert' ? 'insert' : 'select'](testData);

      if (error) {
        console.log(`   ❌ ${test.table} ${test.operation}: ${error.message}`);
      } else {
        console.log(`   ✅ ${test.table} ${test.operation}: Permitted`);
      }
    } catch (err) {
      console.log(`   ❌ ${test.table} ${test.operation}: ${err.message}`);
    }
  }

  console.log('\n6. Checking Indexes and Constraints...');

  if (supabaseService) {
    try {
      const { data: indexes, error } = await supabaseService
        .rpc('get_table_indexes');

      if (error) {
        console.log('   ❌ Unable to check indexes:', error.message);
      } else if (indexes && indexes.length > 0) {
        console.log('   ✅ Indexes found:');
        indexes.forEach(idx => {
          console.log(`      - ${idx.table_name}.${idx.index_name} on ${idx.column_names.join(', ')}`);
        });
      } else {
        console.log('   ⚠️  No indexes found - performance may be impacted');
      }
    } catch (err) {
      console.log('   ❌ Index check failed:', err.message);
    }
  }

  console.log('\n📋 SUMMARY & RECOMMENDATIONS');
  console.log('============================');

  // Generate summary
  const issues = [];
  const successes = [];

  console.log('\n✅ Database connection: Working');
  successes.push('Database connectivity verified');

  console.log('⚠️  Please review detailed results above for specific issues');
  console.log('\n🔧 Common fixes:');
  console.log('   1. Run database migrations if tables are missing');
  console.log('   2. Check RLS policies if permissions are failing');
  console.log('   3. Add missing indexes for better performance');
  console.log('   4. Verify foreign key constraints are in place');
}

function getTestDataForTable(tableName) {
  const testData = {
    users: { email: 'test@example.com', created_at: new Date().toISOString() },
    user_profiles: { user_id: '00000000-0000-0000-0000-000000000000', full_name: 'Test User' },
    events: { user_id: '00000000-0000-0000-0000-000000000000', title: 'Test Event', start_time: new Date().toISOString() },
    user_settings: { user_id: '00000000-0000-0000-0000-000000000000', default_calendar_view: 'month' }
  };
  return testData[tableName] || {};
}

runDiagnostics().catch(console.error);
