/**
 * Test Helpers Verification Test
 * 
 * This test verifies that our test helpers are working correctly
 * before running the full production test suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../../lib/test-helpers';

describe('🔧 Test Helpers Verification', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });
  
  afterAll(async () => {
    await testHelpers.teardownTestEnvironment();
  });

  it('should set up test environment successfully', async () => {
    const testContext = await testHelpers.setupTestEnvironment(supabase);
    expect(testContext).toBeDefined();
  });

  it('should create test users successfully', async () => {
    const testUser = {
      email: 'test-verification@example.com',
      full_name: 'Test Verification User',
      phone: null, // Remove invalid phone to avoid check constraint
      timezone: 'UTC'
    };

    const createdUser = await testHelpers.createTestUser(supabase, testUser);
    expect(createdUser).toBeDefined();
    expect(createdUser.email).toBe(testUser.email);
    expect(createdUser.full_name).toBe(testUser.full_name);
    expect(createdUser.phone).toBe(testUser.phone);
    expect(createdUser.timezone).toBe(testUser.timezone);
    expect(createdUser.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // Valid UUID
  });

  it('should authenticate as a user', async () => {
    const testUserId = crypto.randomUUID();
    const testUser = {
      id: testUserId,
      email: 'test-auth@example.com',
      full_name: 'Test Auth User'
    };

    const session = await testHelpers.authenticateAs(supabase, testUser);
    expect(session).toBeDefined();
    expect(session.user.id).toBe(testUser.id);
  });

  it('should create test relationships successfully', async () => {
    // Create actual users first for FK references
    const user1 = await testHelpers.createTestUser(supabase, {
      email: 'rel-user1@example.com',
      full_name: 'Relationship User 1'
    });
    const user2 = await testHelpers.createTestUser(supabase, {
      email: 'rel-user2@example.com', 
      full_name: 'Relationship User 2'
    });
    
    const relationshipData = {
      user_id: user1.id,
      partner_id: user2.id,
      partner_name: 'Test Partner',
      partner_email: 'partner@example.com',
      relationship_type: 'friendship',
      default_privacy_level: 'private',
      privacy_level: 'private',
      connection_tier: 'details'
    };

    const createdRelationship = await testHelpers.createTestRelationship(supabase, relationshipData);
    expect(createdRelationship).toBeDefined();
    expect(createdRelationship.relationship_type).toBe('friendship');
    expect(createdRelationship.partner_name).toBe('Test Partner');
    expect(createdRelationship.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // Valid UUID
  });

  it('should create test events successfully', async () => {
    // Create actual user first for FK reference
    const user = await testHelpers.createTestUser(supabase, {
      email: 'event-user@example.com',
      full_name: 'Event User'
    });
    
    const eventData = {
      user_id: user.id,
      title: 'Test Event',
      description: 'Test Description',
      start_time: '2024-01-15T14:00:00Z',
      end_time: '2024-01-15T15:00:00Z',
      privacy_level: 'private',
      location: 'Test Location'
    };

    const createdEvent = await testHelpers.createTestEvent(supabase, eventData);
    expect(createdEvent).toBeDefined();
    expect(createdEvent.title).toBe('Test Event');
    expect(createdEvent.description).toBe('Test Description');
    expect(createdEvent.location).toBe('Test Location');
    expect(createdEvent.user_id).toBe(user.id);
    expect(createdEvent.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i); // Valid UUID
  });

  it('should clean up test data successfully', async () => {
    // This should not throw an error
    await testHelpers.cleanupTestData(supabase);
    expect(true).toBe(true); // If we get here, cleanup worked
  });

  it('should identify test users correctly', async () => {
    expect(testHelpers.isTestUser('polyharmonytest@gmail.com')).toBe(true);
    expect(testHelpers.isTestUser('user@test.com')).toBe(true);
    expect(testHelpers.isTestUser('demo@example.com')).toBe(true);
    expect(testHelpers.isTestUser('regular@example.com')).toBe(false);
  });

  it('should create test data titles correctly', async () => {
    const eventTitle = testHelpers.createTestEventTitle('My Event');
    expect(eventTitle).toBe('[TEST] My Event');
    
    const groupName = testHelpers.createTestGroupName('My Group');
    expect(groupName).toBe('[TEST-GROUP] My Group');
    
    expect(testHelpers.isTestData('[TEST] Some Event')).toBe(true);
    expect(testHelpers.isTestData('Regular Event')).toBe(false);
  });
});
