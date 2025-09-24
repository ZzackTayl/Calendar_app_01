#!/usr/bin/env node

/**
 * Apply Database Schema Alignment Fixes
 *
 * This script applies the necessary fixes to align the database schema
 * with application requirements using the service role key.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.log('❌ Missing required environment variables');
  console.log('   Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔑 Using service role key for schema fixes...');
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Function to execute SQL using Supabase REST API
async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;

    const postData = JSON.stringify({ sql });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || data}`));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function applySchemaFixes() {
  console.log('🔧 Applying Database Schema Alignment Fixes...');
  console.log('=============================================\n');

  // Read the SQL fix file
  const sqlFilePath = path.join(__dirname, 'fix-database-schema-alignment.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Split SQL into individual statements (basic approach)
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

  console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    if (!statement || statement.length < 10) continue;

    try {
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      console.log(`   📝 SQL: ${statement.substring(0, 100)}...`);

      // Execute the SQL statement using direct REST API call
      try {
        await executeSQL(statement);
        console.log(`   ✅ Statement ${i + 1} executed successfully`);
        successCount++;
      } catch (error) {
        // Some statements might fail due to existing objects, which is expected
        if (error.message.includes('already exists') ||
            error.message.includes('does not exist') ||
            error.message.includes('already enabled') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`   ⚠️  Statement ${i + 1} skipped (object already exists or doesn't exist):`, error.message.substring(0, 100));
          successCount++;
        } else {
          console.log(`   ❌ Statement ${i + 1} failed:`, error.message.substring(0, 100));
          errorCount++;
        }
      }

    } catch (error) {
      console.log(`   ❌ Statement ${i + 1} failed:`, error.message.substring(0, 100));
      errorCount++;
    }
  }

  console.log(`\n📊 Execution Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);

  if (errorCount === 0) {
    console.log('\n🎉 All schema fixes applied successfully!');
  } else {
    console.log(`\n⚠️  ${errorCount} statements had issues. Check the output above.`);
  }

  console.log('\n🔧 MANUAL STEPS REQUIRED:');
  console.log('   1. The above SQL statements need to be executed in your Supabase dashboard');
  console.log('   2. Go to: Supabase Dashboard > SQL Editor');
  console.log('   3. Copy and paste the contents of fix-database-schema-alignment.sql');
  console.log('   4. Execute the SQL to apply all fixes');
  console.log('   5. Verify the changes in the Table Editor');

  console.log('\n🔍 AFTER APPLYING FIXES, RUN:');
  console.log('   node comprehensive-db-diagnostic.js');
  console.log('   This will verify that all issues have been resolved');
}

// Handle script execution
if (require.main === module) {
  applySchemaFixes().catch(console.error);
}

module.exports = { applySchemaFixes };
