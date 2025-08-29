/**
 * Docker Database Integration Test Utilities
 * 
 * Utilities and integration tests for Docker-based database testing including:
 * - Docker database setup and teardown
 * - Test data seeding and cleanup
 * - Database schema validation
 * - Connection health checks
 * - Migration testing
 * - Privacy level constraint validation
 * - Relationship foreign key validation
 */

import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test database configuration
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:54322/postgres';
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'test-anon-key';
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

// Test user data for integration tests
const TEST_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test@example.com',
  full_name: 'Test User'
};

const TEST_RELATIONSHIP = {
  id: '00000000-0000-0000-0000-000000000002',
  user_id: TEST_USER.id,
  partner_name: 'Test Partner',
  relationship_type: 'primary' as const,
  color: '#FF5500'
};

const TEST_EVENT = {
  id: '00000000-0000-0000-0000-000000000003',
  user_id: TEST_USER.id,
  title: 'Test Event',
  start_time: '2025-01-01T10:00:00Z',
  end_time: '2025-01-01T11:00:00Z',
  privacy_level: 'private' as const,
  relationship_id: TEST_RELATIONSHIP.id
};

class DockerTestDatabase {
  private supabase: any;
  private adminSupabase: any;

  constructor() {
    this.supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);
    this.adminSupabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_SERVICE_ROLE_KEY);
  }

  async connect(): Promise<boolean> {
    try {
      const { data, error } = await this.adminSupabase
        .from('users')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  async setupTestData(): Promise<void> {
    try {
      // Clean up any existing test data first
      await this.cleanupTestData();

      // Insert test user
      const { error: userError } = await this.adminSupabase.auth.admin.createUser({
        user_id: TEST_USER.id,
        email: TEST_USER.email,
        email_confirm: true,
        user_metadata: {
          full_name: TEST_USER.full_name
        }
      });

      if (userError && !userError.message?.includes('already registered')) {
        throw new Error(`Failed to create test user: ${userError.message}`);
      }

      // Insert test user profile
      await this.adminSupabase
        .from('users')
        .upsert({
          id: TEST_USER.id,
          email: TEST_USER.email,
          full_name: TEST_USER.full_name
        });

      // Insert test relationship
      await this.adminSupabase
        .from('relationships')
        .upsert(TEST_RELATIONSHIP);

      // Insert test event
      await this.adminSupabase
        .from('events')
        .upsert(TEST_EVENT);

    } catch (error) {
      console.error('Failed to setup test data:', error);
      throw error;
    }
  }

  async cleanupTestData(): Promise<void> {
    try {
      // Delete in reverse order to respect foreign key constraints
      await this.adminSupabase
        .from('event_permissions')
        .delete()
        .eq('event_id', TEST_EVENT.id);

      await this.adminSupabase
        .from('events')
        .delete()
        .eq('user_id', TEST_USER.id);

      await this.adminSupabase
        .from('relationships')
        .delete()
        .eq('user_id', TEST_USER.id);

      await this.adminSupabase
        .from('users')
        .delete()
        .eq('id', TEST_USER.id);

      // Delete auth user
      await this.adminSupabase.auth.admin.deleteUser(TEST_USER.id);

    } catch (error) {
      console.error('Failed to cleanup test data:', error);
      // Don't throw here as cleanup should not fail tests
    }
  }

  async validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Validate users table
      const { data: usersColumns, error: usersError } = await this.adminSupabase
        .rpc('get_table_columns', { table_name: 'users' });

      if (usersError) {
        errors.push(`Users table validation failed: ${usersError.message}`);
      } else {
        const requiredUserColumns = ['id', 'email', 'full_name', 'created_at', 'updated_at'];
        const missingUserColumns = requiredUserColumns.filter(col => 
          !usersColumns?.some((c: any) => c.column_name === col)
        );
        if (missingUserColumns.length > 0) {
          errors.push(`Users table missing columns: ${missingUserColumns.join(', ')}`);
        }
      }

      // Validate events table with privacy levels
      const { data: eventsColumns, error: eventsError } = await this.adminSupabase
        .rpc('get_table_columns', { table_name: 'events' });

      if (eventsError) {
        errors.push(`Events table validation failed: ${eventsError.message}`);
      } else {
        const requiredEventColumns = ['id', 'user_id', 'title', 'start_time', 'end_time', 'privacy_level'];
        const missingEventColumns = requiredEventColumns.filter(col => 
          !eventsColumns?.some((c: any) => c.column_name === col)
        );
        if (missingEventColumns.length > 0) {
          errors.push(`Events table missing columns: ${missingEventColumns.join(', ')}`);
        }
      }

      // Validate privacy level enum
      const { data: privacyCheck, error: privacyError } = await this.adminSupabase
        .from('events')
        .insert({
          user_id: TEST_USER.id,
          title: 'Privacy Test',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'invalid_privacy_level'
        });

      if (!privacyError || !privacyError.message?.includes('invalid input value')) {
        errors.push('Privacy level enum validation is not working correctly');
        // Clean up the test record if it was inserted
        if (privacyCheck) {
          await this.adminSupabase
            .from('events')
            .delete()
            .eq('id', privacyCheck.id);
        }
      }

      // Validate relationships table
      const { data: relationshipsColumns, error: relationshipsError } = await this.adminSupabase
        .rpc('get_table_columns', { table_name: 'relationships' });

      if (relationshipsError) {
        errors.push(`Relationships table validation failed: ${relationshipsError.message}`);
      } else {
        const requiredRelColumns = ['id', 'user_id', 'partner_name', 'relationship_type'];
        const missingRelColumns = requiredRelColumns.filter(col => 
          !relationshipsColumns?.some((c: any) => c.column_name === col)
        );
        if (missingRelColumns.length > 0) {
          errors.push(`Relationships table missing columns: ${missingRelColumns.join(', ')}`);
        }
      }

    } catch (error) {
      errors.push(`Schema validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async validateConstraints(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Test foreign key constraint: events.user_id -> users.id
      const { error: fkError1 } = await this.adminSupabase
        .from('events')
        .insert({
          user_id: '00000000-0000-0000-0000-999999999999', // Non-existent user
          title: 'FK Test Event',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'private'
        });

      if (!fkError1 || !fkError1.message?.includes('foreign key')) {
        errors.push('Events table user_id foreign key constraint not working');
      }

      // Test foreign key constraint: events.relationship_id -> relationships.id
      const { error: fkError2 } = await this.adminSupabase
        .from('events')
        .insert({
          user_id: TEST_USER.id,
          title: 'FK Test Event 2',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'private',
          relationship_id: '00000000-0000-0000-0000-999999999999' // Non-existent relationship
        });

      if (!fkError2 || !fkError2.message?.includes('foreign key')) {
        errors.push('Events table relationship_id foreign key constraint not working');
      }

      // Test privacy level enum constraint
      const validPrivacyLevels = ['private', 'visible', 'semi_private', 'public'];
      for (const privacyLevel of validPrivacyLevels) {
        const { error } = await this.adminSupabase
          .from('events')
          .insert({
            user_id: TEST_USER.id,
            title: `Privacy Test ${privacyLevel}`,
            start_time: '2025-01-01T10:00:00Z',
            end_time: '2025-01-01T11:00:00Z',
            privacy_level: privacyLevel
          });

        if (error) {
          errors.push(`Valid privacy level '${privacyLevel}' was rejected: ${error.message}`);
        } else {
          // Clean up the test record
          await this.adminSupabase
            .from('events')
            .delete()
            .match({ user_id: TEST_USER.id, title: `Privacy Test ${privacyLevel}` });
        }
      }

      // Test relationship type enum constraint
      const validRelationshipTypes = ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'];
      for (const relType of validRelationshipTypes) {
        const { error } = await this.adminSupabase
          .from('relationships')
          .insert({
            user_id: TEST_USER.id,
            partner_name: `Test Partner ${relType}`,
            relationship_type: relType
          });

        if (error) {
          errors.push(`Valid relationship type '${relType}' was rejected: ${error.message}`);
        } else {
          // Clean up the test record
          await this.adminSupabase
            .from('relationships')
            .delete()
            .match({ user_id: TEST_USER.id, partner_name: `Test Partner ${relType}` });
        }
      }

    } catch (error) {
      errors.push(`Constraint validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async testRLSPolicies(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Test that users can only access their own data
      const { data: otherUserEvents, error: rlsError } = await this.supabase
        .from('events')
        .select('*')
        .eq('user_id', '00000000-0000-0000-0000-999999999999'); // Different user

      // RLS should prevent accessing other users' data
      if (otherUserEvents && otherUserEvents.length > 0) {
        errors.push('RLS policy allows access to other users\' events');
      }

      // Test that users can access their own data when authenticated
      const { data: ownEvents, error: ownError } = await this.supabase
        .from('events')
        .select('*')
        .eq('user_id', TEST_USER.id);

      if (ownError) {
        errors.push(`RLS policy prevents access to own events: ${ownError.message}`);
      }

    } catch (error) {
      errors.push(`RLS policy test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getTestUser() {
    return TEST_USER;
  }

  getTestRelationship() {
    return TEST_RELATIONSHIP;
  }

  getTestEvent() {
    return TEST_EVENT;
  }

  getSupabaseClient() {
    return this.supabase;
  }

  getAdminSupabaseClient() {
    return this.adminSupabase;
  }
}

// Export test utilities
export const dockerTestDb = new DockerTestDatabase();

// Export test data
export { TEST_USER, TEST_RELATIONSHIP, TEST_EVENT };

// Integration tests using Docker database
describe('Docker Database Integration', () => {
  beforeAll(async () => {
    // Skip tests if Docker database is not available
    const isConnected = await dockerTestDb.connect();
    if (!isConnected) {
      console.warn('Docker test database not available, skipping integration tests');
      return;
    }

    await dockerTestDb.setupTestData();
  }, 30000); // 30 second timeout for setup

  afterAll(async () => {
    await dockerTestDb.cleanupTestData();
  }, 10000);

  beforeEach(async () => {
    // Additional setup if needed for each test
  });

  afterEach(async () => {
    // Additional cleanup if needed for each test
  });

  describe('Database Connection and Health', () => {
    it('should connect to Docker test database successfully', async () => {
      const isConnected = await dockerTestDb.connect();
      expect(isConnected).toBe(true);
    });

    it('should have required environment variables', () => {
      expect(TEST_DATABASE_URL).toBeDefined();
      expect(TEST_SUPABASE_URL).toBeDefined();
      expect(TEST_SUPABASE_ANON_KEY).toBeDefined();
      expect(TEST_SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    });
  });

  describe('Schema Validation', () => {
    it('should have correct table schema', async () => {
      const result = await dockerTestDb.validateSchema();
      
      if (!result.valid) {
        console.error('Schema validation errors:', result.errors);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should enforce database constraints', async () => {
      const result = await dockerTestDb.validateConstraints();
      
      if (!result.valid) {
        console.error('Constraint validation errors:', result.errors);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Privacy Level Validation', () => {
    it('should accept all valid privacy levels', async () => {
      const validPrivacyLevels = ['private', 'visible', 'semi_private', 'public'];
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      for (const privacyLevel of validPrivacyLevels) {
        const { data, error } = await supabase
          .from('events')
          .insert({
            user_id: TEST_USER.id,
            title: `Test Privacy ${privacyLevel}`,
            start_time: '2025-01-01T10:00:00Z',
            end_time: '2025-01-01T11:00:00Z',
            privacy_level: privacyLevel
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.privacy_level).toBe(privacyLevel);

        // Clean up
        await supabase
          .from('events')
          .delete()
          .eq('id', data.id);
      }
    });

    it('should reject invalid privacy levels', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      const { error } = await supabase
        .from('events')
        .insert({
          user_id: TEST_USER.id,
          title: 'Test Invalid Privacy',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'invalid_privacy_level'
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('invalid input value');
    });
  });

  describe('Relationship Type Validation', () => {
    it('should accept all valid relationship types', async () => {
      const validRelationshipTypes = ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'];
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      for (const relType of validRelationshipTypes) {
        const { data, error } = await supabase
          .from('relationships')
          .insert({
            user_id: TEST_USER.id,
            partner_name: `Test Partner ${relType}`,
            relationship_type: relType
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.relationship_type).toBe(relType);

        // Clean up
        await supabase
          .from('relationships')
          .delete()
          .eq('id', data.id);
      }
    });

    it('should reject invalid relationship types', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      const { error } = await supabase
        .from('relationships')
        .insert({
          user_id: TEST_USER.id,
          partner_name: 'Test Partner Invalid',
          relationship_type: 'invalid_relationship_type'
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('invalid input value');
    });
  });

  describe('Foreign Key Constraints', () => {
    it('should enforce user_id foreign key in events table', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      const { error } = await supabase
        .from('events')
        .insert({
          user_id: '00000000-0000-0000-0000-999999999999', // Non-existent user
          title: 'FK Test Event',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'private'
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('foreign key');
    });

    it('should enforce relationship_id foreign key in events table', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      const { error } = await supabase
        .from('events')
        .insert({
          user_id: TEST_USER.id,
          title: 'FK Test Event',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'private',
          relationship_id: '00000000-0000-0000-0000-999999999999' // Non-existent relationship
        });

      expect(error).toBeDefined();
      expect(error.message).toContain('foreign key');
    });
  });

  describe('Row Level Security (RLS)', () => {
    it('should enforce RLS policies', async () => {
      const result = await dockerTestDb.testRLSPolicies();
      
      if (!result.valid) {
        console.error('RLS policy test errors:', result.errors);
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity on cascade deletes', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      
      // Create test relationship and event
      const { data: relationship, error: relError } = await supabase
        .from('relationships')
        .insert({
          user_id: TEST_USER.id,
          partner_name: 'Test Delete Partner',
          relationship_type: 'casual'
        })
        .select()
        .single();

      expect(relError).toBeNull();

      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: TEST_USER.id,
          title: 'Test Cascade Delete',
          start_time: '2025-01-01T10:00:00Z',
          end_time: '2025-01-01T11:00:00Z',
          privacy_level: 'private',
          relationship_id: relationship.id
        })
        .select()
        .single();

      expect(eventError).toBeNull();

      // Delete the relationship
      await supabase
        .from('relationships')
        .delete()
        .eq('id', relationship.id);

      // Check if event still exists (should have relationship_id set to null or be deleted)
      const { data: remainingEvent } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id)
        .single();

      // Event should either not exist or have null relationship_id
      expect(remainingEvent?.relationship_id).toBeNull();

      // Clean up
      if (remainingEvent) {
        await supabase
          .from('events')
          .delete()
          .eq('id', event.id);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk inserts efficiently', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      const startTime = Date.now();
      
      const bulkEvents = Array.from({ length: 100 }, (_, i) => ({
        user_id: TEST_USER.id,
        title: `Bulk Event ${i}`,
        start_time: '2025-01-01T10:00:00Z',
        end_time: '2025-01-01T11:00:00Z',
        privacy_level: 'private' as const
      }));

      const { data, error } = await supabase
        .from('events')
        .insert(bulkEvents)
        .select();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(data).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

      // Clean up
      const eventIds = data.map(event => event.id);
      await supabase
        .from('events')
        .delete()
        .in('id', eventIds);
    }, 10000);

    it('should handle complex queries efficiently', async () => {
      const supabase = dockerTestDb.getAdminSupabaseClient();
      const startTime = Date.now();

      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          relationship:relationship_id(
            id,
            partner_name,
            relationship_type
          )
        `)
        .eq('user_id', TEST_USER.id)
        .order('start_time', { ascending: true });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(error).toBeNull();
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});