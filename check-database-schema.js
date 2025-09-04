#!/usr/bin/env node

/**
 * Check Database Schema
 * 
 * This script checks the actual database schema and identifies what needs to be updated.
 */

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDatabaseSchema() {
  try {
    console.log('Checking database schema...');
    
    // Check users table structure
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('Error accessing users table:', usersError);
      return;
    }
    
    if (usersData && usersData.length > 0) {
      const user = usersData[0];
      console.log('\nUsers table columns:');
      console.log('===================');
      Object.keys(user).forEach(key => {
        console.log(`- ${key}: ${typeof user[key]} (${user[key] === null ? 'NULL' : 'NOT NULL'})`);
      });
    }
    
    // Check if timezone column exists specifically
    console.log('\nChecking timezone column specifically...');
    const { data: timezoneData, error: timezoneError } = await supabase
      .from('users')
      .select('timezone')
      .limit(1);
    
    if (timezoneError) {
      console.error('Error accessing timezone column:', timezoneError);
    } else {
      console.log('✅ timezone column exists and is accessible');
      if (timezoneData && timezoneData.length > 0) {
        console.log('Sample timezone value:', timezoneData[0].timezone);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDatabaseSchema();
