/**
 * Comprehensive Database Test Utilities
 * 
 * Central hub for all database testing functionality, providing
 * easy-to-use functions for test setup, execution, and teardown.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';
import { DatabaseSeeder, TestUser, TestRelationship, TestEvent } from './seed-data';
import { DatabaseCleaner } from './cleanup';
import { SchemaValidator, validateTestDatabaseSchema } from './schema-validation';
import { MigrationTester, testAllMigrations } from './migration-testing';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export interface DatabaseTestContext {
  client: ReturnType<typeof createClient<Database>>;
  users: TestUser[];
  relationships: TestRelationship[];
  events: TestEvent[];
  groups: any[];
  seeder: DatabaseSeeder;
  cleaner: DatabaseCleaner;
}

export interface TestConfiguration {
  seedData?: boolean;
  validateSchema?: boolean;
  enableLogging?: boolean;
  isolated?: boolean; // Each test gets its own clean database
  preserveData?: boolean; // Don't clean up after test
}

export class DatabaseTestUtils {
  private client: ReturnType<typeof createClient<Database>>;
  private seeder: DatabaseSeeder;
  private cleaner: DatabaseCleaner;
  private validator: SchemaValidator;
  private migrationTester: MigrationTester;

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

    this.seeder = new DatabaseSeeder();
    this.cleaner = new DatabaseCleaner();
    this.validator = new SchemaValidator();
    this.migrationTester = new MigrationTester();
  }

  /**
   * Setup test database environment
   */
  async setupTestEnvironment(config: TestConfiguration = {}): Promise<DatabaseTestContext> {
    const startTime = Date.now();
    
    if (config.enableLogging) {
      console.log('🚀 Setting up test database environment...');
    }

    try {
      // Step 1: Clean database if isolated testing
      if (config.isolated !== false) {
        await this.cleaner.fullReset();
        if (config.enableLogging) {
          console.log('✅ Database cleaned');
        }
      }

      // Step 2: Validate schema
      if (config.validateSchema !== false) {
        const schemaResult = await this.validator.validateSchema();
        if (!schemaResult.passed) {
          throw new Error(`Schema validation failed: ${schemaResult.errors.join(', ')}`);
        }
        if (config.enableLogging) {
          console.log('✅ Schema validation passed');
        }
      }

      // Step 3: Seed test data
      let users: TestUser[] = [];
      let relationships: TestRelationship[] = [];
      let events: TestEvent[] = [];
      let groups: any[] = [];

      if (config.seedData !== false) {
        const seedResult = await this.seeder.seedAll();
        users = seedResult.users;
        relationships = seedResult.relationships;
        events = seedResult.events;
        groups = seedResult.groups;
        
        if (config.enableLogging) {
          console.log('✅ Test data seeded');
        }
      }

      const setupTime = Date.now() - startTime;
      if (config.enableLogging) {
        console.log(`🎯 Test environment setup completed in ${setupTime}ms`);
      }

      return {
        client: this.client,
        users,
        relationships,
        events,
        groups,
        seeder: this.seeder,
        cleaner: this.cleaner
      };

    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  /**
   * Teardown test database environment
   */
  async teardownTestEnvironment(
    context: DatabaseTestContext,
    config: TestConfiguration = {}
  ): Promise<void> {
    if (config.preserveData) {
      if (config.enableLogging) {
        console.log('📦 Preserving test data (cleanup skipped)');
      }
      return;
    }

    if (config.enableLogging) {
      console.log('🧹 Tearing down test environment...');
    }

    try {
      await context.cleaner.fullReset();
      
      if (config.enableLogging) {
        console.log('✅ Test environment cleaned up');
      }
    } catch (error) {
      console.error('⚠️  Warning during teardown:', error);
    }
  }

  /**
   * Create a test user with realistic data
   */
  async createTestUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
    const baseUser: TestUser = {
      id: `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Date.now()}@example.com`,
      full_name: 'Test User',
      display_name: 'Test',
      time_zone: 'America/New_York',
      default_privacy_level: 'private'
    };

    const user = { ...baseUser, ...overrides };

    // Insert user
    const { error: userError } = await this.client
      .from('users')
      .insert([user]);

    if (userError) {
      throw new Error(`Failed to create test user: ${userError.message}`);
    }

    // Create user profile
    const { error: profileError } = await this.client
      .from('user_profiles')
      .insert([{
        id: user.id,
        full_name: user.full_name,
        username: user.display_name?.toLowerCase() || 'testuser',
        time_zone: user.time_zone || 'UTC',
        onboarding_completed: true
      }]);

    if (profileError) {
      throw new Error(`Failed to create test user profile: ${profileError.message}`);
    }

    return user;
  }

  /**
   * Create a test event with realistic data
   */
  async createTestEvent(
    userId: string,
    overrides: Partial<TestEvent> = {}
  ): Promise<TestEvent> {
    const now = new Date();
    const baseEvent: TestEvent = {
      id: `test-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title: 'Test Event',
      description: 'A test event for automated testing',
      start_time: new Date(now.getTime() + 3600000).toISOString(), // +1 hour
      end_time: new Date(now.getTime() + 7200000).toISOString(), // +2 hours
      location: 'Test Location',
      privacy_level: 'private',
      color: '#3B82F6',
      status: 'confirmed'
    };

    const event = { ...baseEvent, ...overrides };

    const { error } = await this.client
      .from('events')
      .insert([event]);

    if (error) {
      throw new Error(`Failed to create test event: ${error.message}`);
    }

    return event;
  }

  /**
   * Create a test relationship between users
   */
  async createTestRelationship(
    userId: string,
    partnerId: string,
    overrides: Partial<TestRelationship> = {}
  ): Promise<TestRelationship> {
    const baseRelationship: TestRelationship = {
      id: `test-relationship-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      partner_id: partnerId,
      partner_name: 'Test Partner',
      relationship_type: 'friendship',
      default_privacy_level: 'private',
      color: '#4ECDC4'
    };

    const relationship = { ...baseRelationship, ...overrides };

    const { error } = await this.client
      .from('relationships')
      .insert([relationship]);

    if (error) {
      throw new Error(`Failed to create test relationship: ${error.message}`);
    }

    return relationship;
  }

  /**
   * Assert database record exists
   */
  async assertRecordExists(
    table: string,
    id: string,
    message?: string
  ): Promise<any> {
    const { data, error } = await this.client
      .from(table as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new Error(message || `Expected record ${id} to exist in ${table}, but it doesn't`);
    }

    return data;
  }

  /**
   * Assert database record doesn't exist
   */
  async assertRecordNotExists(
    table: string,
    id: string,
    message?: string
  ): Promise<void> {
    const { data, error } = await this.client
      .from(table as any)
      .select('id')
      .eq('id', id)
      .single();

    if (data && !error) {
      throw new Error(message || `Expected record ${id} to NOT exist in ${table}, but it does`);
    }
  }

  /**
   * Assert record count matches expected
   */
  async assertRecordCount(
    table: string,
    expectedCount: number,
    filter?: Record<string, any>,
    message?: string
  ): Promise<void> {
    let query = this.client
      .from(table as any)
      .select('id', { count: 'exact', head: true });

    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { count, error } = await query;

    if (error) {
      throw new Error(`Failed to count records in ${table}: ${error.message}`);
    }

    if (count !== expectedCount) {
      throw new Error(
        message || 
        `Expected ${expectedCount} records in ${table}, but found ${count}`
      );
    }
  }

  /**
   * Wait for database condition to be met (useful for async operations)
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeoutMs: number = 5000,
    intervalMs: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Condition not met within ${timeoutMs}ms`);
  }

  /**
   * Execute raw SQL for advanced testing scenarios
   */
  async executeSQL(sql: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        sql,
        params: params || []
      });

      if (error) {
        throw new Error(`SQL execution failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to execute SQL: ${error}`);
    }
  }

  /**
   * Run comprehensive database health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    checks: Record<string, boolean>;
    errors: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const errors: string[] = [];

    try {
      // Check database connectivity
      const { error: connectError } = await this.client
        .from('users')
        .select('id')
        .limit(1);
      checks.connectivity = !connectError;
      if (connectError) errors.push(`Connectivity: ${connectError.message}`);

      // Check schema validation
      const schemaResult = await this.validator.validateSchema();
      checks.schema = schemaResult.passed;
      if (!schemaResult.passed) {
        errors.push(`Schema: ${schemaResult.errors.join(', ')}`);
      }

      // Check RLS policies
      const { error: rlsError } = await this.client.rpc('check_rls_status');
      checks.rls = !rlsError;
      if (rlsError) errors.push(`RLS: ${rlsError.message}`);

    } catch (error) {
      checks.overall = false;
      errors.push(`Health check failed: ${error}`);
    }

    const healthy = Object.values(checks).every(check => check === true);

    return { healthy, checks, errors };
  }
}

// Export singleton instance and utility functions
export const dbTestUtils = new DatabaseTestUtils();

/**
 * High-level test wrapper for database tests
 */
export async function withDatabase<T>(
  testFn: (context: DatabaseTestContext) => Promise<T>,
  config: TestConfiguration = {}
): Promise<T> {
  const utils = new DatabaseTestUtils();
  const context = await utils.setupTestEnvironment({
    enableLogging: false,
    ...config
  });

  try {
    return await testFn(context);
  } finally {
    await utils.teardownTestEnvironment(context, config);
  }
}

/**
 * Create isolated test environment for each test
 */
export async function withIsolatedDatabase<T>(
  testFn: (context: DatabaseTestContext) => Promise<T>
): Promise<T> {
  return withDatabase(testFn, {
    isolated: true,
    seedData: true,
    validateSchema: true
  });
}

/**
 * Quick database test setup without seeding
 */
export async function withCleanDatabase<T>(
  testFn: (context: DatabaseTestContext) => Promise<T>
): Promise<T> {
  return withDatabase(testFn, {
    isolated: true,
    seedData: false,
    validateSchema: false
  });
}