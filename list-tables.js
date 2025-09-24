#!/usr/bin/env node

/**
 * List all tables in the Supabase database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listTables() {
  console.log('🔍 Listing all database tables...\n');

  try {
    // Query information_schema to get all tables
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            schemaname,
            tablename,
            tableowner
          FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename;
        `
      });

    if (error) {
      console.log('❌ Error querying tables:', error.message);

      // Try alternative approach using a direct query
      console.log('\n🔄 Trying alternative approach...\n');

      const { data: altTables, error: altError } = await supabase
        .from('information_schema.tables')
        .select('table_schema, table_name, table_type')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (altError) {
        console.log('❌ Alternative approach also failed:', altError.message);
        return;
      }

      console.log('📋 Tables found (alternative method):');
      altTables.forEach(table => {
        console.log(`   ✅ ${table.table_name}`);
      });

    } else {
      console.log('📋 Tables found:');
      tables.forEach(table => {
        console.log(`   ✅ ${table.tablename} (owner: ${table.tableowner})`);
      });
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

listTables().catch(console.error);
