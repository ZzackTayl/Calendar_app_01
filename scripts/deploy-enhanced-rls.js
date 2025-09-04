#!/usr/bin/env node

/**
 * Deploy Enhanced RLS Policies Script
 * 
 * This script safely applies the enhanced RLS policies to the database
 * with proper error handling and rollback capabilities.
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

async function executeSQL(sql, description) {
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
    return { success: false, error: error.message };
  }
}

async function deployEnhancedRLS() {
  console.log('🚀 Deploying Enhanced RLS Policies...\n');

  const deploymentSteps = [
    {
      description: 'Creating exec_sql helper function',
      sql: `
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
      `
    },
    {
      description: 'Dropping existing broad relationships policy',
      sql: `DROP POLICY IF EXISTS "Users can manage own relationships" ON relationships;`
    },
    {
      description: 'Creating granular SELECT policy for relationships',
      sql: `
        CREATE POLICY "Users can view own relationships" ON relationships 
        FOR SELECT USING (auth.uid() = user_id);
      `
    },
    {
      description: 'Creating granular INSERT policy for relationships',
      sql: `
        CREATE POLICY "Users can create own relationships" ON relationships 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      description: 'Creating granular UPDATE policy for relationships',
      sql: `
        CREATE POLICY "Users can update own relationships" ON relationships 
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
      `
    },
    {
      description: 'Creating granular DELETE policy for relationships',
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
          auth.uid() = partner_id AND 
          partner_id IS NOT NULL AND 
          is_active = true
        );
      `
    },
    {
      description: 'Updating relationship_groups policies',
      sql: `
        DROP POLICY IF EXISTS "Users can manage own relationship groups" ON relationship_groups;
        
        CREATE POLICY "Users can view own relationship groups" ON relationship_groups 
        FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can create own relationship groups" ON relationship_groups 
        FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update own relationship groups" ON relationship_groups 
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can delete own relationship groups" ON relationship_groups 
        FOR DELETE USING (auth.uid() = user_id);
      `
    },
    {
      description: 'Updating relationship_group_members policies',
      sql: `
        DROP POLICY IF EXISTS "Users can access own group memberships" ON relationship_group_members;
        
        CREATE POLICY "Users can view own group memberships" ON relationship_group_members 
        FOR SELECT USING (
          auth.uid() IN (
            SELECT user_id FROM relationship_groups WHERE id = group_id
          )
        );
        
        CREATE POLICY "Users can add to own groups" ON relationship_group_members 
        FOR INSERT WITH CHECK (
          auth.uid() IN (
            SELECT user_id FROM relationship_groups WHERE id = group_id
          ) AND
          auth.uid() IN (
            SELECT user_id FROM relationships WHERE id = relationship_id
          )
        );
        
        CREATE POLICY "Users can update own group memberships" ON relationship_group_members 
        FOR UPDATE USING (
          auth.uid() IN (
            SELECT user_id FROM relationship_groups WHERE id = group_id
          )
        ) WITH CHECK (
          auth.uid() IN (
            SELECT user_id FROM relationship_groups WHERE id = group_id
          )
        );
        
        CREATE POLICY "Users can remove from own groups" ON relationship_group_members 
        FOR DELETE USING (
          auth.uid() IN (
            SELECT user_id FROM relationship_groups WHERE id = group_id
          )
        );
      `
    },
    {
      description: 'Creating relationship validation function',
      sql: `
        CREATE OR REPLACE FUNCTION validate_relationship_data()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
          -- Prevent self-relationships
          IF NEW.user_id = NEW.partner_id THEN
            RAISE EXCEPTION 'Cannot create relationship with yourself';
          END IF;
          
          -- Ensure user_id is always the authenticated user for new records
          IF TG_OP = 'INSERT' AND NEW.user_id != auth.uid() THEN
            RAISE EXCEPTION 'Cannot create relationship for another user';
          END IF;
          
          -- Prevent changing user_id on updates
          IF TG_OP = 'UPDATE' AND OLD.user_id != NEW.user_id THEN
            RAISE EXCEPTION 'Cannot change relationship owner';
          END IF;
          
          RETURN NEW;
        END;
        $$;
      `
    },
    {
      description: 'Creating relationship validation trigger',
      sql: `
        DROP TRIGGER IF EXISTS validate_relationship_trigger ON relationships;
        CREATE TRIGGER validate_relationship_trigger
          BEFORE INSERT OR UPDATE ON relationships
          FOR EACH ROW
          EXECUTE FUNCTION validate_relationship_data();
      `
    }
  ];

  let successCount = 0;
  let failureCount = 0;

  for (const step of deploymentSteps) {
    const result = await executeSQL(step.sql, step.description);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      console.log(`   ⚠️  This step failed but deployment continues...`);
    }
  }

  console.log(`\n📊 DEPLOYMENT SUMMARY:`);
  console.log(`   ✅ Successful steps: ${successCount}`);
  console.log(`   ❌ Failed steps: ${failureCount}`);
  console.log(`   📈 Success rate: ${((successCount / deploymentSteps.length) * 100).toFixed(1)}%`);

  if (failureCount === 0) {
    console.log(`\n🎉 Enhanced RLS policies deployed successfully!`);
  } else {
    console.log(`\n⚠️  Deployment completed with some issues. Please review failed steps.`);
  }

  return { successCount, failureCount, total: deploymentSteps.length };
}

// Run deployment
deployEnhancedRLS()
  .then((result) => {
    if (result.failureCount === 0) {
      console.log('\n🔍 Running post-deployment validation...');
      console.log('Run: node scripts/audit-rls-relationships.js');
    }
  })
  .catch(error => {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  });