#!/usr/bin/env node

// Script to apply the unified schema to your Supabase database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyUnifiedSchema() {
  console.log('Starting unified schema application...');
  
  try {
    // Check if we can connect to the database
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('Database connection failed:', error.message);
      return;
    }
    
    console.log('Database connection successful!');
    
    // Note: In a real implementation, you would apply the migration here
    // For now, we're just verifying the connection
    
    console.log('Unified schema migration would be applied here.');
    console.log('Please run the following command to apply the migration:');
    console.log('npx supabase db push');
    
  } catch (err) {
    console.error('Error applying unified schema:', err.message);
  }
}

// Run the script
applyUnifiedSchema();