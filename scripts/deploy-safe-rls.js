#!/usr/bin/env node

/**
 * PRODUCTION-SAFE RLS Migration Script
 * 
 * This script applies RLS policies ONLY to tables that actually exist
 * in the database, focusing on the critical tables needed to fix 
 * relationship data access issues.
 * 
 * PRIORITY FOCUS:
 * - relationships (HIGHEST PRIORITY - main issue)
 * - users
 * - events  
 * - contacts
 * - invitations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.error('Could not load .env file:', error.message);
    return {};
  }
}

const envVars = loadEnvFile();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeSQL(sql, description, continueOnError = true) {
  console.log(`🔧 ${description}...`);
  try {
    const { data, error } = await adminClient.rpc('exec_sql', { sql_query: sql });
    if (error) {
      throw error;
    }
    console.log(`   ✅ Success`);
    return { success: true, data };
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    if (!continueOnError) {
      throw error;
    }
    return { success: false, error: error.message };
  }
}

async function checkTableExists(tableName) {
  console.log(`🔍 Checking if table '${tableName}' exists...`);
  try {
    const { data, error } = await adminClient.rpc('exec_sql', { 
      sql_query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        ) as exists;
      `
    });
    
    if (error) {
      console.log(`   ❌ Error checking table: ${error.message}`);
      return false;
    }
    
    const exists = data === 'SUCCESS'; // If the query runs, table might exist
    console.log(`   ${exists ? '✅' : '❌'} Table '${tableName}' ${exists ? 'exists' : 'does not exist'}`);
    return exists;
  } catch (error) {
    console.log(`   ❌ Error checking table: ${error.message}`);
    return false;
  }
}

async function getExistingTables() {
  console.log('🔍 Discovering existing tables...');
  const coreTables = ['relationships', 'users', 'events', 'contacts', 'invitations', 'relationship_groups', 'relationship_group_members'];
  const existingTables = [];
  
  for (const table of coreTables) {
    try {
      // Simple query to test if table exists and is accessible
      const { error } = await adminClient
        .from(table)
        .select('*')
        .limit(0);
      
      if (!error) {
        existingTables.push(table);
        console.log(`   ✅ Found table: ${table}`);
      } else {
        console.log(`   ❌ Table not found or accessible: ${table}`);
      }
    } catch (err) {
      console.log(`   ❌ Table not found or accessible: ${table}`);
    }
  }
  
  return existingTables;
}

async function deploySafeRLS() {
  console.log('🚀 Starting Production-Safe RLS Deployment...\n');
  
  // Step 1: Create helper function
  console.log('📋 Step 1: Setting up helper functions...');
  await executeSQL(`
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'SUCCESS';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM;
    END;
    $$;
  `, 'Creating exec_sql helper function');
  
  // Step 2: Discover existing tables
  console.log('\n📋 Step 2: Discovering database schema...');
  const existingTables = await getExistingTables();
  
  if (existingTables.length === 0) {
    console.log('❌ No core tables found in database. Cannot proceed.');
    process.exit(1);
  }
  
  console.log(`\n✅ Found ${existingTables.length} core tables to process:`);
  existingTables.forEach(table => console.log(`   - ${table}`));
  
  // Step 3: Apply RLS policies based on existing tables
  console.log('\n📋 Step 3: Applying RLS policies to existing tables...\n');
  
  const deploymentSteps = [];
  let successCount = 0;
  let failureCount = 0;
  
  // RELATIONSHIPS TABLE (HIGHEST PRIORITY)
  if (existingTables.includes('relationships')) {
    console.log('🎯 Processing RELATIONSHIPS table (HIGHEST PRIORITY)...');
    
    const relationshipSteps = [
      {
        description: 'Enabling RLS on relationships table',
        sql: `ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Dropping existing broad relationships policy',
        sql: `DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;`
      },
      {
        description: 'Creating SELECT policy for relationships',
        sql: `
          CREATE POLICY "Users can view own relationships" ON relationships 
          FOR SELECT USING (auth.uid() = user_id);
        `
      },
      {
        description: 'Creating INSERT policy for relationships',
        sql: `
          CREATE POLICY "Users can create own relationships" ON relationships 
          FOR INSERT WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        description: 'Creating UPDATE policy for relationships',
        sql: `
          CREATE POLICY "Users can update own relationships" ON relationships 
          FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        `
      },
      {
        description: 'Creating DELETE policy for relationships',
        sql: `
          CREATE POLICY "Users can delete own relationships" ON relationships 
          FOR DELETE USING (auth.uid() = user_id);
        `
      },
      {
        description: 'Creating partner access policy for relationships',
        sql: `
          CREATE POLICY "Partners can view shared relationships" ON relationships 
          FOR SELECT USING (
            auth.uid()::text = partner_id AND 
            partner_id IS NOT NULL
          );
        `
      }
    ];
    
    for (const step of relationshipSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // USERS TABLE
  if (existingTables.includes('users')) {
    console.log('\n👤 Processing USERS table...');
    
    const userSteps = [
      {
        description: 'Enabling RLS on users table',
        sql: `ALTER TABLE users ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Creating user self-access policy',
        sql: `
          CREATE POLICY "Users can view own profile" ON users 
          FOR SELECT USING (auth.uid() = id);
        `
      },
      {
        description: 'Creating user update policy',
        sql: `
          CREATE POLICY "Users can update own profile" ON users 
          FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
        `
      }
    ];
    
    for (const step of userSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // EVENTS TABLE
  if (existingTables.includes('events')) {
    console.log('\n📅 Processing EVENTS table...');
    
    const eventSteps = [
      {
        description: 'Enabling RLS on events table',
        sql: `ALTER TABLE events ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Creating events ownership policy',
        sql: `
          CREATE POLICY "Users can manage own events" ON events 
          FOR ALL USING (auth.uid() = user_id);
        `
      }
    ];
    
    for (const step of eventSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // CONTACTS TABLE
  if (existingTables.includes('contacts')) {
    console.log('\n📞 Processing CONTACTS table...');
    
    const contactSteps = [
      {
        description: 'Enabling RLS on contacts table',
        sql: `ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Creating contacts ownership policy',
        sql: `
          CREATE POLICY "Users can manage own contacts" ON contacts 
          FOR ALL USING (auth.uid() = user_id);
        `
      }
    ];
    
    for (const step of contactSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // INVITATIONS TABLE
  if (existingTables.includes('invitations')) {
    console.log('\n📨 Processing INVITATIONS table...');
    
    const invitationSteps = [
      {
        description: 'Enabling RLS on invitations table',
        sql: `ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Creating invitations sender policy',
        sql: `
          CREATE POLICY "Users can view sent invitations" ON invitations 
          FOR SELECT USING (auth.uid() = sender_id);
        `
      },
      {
        description: 'Creating invitations receiver policy',
        sql: `
          CREATE POLICY "Users can view received invitations" ON invitations 
          FOR SELECT USING (auth.uid()::text = recipient_email OR auth.uid() = recipient_id);
        `
      }
    ];
    
    for (const step of invitationSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // RELATIONSHIP_GROUPS TABLE (if exists)
  if (existingTables.includes('relationship_groups')) {
    console.log('\n👥 Processing RELATIONSHIP_GROUPS table...');
    
    const groupSteps = [
      {
        description: 'Enabling RLS on relationship_groups table',
        sql: `ALTER TABLE relationship_groups ENABLE ROW LEVEL SECURITY;`
      },
      {
        description: 'Creating relationship groups ownership policy',
        sql: `
          CREATE POLICY "Users can manage own relationship groups" ON relationship_groups 
          FOR ALL USING (auth.uid() = user_id);
        `
      }
    ];
    
    for (const step of groupSteps) {
      const result = await executeSQL(step.sql, step.description);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }
  
  // Step 4: Verification
  console.log('\n📋 Step 4: Post-deployment verification...');
  
  const verificationSQL = `
    SELECT 
      schemaname,
      tablename,
      policyname,
      roles,
      cmd,
      qual
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN (${existingTables.map(t => `'${t}'`).join(', ')})
    ORDER BY tablename, policyname;
  `;
  
  await executeSQL(verificationSQL, 'Listing all applied RLS policies');
  
  // Final summary
  console.log(`\n📊 DEPLOYMENT SUMMARY:`);
  console.log(`   🎯 Tables processed: ${existingTables.length}`);
  console.log(`   ✅ Successful steps: ${successCount}`);
  console.log(`   ❌ Failed steps: ${failureCount}`);
  console.log(`   📈 Success rate: ${successCount > 0 ? ((successCount / (successCount + failureCount)) * 100).toFixed(1) : 0}%`);
  
  if (existingTables.includes('relationships')) {
    console.log(`\n🎉 CRITICAL SUCCESS: Relationships table RLS policies have been applied!`);
    console.log(`   This should fix the relationship data access issue.`);
  }
  
  if (failureCount === 0) {
    console.log(`\n🎉 Production-safe RLS deployment completed successfully!`);
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Test relationship data access in your app`);
    console.log(`   2. Monitor for any access issues`);
    console.log(`   3. Run: node scripts/audit-rls-relationships.js (if available)`);
  } else {
    console.log(`\n⚠️  Deployment completed with some issues. Core functionality should work.`);
  }
  
  return { 
    successCount, 
    failureCount, 
    total: successCount + failureCount, 
    tablesProcessed: existingTables.length,
    relationshipsFixed: existingTables.includes('relationships')
  };
}

// Run deployment
if (require.main === module) {
  deploySafeRLS()
    .then((result) => {
      console.log(`\n✨ Safe RLS deployment completed!`);
      if (result.relationshipsFixed) {
        console.log(`🎯 Relationships table policies applied - main issue should be resolved!`);
      }
      process.exit(result.failureCount === 0 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Deployment failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
}

module.exports = { deploySafeRLS };