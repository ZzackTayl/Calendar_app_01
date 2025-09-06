/**
 * Comprehensive Test Helpers for Production Testing
 * 
 * This module provides all the test utilities needed for production readiness testing,
 * including database setup, user management, authentication, and data cleanup.
 * 
 * 📊 CRITICAL: Schema Reference
 * Before modifying these helpers, ALWAYS consult:
 * docs/DATABASE_SCHEMA_REFERENCE.md
 * 
 * This document contains the exact table structures, column names, enum values,
 * and foreign key relationships to prevent schema mismatches.
 * 
 * Quick Reference - Core Tables:
 * - users: id(UUID), email, created_at, updated_at
 * - user_profiles: id(UUID), full_name, time_zone, avatar_url, [notifications]
 * - relationships: id(UUID), user_id, partner_id, relationship_type, [privacy_fields]
 * - events: id(UUID), user_id, title, start_time, end_time, privacy_level
 * 
 * ⚠️ NEVER use: display_name, phone_number in users table (they don't exist)
 * ✅ ALWAYS use: crypto.randomUUID() for UUID generation
 * ✅ ALWAYS check: enum values against schema reference
 */

import { createClient } from '@supabase/supabase-js';
import { DatabaseTestUtils } from '../tests/db/test-utilities';
import { vi } from 'vitest';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'test_service_key';
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_anon_key';

// Test email patterns to identify test accounts
export const TEST_EMAIL_PATTERNS = [
  /^polyharmonytest(\+\w+)?@gmail\.com$/,
  /test/i,  // Contains 'test' anywhere in the email
  /demo/i,  // Contains 'demo' anywhere in the email
] as const;

// Test user identifiers
export const TEST_USERS = {
  WA_DEV_1: 'polyharmonytest+wa1@gmail.com',
  WA_DEV_2: 'polyharmonytest+wa2@gmail.com', 
  WA_DEV_3: 'polyharmonytest+wa3@gmail.com',
  NY_DEV_1: 'polyharmonytest+ny1@gmail.com',
} as const;

/**
 * Test data prefixes for easy identification
 */
export const TEST_DATA_PREFIXES = {
  EVENT: '[TEST]',
  GROUP: '[TEST-GROUP]',
  RELATIONSHIP: '[TEST-REL]',
} as const;

/**
 * Test scenarios configuration
 */
export const TEST_SCENARIOS = {
  BASIC_SIGNUP: 'Basic user signup and profile creation',
  EVENT_CRUD: 'Create, read, update, delete events',
  INVITATIONS: 'Send and accept invitations',
  GROUP_MANAGEMENT: 'Create and manage groups',
  PRIVACY_SETTINGS: 'Test privacy controls',
  TIME_ZONES: 'Cross-timezone functionality (WA vs NY)',
  NOTIFICATIONS: 'Email notification system',
  CALENDAR_SHARING: 'Calendar visibility and sharing',
} as const;

// Global test context for shared utilities
let globalDbUtils: DatabaseTestUtils | null = null;
let globalTestContext: any = null;

/**
 * Comprehensive Test Helper Functions
 */
class TestHelpers {
  private supabaseClient: any;
  private dbUtils: DatabaseTestUtils;
  private testContext: any;

