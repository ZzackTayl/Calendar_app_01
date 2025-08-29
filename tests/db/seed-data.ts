/**
 * Database Seeding Utilities for Testing
 * 
 * Provides functions to seed the test database with realistic test data
 * for comprehensive testing scenarios.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export type TestUser = {
  id: string;
  email: string;
  full_name: string;
  display_name?: string;
  time_zone?: string;
  default_privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
};

export type TestRelationship = {
  id: string;
  user_id: string;
  partner_id?: string;
  partner_email?: string;
  partner_name: string;
  relationship_type?: 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'friendship' | 'other';
  default_privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
  color?: string;
};

export type TestEvent = {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  privacy_level?: 'private' | 'visible' | 'semi_private' | 'public';
  relationship_id?: string;
  color?: string;
  status?: 'confirmed' | 'tentative' | 'cancelled';
};

export class DatabaseSeeder {
  private client: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.client = createClient<Database>(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Seed test users for various testing scenarios
   */
  async seedUsers(): Promise<TestUser[]> {
    const users: TestUser[] = [
      {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'test.user1@example.com',
        full_name: 'Alice Test User',
        display_name: 'Alice',
        time_zone: 'America/New_York',
        default_privacy_level: 'private'
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        email: 'test.user2@example.com',
        full_name: 'Bob Test User',
        display_name: 'Bob',
        time_zone: 'America/Los_Angeles',
        default_privacy_level: 'visible'
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        email: 'test.user3@example.com',
        full_name: 'Charlie Test User',
        display_name: 'Charlie',
        time_zone: 'Europe/London',
        default_privacy_level: 'semi_private'
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        email: 'test.user4@example.com',
        full_name: 'Dana Test User',
        display_name: 'Dana',
        time_zone: 'Asia/Tokyo',
        default_privacy_level: 'public'
      }
    ];

    // Insert users
    const { error: usersError } = await this.client
      .from('users')
      .upsert(users, { onConflict: 'id' });

    if (usersError) {
      throw new Error(`Failed to seed users: ${usersError.message}`);
    }

    // Create corresponding user profiles
    const profiles = users.map(user => ({
      id: user.id,
      full_name: user.full_name,
      username: user.display_name?.toLowerCase() || user.full_name.toLowerCase().replace(' ', ''),
      time_zone: user.time_zone || 'UTC',
      onboarding_completed: true,
      email_notifications: true,
      push_notifications: true,
      email_consent: true,
      data_collection_consent: true
    }));

    const { error: profilesError } = await this.client
      .from('user_profiles')
      .upsert(profiles, { onConflict: 'id' });

    if (profilesError) {
      throw new Error(`Failed to seed user profiles: ${profilesError.message}`);
    }

    return users;
  }

  /**
   * Seed test relationships between users
   */
  async seedRelationships(users: TestUser[]): Promise<TestRelationship[]> {
    const relationships: TestRelationship[] = [
      {
        id: '10000000-0000-0000-0000-000000000001',
        user_id: users[0].id, // Alice
        partner_id: users[1].id, // Bob
        partner_name: 'Bob Test User',
        relationship_type: 'primary',
        default_privacy_level: 'visible',
        color: '#FF6B6B'
      },
      {
        id: '10000000-0000-0000-0000-000000000002',
        user_id: users[0].id, // Alice
        partner_id: users[2].id, // Charlie
        partner_name: 'Charlie Test User',
        relationship_type: 'secondary',
        default_privacy_level: 'semi_private',
        color: '#4ECDC4'
      },
      {
        id: '10000000-0000-0000-0000-000000000003',
        user_id: users[1].id, // Bob
        partner_id: users[0].id, // Alice (reciprocal)
        partner_name: 'Alice Test User',
        relationship_type: 'primary',
        default_privacy_level: 'visible',
        color: '#45B7D1'
      },
      {
        id: '10000000-0000-0000-0000-000000000004',
        user_id: users[2].id, // Charlie
        partner_email: 'pending.user@example.com', // Pending invitation
        partner_name: 'Pending User',
        relationship_type: 'friendship',
        default_privacy_level: 'private',
        color: '#96CEB4'
      }
    ];

    const { error } = await this.client
      .from('relationships')
      .upsert(relationships, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed relationships: ${error.message}`);
    }

    return relationships;
  }

  /**
   * Seed test events with various privacy levels and scenarios
   */
  async seedEvents(users: TestUser[], relationships: TestRelationship[]): Promise<TestEvent[]> {
    const now = new Date();
    const events: TestEvent[] = [
      {
        id: '20000000-0000-0000-0000-000000000001',
        user_id: users[0].id, // Alice
        title: 'Private Meeting',
        description: 'A private meeting that should not be visible to others',
        start_time: new Date(now.getTime() + 3600000).toISOString(), // +1 hour
        end_time: new Date(now.getTime() + 7200000).toISOString(), // +2 hours
        location: 'Alice\'s Office',
        privacy_level: 'private',
        color: '#FF6B6B',
        status: 'confirmed'
      },
      {
        id: '20000000-0000-0000-0000-000000000002',
        user_id: users[0].id, // Alice
        title: 'Date with Bob',
        description: 'Romantic dinner date',
        start_time: new Date(now.getTime() + 86400000).toISOString(), // +1 day
        end_time: new Date(now.getTime() + 90000000).toISOString(), // +1 day + 1 hour
        location: 'Fancy Restaurant',
        privacy_level: 'visible',
        relationship_id: relationships[0].id,
        color: '#4ECDC4',
        status: 'confirmed'
      },
      {
        id: '20000000-0000-0000-0000-000000000003',
        user_id: users[1].id, // Bob
        title: 'Semi-Private Event',
        description: 'An event with limited visibility',
        start_time: new Date(now.getTime() + 172800000).toISOString(), // +2 days
        end_time: new Date(now.getTime() + 176400000).toISOString(), // +2 days + 1 hour
        location: 'Community Center',
        privacy_level: 'semi_private',
        color: '#45B7D1',
        status: 'tentative'
      },
      {
        id: '20000000-0000-0000-0000-000000000004',
        user_id: users[2].id, // Charlie
        title: 'Public Workshop',
        description: 'A public workshop open to everyone',
        start_time: new Date(now.getTime() + 259200000).toISOString(), // +3 days
        end_time: new Date(now.getTime() + 266400000).toISOString(), // +3 days + 2 hours
        location: 'Convention Center',
        privacy_level: 'public',
        color: '#96CEB4',
        status: 'confirmed'
      },
      {
        id: '20000000-0000-0000-0000-000000000005',
        user_id: users[0].id, // Alice
        title: 'Cancelled Event',
        description: 'This event was cancelled',
        start_time: new Date(now.getTime() - 86400000).toISOString(), // -1 day (past)
        end_time: new Date(now.getTime() - 82800000).toISOString(), // -1 day + 1 hour
        location: 'Cancelled Location',
        privacy_level: 'private',
        color: '#FF9999',
        status: 'cancelled'
      }
    ];

    const { error } = await this.client
      .from('events')
      .upsert(events, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed events: ${error.message}`);
    }

    return events;
  }

  /**
   * Seed relationship groups for testing group-based permissions
   */
  async seedRelationshipGroups(users: TestUser[]): Promise<any[]> {
    const groups = [
      {
        id: '30000000-0000-0000-0000-000000000001',
        user_id: users[0].id, // Alice
        group_name: 'Close Friends',
        description: 'My closest friends group',
        color: '#FF6B6B',
        is_active: true
      },
      {
        id: '30000000-0000-0000-0000-000000000002',
        user_id: users[0].id, // Alice
        group_name: 'Family',
        description: 'Family members',
        color: '#4ECDC4',
        is_active: true
      },
      {
        id: '30000000-0000-0000-0000-000000000003',
        user_id: users[1].id, // Bob
        group_name: 'Work Colleagues',
        description: 'People I work with',
        color: '#45B7D1',
        is_active: true
      }
    ];

    const { error } = await this.client
      .from('relationship_groups')
      .upsert(groups, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed relationship groups: ${error.message}`);
    }

    return groups;
  }

  /**
   * Seed event visibility permissions for testing
   */
  async seedEventVisibility(events: TestEvent[], users: TestUser[], groups: any[]): Promise<any[]> {
    const visibility = [
      {
        id: '40000000-0000-0000-0000-000000000001',
        event_id: events[1].id, // Alice's date with Bob
        user_id: users[1].id, // Give Bob visibility
        privacy_level: 'visible',
        can_see_details: true,
        can_see_location: true,
        can_see_description: true,
        can_edit: false
      },
      {
        id: '40000000-0000-0000-0000-000000000002',
        event_id: events[2].id, // Bob's semi-private event
        group_id: groups[0].id, // Give Close Friends group visibility
        privacy_level: 'semi_private',
        can_see_details: true,
        can_see_location: false, // Can see event but not location
        can_see_description: true,
        can_edit: false
      }
    ];

    const { error } = await this.client
      .from('event_visibility')
      .upsert(visibility, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to seed event visibility: ${error.message}`);
    }

    return visibility;
  }

  /**
   * Seed all test data in the correct order
   */
  async seedAll(): Promise<{
    users: TestUser[];
    relationships: TestRelationship[];
    events: TestEvent[];
    groups: any[];
    visibility: any[];
  }> {
    console.log('🌱 Starting database seeding...');

    try {
      const users = await this.seedUsers();
      console.log(`✅ Seeded ${users.length} users`);

      const relationships = await this.seedRelationships(users);
      console.log(`✅ Seeded ${relationships.length} relationships`);

      const events = await this.seedEvents(users, relationships);
      console.log(`✅ Seeded ${events.length} events`);

      const groups = await this.seedRelationshipGroups(users);
      console.log(`✅ Seeded ${groups.length} relationship groups`);

      const visibility = await this.seedEventVisibility(events, users, groups);
      console.log(`✅ Seeded ${visibility.length} event visibility rules`);

      console.log('🎉 Database seeding completed successfully!');

      return { users, relationships, events, groups, visibility };
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }
}

// Export utility function for easy use in tests
export async function seedTestDatabase(): Promise<DatabaseSeeder> {
  const seeder = new DatabaseSeeder();
  await seeder.seedAll();
  return seeder;
}