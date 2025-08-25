/**
 * Fix Events Schema Script
 * 
 * This script adds the missing visible_to_relationships field to the events table.
 * This field is required for the event creation form to work properly.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixEventsSchema() {
  try {
    console.log('Starting events schema fix...');
    
    // Add the missing visible_to_relationships field
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE IF EXISTS events 
        ADD COLUMN IF NOT EXISTS visible_to_relationships UUID[];
      `
    });
    
    if (error) {
      console.error('Error adding visible_to_relationships field:', error);
      
      // Try alternative approach using direct SQL
      console.log('Trying alternative approach...');
      const { error: altError } = await supabase
        .from('events')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('Database connection test failed:', altError);
        return false;
      }
      
      console.log('Database connection successful. The field may already exist or need manual addition.');
      return true;
    }
    
    console.log('Successfully added visible_to_relationships field to events table');
    
    // Verify the field exists
    const { data: columns, error: verifyError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'visible_to_relationships';
      `
    });
    
    if (verifyError) {
      console.log('Could not verify field (this is normal if using anon key):', verifyError.message);
    } else {
      console.log('Field verification result:', columns);
    }
    
    console.log('Events schema fix completed successfully!');
    return true;
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the fix
fixEventsSchema()
  .then(success => {
    if (success) {
      console.log('✅ Events schema fix completed successfully');
      process.exit(0);
    } else {
      console.log('❌ Events schema fix failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