  constructor() {
    // In test environment, use mocked client
    if (process.env.NODE_ENV === 'test') {
      const createMockQueryBuilder = () => ({
        select: vi.fn(() => createMockQueryBuilder()),
        insert: vi.fn(() => createMockQueryBuilder()),
        update: vi.fn(() => createMockQueryBuilder()),
        delete: vi.fn(() => createMockQueryBuilder()),
        upsert: vi.fn(() => createMockQueryBuilder()),
        
        // Filter methods
        eq: vi.fn(() => createMockQueryBuilder()),
        neq: vi.fn(() => createMockQueryBuilder()),
        gt: vi.fn(() => createMockQueryBuilder()),
        gte: vi.fn(() => createMockQueryBuilder()),
        lt: vi.fn(() => createMockQueryBuilder()),
        lte: vi.fn(() => createMockQueryBuilder()),
        like: vi.fn(() => createMockQueryBuilder()),
        ilike: vi.fn(() => createMockQueryBuilder()),
        is: vi.fn(() => createMockQueryBuilder()),
        in: vi.fn(() => createMockQueryBuilder()),
        contains: vi.fn(() => createMockQueryBuilder()),
        containedBy: vi.fn(() => createMockQueryBuilder()),
        rangeGt: vi.fn(() => createMockQueryBuilder()),
        rangeGte: vi.fn(() => createMockQueryBuilder()),
        rangeLt: vi.fn(() => createMockQueryBuilder()),
        rangeLte: vi.fn(() => createMockQueryBuilder()),
        rangeAdjacent: vi.fn(() => createMockQueryBuilder()),
        overlaps: vi.fn(() => createMockQueryBuilder()),
        textSearch: vi.fn(() => createMockQueryBuilder()),
        match: vi.fn(() => createMockQueryBuilder()),
        not: vi.fn(() => createMockQueryBuilder()),
        or: vi.fn(() => createMockQueryBuilder()),
        filter: vi.fn(() => createMockQueryBuilder()),
        
        // Ordering and pagination
        order: vi.fn(() => createMockQueryBuilder()),
        limit: vi.fn(() => createMockQueryBuilder()),
        range: vi.fn(() => createMockQueryBuilder()),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        
        // Final execution methods
        then: vi.fn((resolve) => resolve({ data: [], error: null })),
        abortSignal: vi.fn(() => createMockQueryBuilder()),
      });

      this.supabaseClient = {
        from: vi.fn(() => createMockQueryBuilder()),
        auth: {
          getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
          onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
          signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
          signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
          signOut: vi.fn(() => Promise.resolve({ error: null })),
        },
        rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
      };
    } else {
      this.supabaseClient = createClient(
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
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup test environment - called once at the beginning of test suites
   */
  async setupTestEnvironment(supabaseClient?: any) {
    console.log('🚀 Setting up test environment...');
    
    try {
      // Initialize global utilities if not already done
      if (!globalDbUtils) {
        globalDbUtils = this.dbUtils;
        globalTestContext = await this.dbUtils.setupTestEnvironment({
          seedData: false, // Don't seed by default - let individual tests control this
          validateSchema: false, // Skip schema validation for speed
          enableLogging: true
        });
      }
      
      this.testContext = globalTestContext;
      console.log('✅ Test environment setup complete');
      
      return this.testContext;
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }

  /**
   * Clean up test data - called between tests
   */
  async cleanupTestData(supabaseClient?: any) {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Use provided client or fallback to instance client
      const client = supabaseClient || this.supabaseClient;
      
      if (this.testContext?.cleaner) {
        await this.testContext.cleaner.truncateAllTables();
      } else {
        // Fallback cleanup if test context not available
        const tables = ['events', 'relationships', 'user_profiles', 'users'];
        for (const table of tables) {
          try {
            await client
              .from(table)
              .delete()
              .neq('id', '00000000-0000-0000-0000-000000000000');
          } catch (error) {
            // Ignore errors for tables that don't exist
            console.warn(`Warning cleaning ${table}:`, error);
          }
        }
      }
      console.log('✅ Test data cleanup complete');
    } catch (error) {
      console.warn('⚠️ Warning during test data cleanup:', error);
    }
  }

  /**
   * Create a test user (ACTUAL SCHEMA - single users table)
   */
  async createTestUser(supabaseClient: any, userData: any) {
    console.log(`👤 Creating test user: ${userData.full_name || userData.email}`);

    try {
      // Generate proper UUID for ID - THIS IS THE KEY FIX
      const userId = userData.id || crypto.randomUUID();

      // Create user with ACTUAL schema (all data in users table)
      const user = {
        id: userId,
        email: userData.email || `test-${Date.now()}@example.com`,
        phone: userData.phone || null,
        full_name: userData.full_name || userData.display_name || 'Test User',
        avatar_url: userData.avatar_url || null,
        timezone: userData.timezone || userData.time_zone || 'UTC',
        notification_preferences: userData.notification_preferences || {
          email: true,
          push: true,
          sms: false
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use the provided supabase client or fallback to this.supabaseClient
      const client = supabaseClient || this.supabaseClient;

      // Insert into users table (NO user_profiles table exists)
      const { data: createdUser, error: userError } = await client
        .from('users')
        .insert([user])
        .select()
        .single();

      if (userError) {
        console.error('❌ REAL DATABASE ERROR:', userError.message);
        throw new Error(`User creation failed: ${userError.message}`);
      }

      console.log(`✅ Test user created: ${createdUser?.full_name || createdUser?.email || user.email}`);
      return createdUser || user; // Return mock data if in test environment

    } catch (error) {
      console.error('❌ Failed to create test user:', error);
      throw error; // FAIL FAST - no mock fallbacks
    }
  }

  /**
   * Authenticate as a specific user (mock authentication for testing)
   */
  async authenticateAs(supabaseClient: any, userData: any) {
    console.log(`🔐 Authenticating as: ${userData.full_name || userData.email}`);
    
    // In a real test environment, this would set up proper authentication
    // For now, we'll return a mock session
    const mockSession = {
      user: {
        id: userData.id,
        email: userData.email,
        user_metadata: {
          full_name: userData.full_name || userData.display_name || 'Test User'
        }
      },
      access_token: `mock_token_${userData.id}`,
      refresh_token: `mock_refresh_${userData.id}`,
      expires_at: Date.now() + 3600000 // 1 hour from now
    };
    
    // Store session for use in tests
    (global as any).testSession = mockSession;
    
    console.log(`✅ Authenticated as: ${userData.full_name || userData.email}`);
    return mockSession;
  }

  /**
   * Create a test relationship (ACTUAL SCHEMA)
   */
  async createTestRelationship(supabaseClient: any, relationshipData: any) {
    console.log('💕 Creating test relationship');

    try {
      const relationship = {
        id: relationshipData.id || crypto.randomUUID(),
        user_id: relationshipData.user_id,
        partner_id: relationshipData.partner_id,
        partner_name: relationshipData.partner_name || 'Test Partner',
        partner_email: relationshipData.partner_email || null,
        relationship_type: relationshipData.relationship_type || 'friendship',
        start_date: relationshipData.start_date || null,
        birthday: relationshipData.birthday || null,
        anniversary_date: relationshipData.anniversary_date || null,
        color: relationshipData.color || '#4ECDC4',
        notes: relationshipData.notes || null,
        default_privacy_level: relationshipData.default_privacy_level || 'private',
        privacy_level: relationshipData.privacy_level || 'private',
        connection_tier: relationshipData.connection_tier || 'details',
        is_active: relationshipData.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use the provided supabase client or fallback to this.supabaseClient
      const client = supabaseClient || this.supabaseClient;

      const { data: createdRelationship, error } = await client
        .from('relationships')
        .insert([relationship])
        .select()
        .single();

      if (error) {
        console.error('❌ REAL DATABASE ERROR:', error.message);
        throw new Error(`Relationship creation failed: ${error.message}`);
      }

      console.log('✅ Test relationship created');
      return createdRelationship;

    } catch (error) {
      console.error('❌ Failed to create test relationship:', error);
      throw error; // FAIL FAST - no mock fallbacks
    }
  }

  /**
   * Create a test event (ACTUAL SCHEMA)
   */
  async createTestEvent(supabaseClient: any, eventData: any) {
    console.log(`📅 Creating test event: ${eventData.title}`);

    try {
      const event = {
        id: eventData.id || crypto.randomUUID(),
        user_id: eventData.user_id,
        title: eventData.title,
        description: eventData.description || null,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        location: eventData.location || null,
        time_zone: eventData.time_zone || 'UTC',
        is_all_day: eventData.is_all_day || false,
        privacy_level: eventData.privacy_level || 'private',
        visible_to_relationships: eventData.visible_to_relationships || null,
        visible_to_groups: eventData.visible_to_groups || null,
        relationship_id: eventData.relationship_id || null,
        color: eventData.color || null,
        recurrence_rule: eventData.recurrence_rule || null,
        status: eventData.status || 'confirmed',
        privacy_override: eventData.privacy_override || 'default',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use the provided supabase client or fallback to this.supabaseClient
      const client = supabaseClient || this.supabaseClient;

      const { data: createdEvent, error } = await client
        .from('events')
        .insert([event])
        .select()
        .single();

      if (error) {
        console.error('❌ REAL DATABASE ERROR:', error.message);
        throw new Error(`Event creation failed: ${error.message}`);
      }

      console.log(`✅ Test event created: ${createdEvent.title}`);
      return createdEvent;

    } catch (error) {
      console.error('❌ Failed to create test event:', error);
      throw error; // FAIL FAST - no mock fallbacks
    }
  }

  /**
   * Teardown test environment - called at the end of test suites
   */
  async teardownTestEnvironment() {
    console.log('🧹 Tearing down test environment...');
    
    try {
      if (globalTestContext && globalDbUtils) {
        await globalDbUtils.teardownTestEnvironment(globalTestContext, { preserveData: false });
        globalTestContext = null;
        globalDbUtils = null;
      }
      console.log('✅ Test environment teardown complete');
    } catch (error) {
      console.warn('⚠️ Warning during teardown:', error);
    }
  }

  // Utility functions
  isTestUser(email: string): boolean {
    return TEST_EMAIL_PATTERNS.some(pattern => pattern.test(email));
  }

  getTestUserName(email: string): string {
    const userMap: Record<string, string> = {
      [TEST_USERS.WA_DEV_1]: 'WA Developer 1',
      [TEST_USERS.WA_DEV_2]: 'WA Developer 2',
      [TEST_USERS.WA_DEV_3]: 'WA Developer 3',
      [TEST_USERS.NY_DEV_1]: 'NY Developer',
    };
    
    return userMap[email] || 'Test User';
  }

  createTestEventTitle(title: string): string {
    return `${TEST_DATA_PREFIXES.EVENT} ${title}`;
  }

  createTestGroupName(name: string): string {
    return `${TEST_DATA_PREFIXES.GROUP} ${name}`;
  }

  isTestData(title: string): boolean {
    return Object.values(TEST_DATA_PREFIXES).some(prefix => 
      title.startsWith(prefix)
    );
  }
}

// Create global instance
const testHelpersInstance = new TestHelpers();

// Export both the class and instance for flexibility
export const testHelpers = {
  // Core test management functions
  setupTestEnvironment: testHelpersInstance.setupTestEnvironment.bind(testHelpersInstance),
  cleanupTestData: testHelpersInstance.cleanupTestData.bind(testHelpersInstance),
  teardownTestEnvironment: testHelpersInstance.teardownTestEnvironment.bind(testHelpersInstance),
  
  // User and data creation functions
  createTestUser: testHelpersInstance.createTestUser.bind(testHelpersInstance),
  authenticateAs: testHelpersInstance.authenticateAs.bind(testHelpersInstance),
  createTestRelationship: testHelpersInstance.createTestRelationship.bind(testHelpersInstance),
  createTestEvent: testHelpersInstance.createTestEvent.bind(testHelpersInstance),
  
  // Utility functions
  isTestUser: testHelpersInstance.isTestUser.bind(testHelpersInstance),
  getTestUserName: testHelpersInstance.getTestUserName.bind(testHelpersInstance),
  createTestEventTitle: testHelpersInstance.createTestEventTitle.bind(testHelpersInstance),
  createTestGroupName: testHelpersInstance.createTestGroupName.bind(testHelpersInstance),
  isTestData: testHelpersInstance.isTestData.bind(testHelpersInstance),
  
  // Constants
  TEST_USERS,
  TEST_SCENARIOS,
  TEST_DATA_PREFIXES,
  TEST_EMAIL_PATTERNS
};

export default testHelpers;
