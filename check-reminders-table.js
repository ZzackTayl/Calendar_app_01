#!/usr/bin/env node

/**
 * Check Reminders Table Structure
 * Since reminders table exists, let's see if it contains relationship data
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Reminders Table Structure Check');
console.log('==================================\n');

if (!supabaseUrl || !anonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

async function checkRemindersTable() {
  try {
    console.log('1. Checking reminders table structure...');
    const { data: reminders, error: remindersError } = await supabase
      .from('reminders')
      .select('*')
      .limit(1);

    if (remindersError) {
      console.log('   ❌ Cannot access reminders table:', remindersError.message);
      return;
    }

    if (reminders && reminders.length > 0) {
      const columns = Object.keys(reminders[0]);
      console.log('   ✅ Reminders table accessible');
      console.log('   📋 Columns:', columns.join(', '));

      // Check if this looks like it contains relationship data
      const relationshipColumns = ['partner_name', 'relationship_type', 'user_id', 'partner_id', 'partner_email'];
      const hasRelationshipColumns = relationshipColumns.some(col =>
        columns.some(tableCol => tableCol.toLowerCase().includes(col.toLowerCase()))
      );

      if (hasRelationshipColumns) {
        console.log('   🎯 This table appears to contain relationship data!');
        console.log('   📋 Sample data structure:');
        console.log('   ', JSON.stringify(reminders[0], null, 2));
      } else {
        console.log('   ℹ️  This table does not appear to contain relationship data');
      }
    } else {
      console.log('   ✅ Reminders table exists but no data found');
      console.log('   📋 Table structure needs to be examined');
    }

    console.log('\n2. Checking user_profiles table for relationship data...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (profilesError) {
      console.log('   ❌ Cannot access user_profiles table:', profilesError.message);
    } else if (profiles && profiles.length > 0) {
      console.log('   ✅ User_profiles table accessible');
      const columns = Object.keys(profiles[0]);
      console.log('   📋 Columns:', columns.join(', '));
      console.log('   📋 Sample data:');
      console.log('   ', JSON.stringify(profiles[0], null, 2));
    }

    console.log('\n📋 CONCLUSION:');
    console.log('==============');
    console.log('The dashboard is trying to query a "relationships" table that doesn\'t exist.');
    console.log('');
    console.log('POSSIBLE SOLUTIONS:');
    console.log('1. The "reminders" table might be the relationships table');
    console.log('2. Relationship data might be stored in "user_profiles" table');
    console.log('3. The relationships table needs to be created');
    console.log('4. The dashboard code needs to be updated to use correct table name');

  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

checkRemindersTable().catch(console.error);
