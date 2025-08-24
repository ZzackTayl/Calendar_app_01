#!/usr/bin/env node

/**
 * Alpha Test Cleanup Script
 * 
 * This script cleans up test data created during alpha testing.
 * Use with caution - this will delete test users and related data.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test engineer accounts
const testEngineers = [
  'engineer1@test.com',
  'engineer2@test.com',
  'engineer3@test.com',
  'engineer4@test.com'
];

async function cleanupTestEnvironment() {
  console.log('Cleaning up alpha test environment...');
  console.log('WARNING: This will delete test users and all their data!');
  
  // Confirm cleanup
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('Are you sure you want to proceed? Type "YES" to confirm: ', async (answer) => {
    if (answer !== 'YES') {
      console.log('Cleanup cancelled.');
      readline.close();
      return;
    }
    
    try {
      console.log('Starting cleanup process...');
      
      // Get user IDs for test engineers
      const userIds = [];
      for (const email of testEngineers) {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('phone_number', email)
          .single();
          
        if (data) {
          userIds.push(data.id);
          console.log(`Found user: ${email} (${data.id})`);
        } else if (error) {
          console.log(`User not found: ${email}`);
        }
      }
      
      if (userIds.length === 0) {
        console.log('No test users found to clean up.');
        readline.close();
        return;
      }
      
      // Delete related data first (due to foreign key constraints)
      console.log('Deleting related data...');
      
      // Delete events
      const { error: eventsError } = await supabase
        .from('events')
        .delete()
        .in('owner_id', userIds);
        
      if (eventsError) {
        console.warn('Warning: Could not delete all events:', eventsError.message);
      } else {
        console.log('✓ Events deleted');
      }
      
      // Delete relationships
      const { error: relationshipsError } = await supabase
        .from('relationships')
        .delete()
        .or(`user_id.in.(${userIds.join(',')}),partner_id.in.(${userIds.join(',')})`);
        
      if (relationshipsError) {
        console.warn('Warning: Could not delete all relationships:', relationshipsError.message);
      } else {
        console.log('✓ Relationships deleted');
      }
      
      // Delete group memberships
      const { error: groupMembersError } = await supabase
        .from('relationship_group_members')
        .delete()
        .in('user_id', userIds);
        
      if (groupMembersError) {
        console.warn('Warning: Could not delete group memberships:', groupMembersError.message);
      } else {
        console.log('✓ Group memberships deleted');
      }
      
      // Delete invitations
      const { error: invitationsError } = await supabase
        .from('invitations')
        .delete()
        .or(`sender_id.in.(${userIds.join(',')}),recipient_user_id.in.(${userIds.join(',')})`);
        
      if (invitationsError) {
        console.warn('Warning: Could not delete invitations:', invitationsError.message);
      } else {
        console.log('✓ Invitations deleted');
      }
      
      // Delete group invitations
      const { error: groupInvitationsError } = await supabase
        .from('group_invitations')
        .delete()
        .or(`inviter_id.in.(${userIds.join(',')}),invitee_user_id.in.(${userIds.join(',')})`);
        
      if (groupInvitationsError) {
        console.warn('Warning: Could not delete group invitations:', groupInvitationsError.message);
      } else {
        console.log('✓ Group invitations deleted');
      }
      
      // Delete users
      console.log('Deleting test users...');
      for (const userId of userIds) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);
          
        if (error) {
          console.warn(`Warning: Could not delete user ${userId}:`, error.message);
        } else {
          console.log(`✓ User ${userId} deleted`);
        }
      }
      
      console.log('=== CLEANUP COMPLETE ===');
      console.log('All test data has been removed from the database.');
      
    } catch (error) {
      console.error('Error during cleanup:', error.message);
    } finally {
      readline.close();
    }
  });
}

// Run the cleanup script
if (require.main === module) {
  cleanupTestEnvironment();
}

module.exports = { cleanupTestEnvironment };