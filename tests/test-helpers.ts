import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test Helper Functions
 * 
 * Common utilities for creating test data and cleaning up after tests
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for test cleanup
);

export const testHelpers = {
  /**
   * Create a test user with a unique email
   */
  async createTestUser(userData?: { email?: string; name?: string }) {
    const uniqueId = uuidv4().substring(0, 8);
    const email = userData?.email || `test-${uniqueId}@example.com`;
    const name = userData?.name || `Test User ${uniqueId}`;
    const password = 'TestPassword123!';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        full_name: name,
        is_test_user: true
      }
    });
    
    if (error) {
      console.error('Error creating test user:', error);
      throw error;
    }
    
    // Create user profile
    if (data.user) {
      await supabase
        .from('users')
        .insert({
          id: data.user.id,
          phone_number: email,
          full_name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    return data.user;
  },
  
  /**
   * Create a test event
   */
  async createTestEvent(userId: string, eventData?: Partial<any>) {
    const defaultEvent = {
      user_id: userId,
      title: 'Test Event',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      privacy_level: 'private',
      status: 'confirmed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('events')
      .insert({ ...defaultEvent, ...eventData })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test event:', error);
      throw error;
    }
    
    return data;
  },
  
  /**
   * Create a test relationship between two users
   */
  async createTestRelationship(user1Id: string, user2Id: string, type = 'partner') {
    const { data, error } = await supabase
      .from('relationships')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        status: 'active',
        relationship_type: type,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test relationship:', error);
      throw error;
    }
    
    return data;
  },
  
  /**
   * Create a test group
   */
  async createTestGroup(ownerId: string, memberIds: string[] = []) {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        created_by: ownerId,
        name: 'Test Group',
        description: 'Test group for key management',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test group:', error);
      throw error;
    }
    
    // Add members to group
    if (memberIds.length > 0) {
      const members = memberIds.map(memberId => ({
        group_id: data.id,
        user_id: memberId,
        role: 'member',
        added_at: new Date().toISOString()
      }));
      
      await supabase.from('group_members').insert(members);
    }
    
    return data;
  },

  /**
   * Invite user to event
   */
  async inviteUserToEvent(eventId: string, userId: string, invitedBy: string) {
    const { data, error } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: userId,
        invited_by: invitedBy,
        status: 'invited',
        invited_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error inviting user to event:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Update event data
   */
  async updateEvent(eventId: string, updates: any) {
    const { data, error } = await supabase
      .from('events')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating event:', error);
      throw error;
    }
    
    return data;
  },

  /**
   * Clean up test data for given user IDs
   */
  async cleanupTestData(userIds?: (string | undefined)[]) {
    // If no userIds provided, return early
    if (!userIds || userIds.length === 0) return;
    const validUserIds = userIds.filter(id => id !== undefined) as string[];
    
    if (validUserIds.length === 0) return;
    
    try {
      // Delete in correct order to avoid foreign key constraints
      
      // Delete event permissions
      await supabase
        .from('event_permissions')
        .delete()
        .in('event_id', 
          supabase
            .from('events')
            .select('id')
            .in('user_id', validUserIds)
        );
      
      // Delete events
      await supabase
        .from('events')
        .delete()
        .in('user_id', validUserIds);
      
      // Delete relationships
      await supabase
        .from('relationships')
        .delete()
        .or(`user1_id.in.(${validUserIds.join(',')}),user2_id.in.(${validUserIds.join(',')})`);
      
      // Delete group memberships
      await supabase
        .from('relationship_group_members')
        .delete()
        .in('user_id', validUserIds);
      
      // Delete invitations
      await supabase
        .from('invitations')
        .delete()
        .or(`sender_id.in.(${validUserIds.join(',')}),recipient_user_id.in.(${validUserIds.join(',')})`);
      
      // Delete contacts
      await supabase
        .from('contacts')
        .delete()
        .in('user_id', validUserIds);
      
      // Delete user profiles
      await supabase
        .from('users')
        .delete()
        .in('id', validUserIds);
      
      // Delete auth users (requires service role key)
      for (const userId of validUserIds) {
        await supabase.auth.admin.deleteUser(userId);
      }
      
      console.log(`Cleaned up test data for ${validUserIds.length} users`);
    } catch (error) {
      console.error('Error cleaning up test data:', error);
      // Don't throw - cleanup errors shouldn't fail tests
    }
  },
  
  /**
   * Wait for a condition to be true (useful for async operations)
   */
  async waitFor(condition: () => Promise<boolean>, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error('Timeout waiting for condition');
  }
};
