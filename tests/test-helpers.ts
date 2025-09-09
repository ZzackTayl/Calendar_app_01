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
  async createTestUser() {
    const uniqueId = uuidv4().substring(0, 8);
    const email = `test-${uniqueId}@example.com`;
    const password = 'TestPassword123!';
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for testing
      user_metadata: {
        full_name: `Test User ${uniqueId}`,
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
          full_name: `Test User ${uniqueId}`,
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
   * Clean up test data for given user IDs
   */
  async cleanupTestData(userIds: (string | undefined)[]) {
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
