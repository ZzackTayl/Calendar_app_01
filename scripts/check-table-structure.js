/**
 * Check Table Structure Script
 * 
 * This script checks the actual structure of the events table.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  try {
    console.log('Checking events table structure...');
    
    // Try to select from the table to see what columns exist
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing events table:', error);
      return false;
    }
    
    console.log('✅ Events table is accessible');
    
    // Try to insert a minimal event to see what fields are required
    const minimalEvent = {
      user_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
      title: 'Minimal Test Event',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString()
    };
    
    console.log('\nTrying to insert minimal event...');
    console.log('Minimal event data:', JSON.stringify(minimalEvent, null, 2));
    
    const { data: insertData, error: insertError } = await supabase
      .from('events')
      .insert(minimalEvent)
      .select();
    
    if (insertError) {
      console.error('❌ Minimal event insertion failed:');
      console.error('Error:', insertError);
      
      // Try with even more minimal data
      const superMinimalEvent = {
        user_id: '00000000-0000-0000-0000-000000000000', // Valid UUID format
        title: 'Super Minimal Test Event',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      };
      
      console.log('\nTrying super minimal event...');
      const { error: superError } = await supabase
        .from('events')
        .insert(superMinimalEvent);
      
      if (superError) {
        console.error('❌ Super minimal event also failed:', superError);
      } else {
        console.log('✅ Super minimal event succeeded!');
      }
      
      return false;
    }
    
    console.log('✅ Minimal event created successfully!');
    console.log('Created event:', insertData);
    
    // Clean up
    if (insertData && insertData[0]) {
      await supabase
        .from('events')
        .delete()
        .eq('id', insertData[0].id);
      console.log('Test event cleaned up');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

// Run the check
checkTableStructure()
  .then(success => {
    if (success) {
      console.log('✅ Table structure check completed');
      process.exit(0);
    } else {
      console.log('❌ Table structure check failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
