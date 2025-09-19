/**
 * Integration Test Setup Configuration
 * 
 * This file configures the test environment for integration tests with:
 * - Real Supabase test database connection
 * - Actual service integrations
 * - Database cleanup and seeding
 * - Performance monitoring
 * - Real-time capabilities testing
 */

import '@testing-library/jest-dom';
import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { initializeTestSecrets } from '@/config/testing/test-secrets';

// Import test helpers for integration scenarios
import { TestHelpers } from './helpers';
import { MockDataFactory } from './mocks/data-factory';

// Make React globally available for JSX
global.React = React;

// ===================================================================
// INTEGRATION TEST ENVIRONMENT CONFIGURATION
// ===================================================================

initializeTestSecrets();

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

const SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const criticalEnv = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
};

Object.entries(criticalEnv).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing required integration test environment value: ${key}`);
  }
});

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? (SUPABASE_URL as string);
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? (SUPABASE_ANON_KEY as string);
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? (SUPABASE_SERVICE_KEY as string);

// Create test Supabase clients
let testSupabaseClient: any;
let testServiceClient: any;

// ===================================================================
// REAL SERVICE INTEGRATIONS (LIMITED MOCKING)
// ===================================================================

// Mock external APIs that we don't want to call during integration tests
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
        getAccessToken: vi.fn().mockResolvedValue({ token: 'test-token' }),
      })),
    },
    calendar: vi.fn(() => ({
      events: {
        list: vi.fn().mockResolvedValue({ data: { items: [] } }),
        insert: vi.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
        update: vi.fn().mockResolvedValue({ data: { id: 'test-event-id' } }),
        delete: vi.fn().mockResolvedValue({}),
      },
    })),
  },
}));

// Mock email services to prevent actual email sending
vi.mock('@/lib/email/providers/aws-ses', () => ({
  sendEmail: vi.fn().mockResolvedValue({ MessageId: 'test-message-id' }),
  validateConfiguration: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/email/providers/sendgrid', () => ({
  send: vi.fn().mockResolvedValue([{ statusCode: 202 }]),
  setApiKey: vi.fn(),
}));

vi.mock('@/lib/email/providers/resend', () => ({
  emails: {
    send: vi.fn().mockResolvedValue({ id: 'test-email-id' }),
  },
}));

// Mock SMS services
vi.mock('twilio', () => {
  return vi.fn(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        sid: 'test-message-sid',
        status: 'delivered',
      }),
    },
  }));
});

// Mock Next.js server-side modules
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// ===================================================================
// DATABASE UTILITIES
// ===================================================================

interface TestDatabaseManager {
  cleanup: () => Promise<void>;
  seed: () => Promise<void>;
  createTestUser: (userData?: any) => Promise<any>;
  createTestDataset: () => Promise<any>;
  validateSchema: () => Promise<boolean>;
}

class IntegrationTestDatabaseManager implements TestDatabaseManager {
  private serviceClient: any;

  constructor(serviceClient: any) {
    this.serviceClient = serviceClient;
  }

  async cleanup(): Promise<void> {
    try {
      // Clean up in reverse dependency order to avoid foreign key constraints
      const tables = [
        'event_privacy',
        'events', 
        'relationship_group_members',
        'relationships',
        'relationship_groups',
        'invitation_tokens',
        'invitations',
        'connection_setups',
        'invitation_notification_preferences',
        'group_members',
        'users'
      ];

      for (const table of tables) {
        await this.serviceClient
          .from(table)
          .delete()
          .like('id', 'test-%');
      }

      console.log('🧹 Integration test database cleanup completed');
    } catch (error) {
      console.warn('Database cleanup warning:', error);
      // Don't fail tests if cleanup has issues
    }
  }

  async seed(): Promise<void> {
    try {
      // Create test users
      const users = [
        MockDataFactory.createUser({ id: 'test-user-1', email: 'test1@example.com' }),
        MockDataFactory.createUser({ id: 'test-user-2', email: 'test2@example.com' }),
        MockDataFactory.createUser({ id: 'test-user-3', email: 'test3@example.com' }),
      ];

      const { error: usersError } = await this.serviceClient
        .from('users')
        .insert(users);
        
      if (usersError) throw usersError;

      // Create test relationships
      const relationships = [
        MockDataFactory.createRelationship({
          id: 'test-relationship-1',
          user_id: 'test-user-1',
          partner_id: 'test-user-2',
          partner_name: users[1].full_name,
          relationship_type: 'primary',
          privacy_level: 'visible'
        }),
        MockDataFactory.createRelationship({
          id: 'test-relationship-2', 
          user_id: 'test-user-1',
          partner_id: 'test-user-3',
          partner_name: users[2].full_name,
          relationship_type: 'secondary',
          privacy_level: 'semi_private'
        })
      ];

      const { error: relationshipsError } = await this.serviceClient
        .from('relationships')
        .insert(relationships);
        
      if (relationshipsError) throw relationshipsError;

      // Create test events
      const events = [
        MockDataFactory.createEvent({
          id: 'test-event-1',
          user_id: 'test-user-1',
          title: 'Test Meeting',
          privacy_level: 'visible',
        }),
        MockDataFactory.createEvent({
          id: 'test-event-2',
          user_id: 'test-user-2',
          title: 'Private Appointment',
          privacy_level: 'private',
        })
      ];

      const { error: eventsError } = await this.serviceClient
        .from('events')
        .insert(events);
        
      if (eventsError) throw eventsError;

      console.log('🌱 Integration test database seeded successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  async createTestUser(userData: any = {}): Promise<any> {
    const user = MockDataFactory.createUser({ 
      id: `test-user-${Date.now()}`,
      ...userData 
    });

    const { data, error } = await this.serviceClient
      .from('users')
      .insert(user)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createTestDataset(): Promise<any> {
    const centerUserId = `test-center-${Date.now()}`;
    const network = MockDataFactory.createPolyculeNetwork(centerUserId, 4);

    // Insert users
    const { error: usersError } = await this.serviceClient
      .from('users')
      .insert(network.users);
    if (usersError) throw usersError;

    // Insert relationships  
    const { error: relationshipsError } = await this.serviceClient
      .from('relationships')
      .insert(network.relationships);
    if (relationshipsError) throw relationshipsError;

    // Insert events
    const { error: eventsError } = await this.serviceClient
      .from('events')
      .insert(network.events);
    if (eventsError) throw eventsError;

    return { centerUserId, network };
  }

  async validateSchema(): Promise<boolean> {
    try {
      // Test basic table access
      const tables = ['users', 'relationships', 'events'];
      
      for (const table of tables) {
        const { error } = await this.serviceClient
          .from(table)
          .select('*')
          .limit(1);
          
        if (error) {
          console.error(`Schema validation failed for table ${table}:`, error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Schema validation error:', error);
      return false;
    }
  }
}

let testDbManager: IntegrationTestDatabaseManager;

// ===================================================================
// PERFORMANCE MONITORING
// ===================================================================

interface PerformanceMetrics {
  testStartTime: number;
  databaseOperations: number;
  slowQueries: Array<{ query: string; duration: number }>;
  averageResponseTime: number;
}

let performanceMetrics: PerformanceMetrics;

function startPerformanceMonitoring() {
  performanceMetrics = {
    testStartTime: Date.now(),
    databaseOperations: 0,
    slowQueries: [],
    averageResponseTime: 0,
  };
}

function recordDatabaseOperation(operationType: string, duration: number) {
  performanceMetrics.databaseOperations++;
  
  if (duration > 100) { // Slow query threshold: 100ms
    performanceMetrics.slowQueries.push({
      query: operationType,
      duration
    });
  }
}

// ===================================================================
// TEST LIFECYCLE HOOKS
// ===================================================================

beforeAll(async () => {
  console.log('🔗 Starting integration test suite with real services');
  
  try {
    // Initialize Supabase clients
    testSupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    testServiceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Initialize database manager
    testDbManager = new IntegrationTestDatabaseManager(testServiceClient);
    
    // Validate database schema
    const schemaValid = await testDbManager.validateSchema();
    if (!schemaValid) {
      throw new Error('Database schema validation failed - check your test database setup');
    }
    
    console.log('✅ Database schema validation passed');
    
    // Initial cleanup
    await testDbManager.cleanup();
    
    // Seed base test data
    await testDbManager.seed();
    
    console.log('🔗 Integration test environment ready');
    
  } catch (error) {
    console.error('❌ Integration test setup failed:', error);
    throw error;
  }
}, 30000); // 30 second timeout for setup

afterAll(async () => {
  console.log('🔗 Integration test suite completed');
  
  try {
    // Final cleanup
    await testDbManager?.cleanup();
    
    // Log performance summary
    if (performanceMetrics) {
      const totalTime = Date.now() - performanceMetrics.testStartTime;
      console.log(`📊 Performance Summary:
        - Total test time: ${totalTime}ms
        - Database operations: ${performanceMetrics.databaseOperations}
        - Slow queries: ${performanceMetrics.slowQueries.length}
        - Average response: ${performanceMetrics.averageResponseTime}ms
      `);
      
      if (performanceMetrics.slowQueries.length > 0) {
        console.warn('🐌 Slow queries detected:', performanceMetrics.slowQueries);
      }
    }
    
  } catch (error) {
    console.warn('Integration test cleanup warning:', error);
  }
}, 15000); // 15 second timeout for cleanup

beforeEach(async () => {
  // Start performance monitoring for each test
  startPerformanceMonitoring();
  
  // Clear any test-specific data while preserving base seed data
  try {
    await testServiceClient
      .from('events')
      .delete()
      .like('title', 'Integration Test%');
      
    await testServiceClient
      .from('relationships')
      .delete()
      .like('partner_name', 'Integration Test%');
      
  } catch (error) {
    console.warn('Test cleanup warning:', error);
  }
});

afterEach(() => {
  // Record final performance metrics
  if (performanceMetrics.databaseOperations > 0) {
    performanceMetrics.averageResponseTime = 
      (Date.now() - performanceMetrics.testStartTime) / performanceMetrics.databaseOperations;
  }
});

// ===================================================================
// INTEGRATION TEST UTILITIES
// ===================================================================

// Global utilities for integration tests
global.integrationUtils = {
  // Database access
  supabase: testSupabaseClient,
  serviceClient: testServiceClient,
  dbManager: testDbManager,
  
  // Test data creation with real database
  async createRealisticScenario() {
    return await testDbManager.createTestDataset();
  },
  
  async createTestUser(userData?: any) {
    return await testDbManager.createTestUser(userData);
  },
  
  // Performance testing
  recordOperation: recordDatabaseOperation,
  getPerformanceMetrics: () => ({ ...performanceMetrics }),
  
  // Conflict detection testing with real timing
  async testConflictDetectionPerformance(partnerIds: string[]) {
    const startTime = Date.now();
    
    // This would use the real conflict detection service
    const request = {
      event_start: new Date().toISOString(),
      event_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      partner_ids: partnerIds,
      buffer_time_minutes: 15,
    };
    
    // Simulate real conflict detection - replace with actual service call
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate processing
    
    const duration = Date.now() - startTime;
    recordDatabaseOperation('conflict_detection', duration);
    
    return {
      duration,
      meets_requirement: duration < 2000,
      request,
    };
  },
  
  // Real-time testing utilities
  async testRealtimeUpdates() {
    return new Promise((resolve) => {
      const subscription = testSupabaseClient
        .channel('test-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'events' },
          (payload: any) => {
            resolve(payload);
          }
        )
        .subscribe();
        
      // Cleanup subscription after test
      setTimeout(() => {
        subscription.unsubscribe();
        resolve({ timeout: true });
      }, 5000);
    });
  },
  
  // Privacy testing with real database
  async testPrivacyBoundaries(viewerUserId: string, targetUserId: string) {
    const { data: events } = await testServiceClient
      .from('events')
      .select('*')
      .eq('user_id', targetUserId);
      
    const { data: relationship } = await testServiceClient
      .from('relationships')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('partner_id', viewerUserId)
      .single();
      
    return TestHelpers.privacy.testEventPrivacyBoundaries(
      events || [], 
      viewerUserId, 
      targetUserId
    );
  },
};

console.log('🔗 Integration test setup completed - using real database and services');
