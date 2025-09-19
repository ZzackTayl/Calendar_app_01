import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Type definitions for seeded database entities
export interface SeededUser {
  id: string;
  email: string;
  password: string;
  full_name: string;
  display_name: string;
  time_zone: string;
  default_privacy_level: 'private' | 'visible' | 'semi_private' | 'public';
  is_active: boolean;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SeededRelationshipGroup {
  id: string;
  user_id: string;
  group_name: string;
  description: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeededRelationship {
  id: string;
  user_id: string;
  partner_id?: string;
  partner_email?: string;
  partner_name: string;
  group_id?: string;
  relationship_type: 'primary' | 'secondary' | 'nesting' | 'long_distance' | 'casual' | 'friendship' | 'other';
  default_privacy_level: 'private' | 'visible' | 'semi_private' | 'public';
  start_date?: string;
  birthday?: string;
  anniversary_date?: string;
  color: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeededEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location?: string;
  time_zone: string;
  is_all_day: boolean;
  privacy_level: 'private' | 'visible' | 'semi_private' | 'public';
  relationship_id?: string;
  color: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface SeededContact {
  id: string;
  user_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  job_title?: string;
  notes?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SeededUserPreferences {
  id: string;
  user_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  default_event_duration: number;
  calendar_view_default: string;
  color_scheme: string;
  language: string;
  created_at: string;
  updated_at: string;
}

// Database seeding state interface
export interface DatabaseSeedState {
  users: Map<string, SeededUser>;
  relationshipGroups: Map<string, SeededRelationshipGroup>;
  relationships: Map<string, SeededRelationship>;
  events: Map<string, SeededEvent>;
  contacts: Map<string, SeededContact>;
  userPreferences: Map<string, SeededUserPreferences>;
}

/**
 * Enhanced Supabase database seeder for comprehensive contract testing
 * Provides deterministic data seeding for provider verification replay
 */
export class SupabaseDatabaseSeeder {
  private adminClient: SupabaseClient | null = null;
  private seedState: DatabaseSeedState = {
    users: new Map(),
    relationshipGroups: new Map(),
    relationships: new Map(),
    events: new Map(),
    contacts: new Map(),
    userPreferences: new Map(),
  };
  private createdRecordIds = new Set<string>();
  private transactionQueries: string[] = [];

  // Test data constants for deterministic seeding
  readonly testUsers = {
    confirmed: {
      id: 'd83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2',
      email: 'confirmed-user@example.com',
      password: 'TestPass123!',
      full_name: 'Confirmed User',
      display_name: 'Confirmed',
      time_zone: 'America/New_York',
    },
    unconfirmed: {
      id: 'a72b9dc4-3f8e-4b65-9c7d-2e1f4a9b8c5d',
      email: 'pending-user@example.com',
      password: 'TestPass123!',
      full_name: 'Pending User',
      display_name: 'Pending',
      time_zone: 'America/Los_Angeles',
    },
    partner: {
      id: 'b85c7ef1-4a92-4d78-8f6e-3b2c5a8d9e1f',
      email: 'partner-user@example.com',
      password: 'TestPass123!',
      full_name: 'Partner User',
      display_name: 'Partner',
      time_zone: 'America/Chicago',
    },
  };

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.TEST_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TEST_SUPABASE_SERVICE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
          global: {
            headers: {
              'X-Client-Info': 'contract-test-seeder',
            },
          },
        });
      } catch (error) {
        console.warn('[DatabaseSeeder] Failed to initialize Supabase client:', error);
        this.adminClient = null;
      }
    } else {
      console.warn('[DatabaseSeeder] Missing Supabase configuration for seeding');
    }
  }

  /**
   * Seed a complete user scenario with related data
   */
  async seedUserScenario(scenarioName: string): Promise<void> {
    if (!this.adminClient) {
      console.warn('[DatabaseSeeder] No admin client available, using mock data only');
      this.seedMockUserScenario(scenarioName);
      return;
    }

    try {
      await this.beginTransaction();

      switch (scenarioName) {
        case 'confirmed-user-with-relationships':
          await this.seedConfirmedUserWithRelationships();
          break;
        case 'unconfirmed-user':
          await this.seedUnconfirmedUser();
          break;
        case 'user-with-events-and-contacts':
          await this.seedUserWithEventsAndContacts();
          break;
        case 'multi-user-scenario':
          await this.seedMultiUserScenario();
          break;
        case 'empty-database':
          await this.clearAllData();
          break;
        default:
          console.warn(`[DatabaseSeeder] Unknown scenario: ${scenarioName}`);
      }

      await this.commitTransaction();
    } catch (error) {
      await this.rollbackTransaction();
      console.error(`[DatabaseSeeder] Failed to seed scenario ${scenarioName}:`, error);
      // Fallback to mock data
      this.seedMockUserScenario(scenarioName);
    }
  }

  /**
   * Create a confirmed user with relationships, groups, and events
   */
  private async seedConfirmedUserWithRelationships(): Promise<void> {
    const now = new Date().toISOString();
    const user = this.testUsers.confirmed;

    // Create the main user
    const seededUser = await this.seedUser({
      ...user,
      default_privacy_level: 'visible',
      is_active: true,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    // Create user preferences
    await this.seedUserPreferences({
      id: randomUUID(),
      user_id: seededUser.id,
      email_notifications: true,
      push_notifications: true,
      sms_notifications: false,
      default_event_duration: 60,
      calendar_view_default: 'week',
      color_scheme: 'light',
      language: 'en',
      created_at: now,
      updated_at: now,
    });

    // Create relationship group
    const relationshipGroup = await this.seedRelationshipGroup({
      id: randomUUID(),
      user_id: seededUser.id,
      group_name: 'Primary Partners',
      description: 'My primary romantic relationships',
      color: '#FF6B6B',
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // Create a relationship
    const relationship = await this.seedRelationship({
      id: randomUUID(),
      user_id: seededUser.id,
      partner_name: 'Alex Johnson',
      partner_email: 'alex@example.com',
      group_id: relationshipGroup.id,
      relationship_type: 'primary',
      default_privacy_level: 'visible',
      start_date: '2023-01-15',
      anniversary_date: '2023-01-15',
      color: '#4ECDC4',
      notes: 'Met at coffee shop',
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // Create events
    const startTime = new Date();
    startTime.setHours(19, 0, 0, 0); // 7 PM today
    const endTime = new Date(startTime);
    endTime.setHours(21, 0, 0, 0); // 9 PM today

    await this.seedEvent({
      id: randomUUID(),
      user_id: seededUser.id,
      title: 'Date Night',
      description: 'Dinner at favorite restaurant',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      location: 'The Garden Restaurant',
      time_zone: seededUser.time_zone,
      is_all_day: false,
      privacy_level: 'visible',
      relationship_id: relationship.id,
      color: relationship.color,
      status: 'confirmed',
      created_at: now,
      updated_at: now,
    });

    // Create contacts
    await this.seedContact({
      id: randomUUID(),
      user_id: seededUser.id,
      first_name: 'Alex',
      last_name: 'Johnson',
      email: 'alex@example.com',
      phone_number: '+1-555-0123',
      notes: 'Partner contact',
      is_favorite: true,
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Create an unconfirmed user (minimal data)
   */
  private async seedUnconfirmedUser(): Promise<void> {
    const now = new Date().toISOString();
    const user = this.testUsers.unconfirmed;

    await this.seedUser({
      ...user,
      default_privacy_level: 'private',
      is_active: true,
      email_confirmed_at: null,
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Create a user with events and contacts but no relationships
   */
  private async seedUserWithEventsAndContacts(): Promise<void> {
    const now = new Date().toISOString();
    const user = this.testUsers.confirmed;

    const seededUser = await this.seedUser({
      ...user,
      default_privacy_level: 'semi_private',
      is_active: true,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    // Create some business contacts
    await this.seedContact({
      id: randomUUID(),
      user_id: seededUser.id,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@business.com',
      company: 'Tech Corp',
      job_title: 'Project Manager',
      is_favorite: false,
      created_at: now,
      updated_at: now,
    });

    // Create work events
    const workStart = new Date();
    workStart.setHours(9, 0, 0, 0);
    const workEnd = new Date(workStart);
    workEnd.setHours(10, 0, 0, 0);

    await this.seedEvent({
      id: randomUUID(),
      user_id: seededUser.id,
      title: 'Team Meeting',
      description: 'Weekly team standup',
      start_time: workStart.toISOString(),
      end_time: workEnd.toISOString(),
      location: 'Conference Room A',
      time_zone: seededUser.time_zone,
      is_all_day: false,
      privacy_level: 'private',
      color: '#45B7D1',
      status: 'confirmed',
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Create multiple users for testing interactions
   */
  private async seedMultiUserScenario(): Promise<void> {
    const now = new Date().toISOString();

    // Create primary user
    const primaryUser = await this.seedUser({
      ...this.testUsers.confirmed,
      default_privacy_level: 'visible',
      is_active: true,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    // Create partner user
    const partnerUser = await this.seedUser({
      ...this.testUsers.partner,
      default_privacy_level: 'visible',
      is_active: true,
      email_confirmed_at: now,
      created_at: now,
      updated_at: now,
    });

    // Create relationship between them
    const relationship = await this.seedRelationship({
      id: randomUUID(),
      user_id: primaryUser.id,
      partner_id: partnerUser.id,
      partner_name: partnerUser.full_name,
      partner_email: partnerUser.email,
      relationship_type: 'primary',
      default_privacy_level: 'visible',
      start_date: '2023-06-01',
      color: '#FF6B6B',
      is_active: true,
      created_at: now,
      updated_at: now,
    });

    // Create shared event
    const eventStart = new Date();
    eventStart.setHours(18, 30, 0, 0);
    const eventEnd = new Date(eventStart);
    eventEnd.setHours(20, 0, 0, 0);

    await this.seedEvent({
      id: randomUUID(),
      user_id: primaryUser.id,
      title: 'Shared Event',
      description: 'Event visible to both users',
      start_time: eventStart.toISOString(),
      end_time: eventEnd.toISOString(),
      time_zone: primaryUser.time_zone,
      is_all_day: false,
      privacy_level: 'visible',
      relationship_id: relationship.id,
      color: relationship.color,
      status: 'confirmed',
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Individual seeding methods
   */
  private async seedUser(userData: SeededUser): Promise<SeededUser> {
    if (this.adminClient) {
      try {
        // Create auth user first
        const { data: authData, error: authError } = await this.adminClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: userData.email_confirmed_at !== null,
          user_metadata: {
            full_name: userData.full_name,
            display_name: userData.display_name,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create auth user');

        // Update user data with actual auth user ID
        const finalUserData = { ...userData, id: authData.user.id };

        // Insert into users table
        const { error: dbError } = await this.adminClient
          .from('users')
          .insert({
            id: finalUserData.id,
            email: finalUserData.email,
            full_name: finalUserData.full_name,
            display_name: finalUserData.display_name,
            time_zone: finalUserData.time_zone,
            default_privacy_level: finalUserData.default_privacy_level,
            is_active: finalUserData.is_active,
            created_at: finalUserData.created_at,
            updated_at: finalUserData.updated_at,
          });

        if (dbError) throw dbError;

        this.seedState.users.set(finalUserData.email, finalUserData);
        this.createdRecordIds.add(`auth:${finalUserData.id}`);
        this.createdRecordIds.add(`users:${finalUserData.id}`);

        return finalUserData;
      } catch (error) {
        console.error('[DatabaseSeeder] Failed to seed user:', error);
        throw error;
      }
    } else {
      // Fallback to mock data
      this.seedState.users.set(userData.email, userData);
      return userData;
    }
  }

  private async seedRelationshipGroup(groupData: SeededRelationshipGroup): Promise<SeededRelationshipGroup> {
    if (this.adminClient) {
      const { error } = await this.adminClient
        .from('relationship_groups')
        .insert(groupData);

      if (error) throw error;
      this.createdRecordIds.add(`relationship_groups:${groupData.id}`);
    }

    this.seedState.relationshipGroups.set(groupData.id, groupData);
    return groupData;
  }

  private async seedRelationship(relationshipData: SeededRelationship): Promise<SeededRelationship> {
    if (this.adminClient) {
      const { error } = await this.adminClient
        .from('relationships')
        .insert(relationshipData);

      if (error) throw error;
      this.createdRecordIds.add(`relationships:${relationshipData.id}`);
    }

    this.seedState.relationships.set(relationshipData.id, relationshipData);
    return relationshipData;
  }

  private async seedEvent(eventData: SeededEvent): Promise<SeededEvent> {
    if (this.adminClient) {
      const { error } = await this.adminClient
        .from('events')
        .insert(eventData);

      if (error) throw error;
      this.createdRecordIds.add(`events:${eventData.id}`);
    }

    this.seedState.events.set(eventData.id, eventData);
    return eventData;
  }

  private async seedContact(contactData: SeededContact): Promise<SeededContact> {
    if (this.adminClient) {
      const { error } = await this.adminClient
        .from('contacts')
        .insert(contactData);

      if (error) throw error;
      this.createdRecordIds.add(`contacts:${contactData.id}`);
    }

    this.seedState.contacts.set(contactData.id, contactData);
    return contactData;
  }

  private async seedUserPreferences(preferencesData: SeededUserPreferences): Promise<SeededUserPreferences> {
    if (this.adminClient) {
      const { error } = await this.adminClient
        .from('user_preferences')
        .insert(preferencesData);

      if (error) throw error;
      this.createdRecordIds.add(`user_preferences:${preferencesData.id}`);
    }

    this.seedState.userPreferences.set(preferencesData.id, preferencesData);
    return preferencesData;
  }

  /**
   * Transaction management
   */
  private async beginTransaction(): Promise<void> {
    this.transactionQueries = [];
  }

  private async commitTransaction(): Promise<void> {
    if (this.adminClient && this.transactionQueries.length > 0) {
      // Supabase doesn't support explicit transactions, so we rely on individual operations
      // In a real implementation, you might want to implement a rollback strategy
      this.transactionQueries = [];
    }
  }

  private async rollbackTransaction(): Promise<void> {
    if (this.adminClient) {
      // Attempt to clean up any created records
      await this.clearCreatedRecords();
    }
    this.transactionQueries = [];
  }

  /**
   * Cleanup and rollback methods
   */
  async clearAllData(): Promise<void> {
    await this.clearCreatedRecords();
    this.clearMockData();
  }

  private async clearCreatedRecords(): Promise<void> {
    if (!this.adminClient) return;

    const deletePromises: Promise<any>[] = [];

    // Delete in reverse dependency order
    for (const recordId of Array.from(this.createdRecordIds).reverse()) {
      const [table, id] = recordId.split(':');

      try {
        if (table === 'auth') {
          deletePromises.push(
            this.adminClient.auth.admin.deleteUser(id)
          );
        } else {
          deletePromises.push(
            this.adminClient.from(table).delete().eq('id', id)
          );
        }
      } catch (error) {
        console.warn(`[DatabaseSeeder] Failed to delete ${recordId}:`, error);
      }
    }

    await Promise.allSettled(deletePromises);
    this.createdRecordIds.clear();
  }

  private clearMockData(): void {
    this.seedState.users.clear();
    this.seedState.relationshipGroups.clear();
    this.seedState.relationships.clear();
    this.seedState.events.clear();
    this.seedState.contacts.clear();
    this.seedState.userPreferences.clear();
  }

  /**
   * Fallback mock data seeding for when database is not available
   */
  private seedMockUserScenario(scenarioName: string): void {
    const now = new Date().toISOString();

    switch (scenarioName) {
      case 'confirmed-user-with-relationships':
        const user = { ...this.testUsers.confirmed,
          default_privacy_level: 'visible' as const,
          is_active: true,
          email_confirmed_at: now,
          created_at: now,
          updated_at: now,
        };
        this.seedState.users.set(user.email, user);
        break;

      case 'unconfirmed-user':
        const unconfirmedUser = { ...this.testUsers.unconfirmed,
          default_privacy_level: 'private' as const,
          is_active: true,
          email_confirmed_at: null,
          created_at: now,
          updated_at: now,
        };
        this.seedState.users.set(unconfirmedUser.email, unconfirmedUser);
        break;

      default:
        console.warn(`[DatabaseSeeder] Mock seeding not implemented for scenario: ${scenarioName}`);
    }
  }

  /**
   * Query interface for contract tests to verify seeded data
   */
  getSeededUser(email: string): SeededUser | undefined {
    return this.seedState.users.get(email);
  }

  getSeededUsers(): SeededUser[] {
    return Array.from(this.seedState.users.values());
  }

  getSeededRelationships(userId: string): SeededRelationship[] {
    return Array.from(this.seedState.relationships.values())
      .filter(rel => rel.user_id === userId);
  }

  getSeededEvents(userId: string): SeededEvent[] {
    return Array.from(this.seedState.events.values())
      .filter(event => event.user_id === userId);
  }

  getSeededContacts(userId: string): SeededContact[] {
    return Array.from(this.seedState.contacts.values())
      .filter(contact => contact.user_id === userId);
  }

  /**
   * Get seeded state snapshot for debugging
   */
  getStateSnapshot(): DatabaseSeedState {
    return {
      users: new Map(this.seedState.users),
      relationshipGroups: new Map(this.seedState.relationshipGroups),
      relationships: new Map(this.seedState.relationships),
      events: new Map(this.seedState.events),
      contacts: new Map(this.seedState.contacts),
      userPreferences: new Map(this.seedState.userPreferences),
    };
  }
}

// Export singleton instance
export const databaseSeeder = new SupabaseDatabaseSeeder();