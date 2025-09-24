#!/usr/bin/env node

/**
 * Comprehensive Database Structure Check
 * Checks all possible tables and their structures
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Comprehensive Database Structure Check');
console.log('==========================================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkAllTables() {
  try {
    // List of all possible table names based on the codebase
    const possibleTables = [
      'users', 'user_profiles', 'profiles', 'events', 'reminders',
      'relationships', 'partners', 'connections', 'contacts', 'invitations',
      'groups', 'group_members', 'settings', 'user_settings',
      'relationship_groups', 'relationship_group_members', 'user_onboarding',
      'user_email_preferences', 'calendar_integration_setup', 'beta_testing_consent',
      'onboarding_analytics', 'invitations', 'connection_setups', 'invitation_tokens',
      'invitation_notification_preferences', 'group_invitations', 'group_members',
      'group_member_permissions', 'group_invitation_tokens', 'enhanced_user_profiles'
    ];

    console.log('Checking all possible table names...\n');

    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: EXISTS`);
          if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`   📋 Columns (${columns.length}): ${columns.join(', ')}`);

            // Check if this table has relationship-like columns
            const relationshipColumns = ['partner_name', 'relationship_type', 'user_id', 'partner_id', 'partner_email'];
            const hasRelationshipColumns = relationshipColumns.some(col =>
              columns.some(tableCol => tableCol.toLowerCase().includes(col.toLowerCase()))
            );

            if (hasRelationshipColumns) {
              console.log(`   🎯 POTENTIAL RELATIONSHIPS TABLE!`);
              console.log(`   📋 Sample data: ${JSON.stringify(data[0], null, 2)}`);
            }
          } else {
            console.log(`   📋 Table exists but no data found`);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }

    console.log('\n📋 SUMMARY:');
    console.log('============');
    console.log('The dashboard error is caused by trying to query a "relationships" table that doesn\'t exist.');
    console.log('');
    console.log('RECOMMENDED FIXES:');
    console.log('1. Create the relationships table with the correct schema');
    console.log('2. Update the dashboard code to use an existing table');
    console.log('3. Check if relationship data is stored elsewhere');
    console.log('');
    console.log('Next, I should check the migration files to see what the intended schema is.');

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkAllTables().catch(console.error);
