#!/usr/bin/env node

/**
 * Check Database Tables
 * Lists all available tables in the database
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Database Tables Check');
console.log('========================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkDatabaseTables() {
  try {
    console.log('1. Checking available tables...');

    // Try to get all tables using information_schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_names');

    if (tablesError) {
      console.log('   ❌ Cannot get table names via RPC:', tablesError.message);
      console.log('   📋 Trying alternative approach...');

      // Try a different approach - select from information_schema directly
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (schemaError) {
        console.log('   ❌ Cannot access schema information:', schemaError.message);
        console.log('   📋 Available tables based on common patterns:');

        // Test common table names that might exist
        const commonTables = [
          'users', 'profiles', 'user_profiles', 'events', 'relationships',
          'reminders', 'invitations', 'groups', 'settings'
        ];

        for (const tableName of commonTables) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(1);

            if (error) {
              console.log(`   ❌ ${tableName}: ${error.message}`);
            } else {
              console.log(`   ✅ ${tableName}: Exists and accessible`);
            }
          } catch (err) {
            console.log(`   ❌ ${tableName}: ${err.message}`);
          }
        }
      } else if (schemaInfo && schemaInfo.length > 0) {
        console.log('   ✅ Schema info accessible');
        console.log('   📋 Available tables:');
        schemaInfo.forEach(table => {
          console.log(`      - ${table.table_name}`);
        });
      } else {
        console.log('   ⚠️  No tables found or empty result');
      }
    } else if (tables && tables.length > 0) {
      console.log('   ✅ Tables found via RPC:');
      tables.forEach(table => {
        console.log(`      - ${table.table_name}`);
      });
    }

    console.log('\n2. Checking for relationship-like tables...');
    // Check if there are any tables that might contain relationship data
    const relationshipLikeTables = ['reminders', 'partners', 'connections', 'contacts'];

    for (const tableName of relationshipLikeTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error) {
          console.log(`   ✅ ${tableName}: Table exists and is accessible`);

          // Check if this table has relationship-like columns
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`      📋 Columns: ${columns.join(', ')}`);

            // Check if it looks like a relationships table
            const relationshipColumns = ['partner_name', 'relationship_type', 'user_id', 'partner_id'];
            const hasRelationshipColumns = relationshipColumns.some(col =>
              columns.some(tableCol => tableCol.toLowerCase().includes(col.toLowerCase()))
            );

            if (hasRelationshipColumns) {
              console.log(`      🎯 This table appears to contain relationship data!`);
            }
          }
        } else {
          console.log(`   ❌ ${tableName}: ${error.message}`);
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: ${err.message}`);
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log('The dashboard is trying to query a "relationships" table that doesn\'t exist.');
    console.log('This is likely the cause of the error on line 188.');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('1. Either create the relationships table with the correct schema');
    console.log('2. Or update the dashboard code to use the correct table name');
    console.log('3. Or migrate existing relationship data to the correct table structure');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabaseTables().catch(console.error);
