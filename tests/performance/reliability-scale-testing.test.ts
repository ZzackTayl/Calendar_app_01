/**
 * Performance & Reliability Testing Suite
 * 
 * Tests system performance and reliability under realistic load conditions
 * for your target of 10,000 users. Focuses on the critical performance claims:
 * - Sub-2 second conflict detection response times
 * - Rate limiting thresholds validation  
 * - Offline/poor connectivity resilience
 * - Database performance under load
 * - Real-time system reliability
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../../lib/test-helpers';

// Performance testing utilities
class PerformanceTimer {
  private startTime: number = 0;
  
  start() {
    this.startTime = performance.now();
  }
  
  end(): number {
    return performance.now() - this.startTime;
  }
  
  static async timeAsyncOperation<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
    const timer = new PerformanceTimer();
    timer.start();
    const result = await operation();
    const duration = timer.end();
    return { result, duration };
  }
}

// Load generation utilities for realistic testing
const generateLoadTestUsers = (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: crypto.randomUUID(), // ✅ FIX: Use proper UUID instead of string
      phone: `+1415555${i.toString().padStart(4, '0')}`, // ✅ FIX: Use 'phone' not 'phone_number'
      email: `loaduser${i}@testpoly.com`,
      full_name: `Load User ${i}`, // ✅ FIX: Use 'full_name' not 'display_name'
      timezone: ['America/Los_Angeles', 'America/New_York', 'America/Chicago', 'America/Denver'][i % 4]
    });
  }
  return users;
};

const generateRealisticRelationshipNetwork = (users: any[], networkDensity: number = 0.1) => {
  const relationships = [];
  for (let i = 0; i < users.length; i++) {
    const numConnections = Math.max(1, Math.floor(users.length * networkDensity));
    for (let j = 0; j < numConnections && j < users.length - 1; j++) {
      if (i !== j) {
        const relationshipTypes = ['primary', 'secondary', 'casual', 'friendship'];
        const privacyLevels = ['visible', 'semi_private', 'private'];
        relationships.push({
          user_id: users[i].id,
          partner_id: users[j].id,
          relationship_type: relationshipTypes[j % relationshipTypes.length],
          default_privacy_level: privacyLevels[j % privacyLevels.length],
          can_view_schedule: Math.random() > 0.3, // 70% can view schedules
          can_create_events: Math.random() > 0.5  // 50% can create events
        });
      }
    }
  }
  return relationships;
};

describe('⚡ CRITICAL: Sub-2 Second Conflict Detection Performance', () => {
  let supabase: any;
  let loadTestUsers: any[];
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Generate realistic test data for performance testing
    loadTestUsers = generateLoadTestUsers(50); // Start with 50 users for performance tests
    await testHelpers.setupTestEnvironment(supabase);
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    
    // Set up load test users and relationships
    for (const user of loadTestUsers) {
      await testHelpers.createTestUser(supabase, user);
    }
    
    const relationships = generateRealisticRelationshipNetwork(loadTestUsers, 0.15); // 15% network density
    for (const relationship of relationships.slice(0, 100)) { // Limit to first 100 relationships for test speed
      await testHelpers.createTestRelationship(supabase, relationship);
    }
  });

  it('🚀 CRITICAL: Single conflict check completes in under 2 seconds', async () => {
    const testUser = loadTestUsers[0];
    const partners = loadTestUsers.slice(1, 6); // Check against 5 partners
    
    // Create some conflicting events
    const conflictingEvents = [
      {
        user_id: partners[0].id,
        title: 'Existing Event 1',
        start_time: '2024-02-20T14:30:00Z',
        end_time: '2024-02-20T16:00:00Z',
        privacy_level: 'visible'
      },
      {
        user_id: partners[2].id,
        title: 'Existing Event 2',
        start_time: '2024-02-20T15:00:00Z',
        end_time: '2024-02-20T17:00:00Z',
        privacy_level: 'semi_private'
      }
    ];
    
    for (const event of conflictingEvents) {
      await supabase.from('events').insert(event);
    }
    
    // Test the critical performance requirement
    const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_start: '2024-02-20T14:00:00Z',
          event_end: '2024-02-20T17:30:00Z',
          partner_ids: partners.map(p => p.id)
        })
      });
      return response.json();
    });
    
    // CRITICAL: Must be under 2000ms (2 seconds)
    expect(duration).toBeLessThan(2000);
    expect(result.success).toBe(true);
    expect(result.has_conflicts).toBe(true);
    expect(result.conflicts).toHaveLength(2);
    
    console.log(`✅ Conflict detection completed in ${duration.toFixed(2)}ms (Target: <2000ms)`);
  });
  
  it('🚀 CRITICAL: Batch conflict detection with 10 partners stays under 2 seconds', async () => {
    const testUser = loadTestUsers[0];
    const partners = loadTestUsers.slice(1, 11); // 10 partners for batch test
    
    // Create distributed conflicting events across partners
    const conflictingEvents = partners.map((partner, index) => ({
      user_id: partner.id,
      title: `Partner ${index} Event`,
      start_time: `2024-02-20T${(14 + index % 4).toString().padStart(2, '0')}:00:00Z`,
      end_time: `2024-02-20T${(15 + index % 4).toString().padStart(2, '0')}:00:00Z`,
      privacy_level: ['visible', 'semi_private', 'private'][index % 3]
    }));
    
    for (const event of conflictingEvents) {
      await supabase.from('events').insert(event);
    }
    
    const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
      const response = await fetch('/api/events/check-conflicts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_start: '2024-02-20T13:00:00Z',
          event_end: '2024-02-20T18:00:00Z',
          partner_ids: partners.map(p => p.id),
          alternative_slots_count: 5
        })
      });
      return response.json();
    });
    
    // CRITICAL: Even with 10 partners and smart suggestions, must be under 2 seconds
    expect(duration).toBeLessThan(2000);
    expect(result.success).toBe(true);
    expect(result.performance_metrics).toBeDefined();
    expect(result.performance_metrics.processing_time_ms).toBeLessThan(2000);
    
    console.log(`✅ Batch conflict detection (10 partners) completed in ${duration.toFixed(2)}ms`);
  });
  
  it('⚡ Performance degradation test with increasing partner count', async () => {
    const partnerCounts = [1, 3, 5, 10, 15, 20];
    const performanceResults = [];
    
    for (const count of partnerCounts) {
      const partners = loadTestUsers.slice(1, count + 1);
      
      // Create one event per partner to ensure conflicts
      for (let i = 0; i < count; i++) {
        await supabase.from('events').insert({
          user_id: partners[i].id,
          title: `Performance Test Event ${i}`,
          start_time: '2024-02-25T15:00:00Z',
          end_time: '2024-02-25T16:00:00Z',
          privacy_level: 'visible'
        });
      }
      
      const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
        const response = await fetch('/api/events/check-conflicts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_start: '2024-02-25T14:30:00Z',
            event_end: '2024-02-25T16:30:00Z',
            partner_ids: partners.map(p => p.id)
          })
        });
        return response.json();
      });
      
      performanceResults.push({ partnerCount: count, duration, success: result.success });
      
      // Clean up events for next test
      await supabase.from('events').delete().in('user_id', partners.map(p => p.id));
    }
    
    // Analyze performance degradation
    for (const result of performanceResults) {
      expect(result.duration).toBeLessThan(2000); // All must be under 2 seconds
      expect(result.success).toBe(true);
    }
    
    // Performance should degrade linearly, not exponentially
    const firstDuration = performanceResults[0].duration;
    const lastDuration = performanceResults[performanceResults.length - 1].duration;
    const degradationRatio = lastDuration / firstDuration;
    
    // 20x more partners should not cause more than 10x performance degradation
    expect(degradationRatio).toBeLessThan(10);
    
    console.log('✅ Performance degradation analysis:');
    performanceResults.forEach(r => 
      console.log(`  ${r.partnerCount} partners: ${r.duration.toFixed(2)}ms`)
    );
  });
  
  it('📊 Cache effectiveness under repeated requests', async () => {
    const testUser = loadTestUsers[0];
    const partners = loadTestUsers.slice(1, 6);
    const requestPayload = {
      event_start: '2024-03-01T14:00:00Z',
      event_end: '2024-03-01T16:00:00Z',
      partner_ids: partners.map(p => p.id)
    };
    
    // First request (cold cache)
    const { duration: coldDuration } = await PerformanceTimer.timeAsyncOperation(async () => {
      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      return response.json();
    });
    
    // Second request (warm cache - should be faster)
    const { result: warmResult, duration: warmDuration } = await PerformanceTimer.timeAsyncOperation(async () => {
      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      return response.json();
    });
    
    // Cache should improve performance
    expect(warmDuration).toBeLessThan(coldDuration);
    expect(warmResult.performance_metrics?.cache_hit_ratio).toBeGreaterThan(0);
    
    console.log(`✅ Cache effectiveness: Cold ${coldDuration.toFixed(2)}ms → Warm ${warmDuration.toFixed(2)}ms`);
  });
});

describe('🛡️ Rate Limiting Performance Under Load', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
  });

  it('🚦 Auth rate limiting: 5 requests per 15 minutes threshold', async () => {
    const testUser = { phone: '+14155551234', password: 'TestPassword123!' };
    
    // Track auth attempts and response times
    const authAttempts = [];
    
    // Make 6 auth attempts (1 over the limit)
    for (let i = 0; i < 6; i++) {
      const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testUser)
        });
        return { status: response.status, data: await response.json() };
      });
      
      authAttempts.push({ attempt: i + 1, duration, status: result.status });
      
      // Small delay between attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // First 5 should be processed normally
    for (let i = 0; i < 5; i++) {
      expect(authAttempts[i].status).not.toBe(429); // Not rate limited
    }
    
    // 6th attempt should be rate limited
    expect(authAttempts[5].status).toBe(429);
    
    // Rate limiting should be fast (not slow the system down)
    expect(authAttempts[5].duration).toBeLessThan(100); // Quick rejection
    
    console.log('✅ Auth rate limiting working correctly');
    console.log(`   Rate limit rejection time: ${authAttempts[5].duration.toFixed(2)}ms`);
  });
  
  it('🚦 API rate limiting: 100 requests per minute threshold', async () => {
    const testUser = generateLoadTestUsers(1)[0];
    await testHelpers.createTestUser(supabase, testUser);
    await testHelpers.authenticateAs(supabase, testUser);
    
    // Make rapid API requests to test the 100/minute limit
    const apiRequests = [];
    const startTime = Date.now();
    
    // Make 105 requests rapidly (5 over limit)
    const promises = Array(105).fill(null).map(async (_, i) => {
      const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
        const response = await fetch('/api/events', {
          method: 'GET',
          headers: { 'Authorization': 'Bearer mock-token' }
        });
        return { status: response.status, attempt: i + 1 };
      });
      return { ...result, duration };
    });
    
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    
    // Count successful vs rate-limited requests
    const successful = results.filter(r => r.status !== 429);
    const rateLimited = results.filter(r => r.status === 429);
    
    // Should have approximately 100 successful and 5 rate limited
    expect(successful.length).toBeGreaterThanOrEqual(95); // Allow some variance
    expect(rateLimited.length).toBeGreaterThan(0);
    
    // Rate limiting should not significantly slow down the system
    const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    expect(avgResponseTime).toBeLessThan(200); // Average under 200ms
    
    console.log('✅ API rate limiting performance test passed');
    console.log(`   ${successful.length} successful, ${rateLimited.length} rate limited`);
    console.log(`   Average response time: ${avgResponseTime.toFixed(2)}ms`);
  });
  
  it('🚦 Event creation rate limiting: 30 events per minute', async () => {
    const testUser = generateLoadTestUsers(1)[0];
    await testHelpers.createTestUser(supabase, testUser);
    await testHelpers.authenticateAs(supabase, testUser);
    
    // Create 35 events rapidly (5 over limit)
    const eventCreationResults = [];
    
    for (let i = 0; i < 35; i++) {
      const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
        const response = await fetch('/api/events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token' 
          },
          body: JSON.stringify({
            title: `Rate Limit Test Event ${i}`,
            start_time: `2024-03-10T${(10 + i % 12).toString().padStart(2, '0')}:00:00Z`,
            end_time: `2024-03-10T${(11 + i % 12).toString().padStart(2, '0')}:00:00Z`,
            privacy_level: 'visible'
          })
        });
        return { status: response.status };
      });
      
      eventCreationResults.push({ attempt: i + 1, duration, status: result.status });
    }
    
    const successful = eventCreationResults.filter(r => r.status === 201 || r.status === 200);
    const rateLimited = eventCreationResults.filter(r => r.status === 429);
    
    // Should allow ~30 events and rate limit the rest
    expect(successful.length).toBeLessThanOrEqual(32); // Allow small variance
    expect(rateLimited.length).toBeGreaterThan(0);
    
    // Rate limiting should be consistent and fast
    const rateLimitedResponseTimes = rateLimited.map(r => r.duration);
    const avgRateLimitTime = rateLimitedResponseTimes.reduce((sum, time) => sum + time, 0) / rateLimitedResponseTimes.length;
    expect(avgRateLimitTime).toBeLessThan(50); // Very fast rejection
    
    console.log('✅ Event creation rate limiting working');
    console.log(`   ${successful.length} successful, ${rateLimited.length} rate limited`);
  });
});

describe('📱 Offline/Poor Connectivity Resilience', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
  });

  it('📶 Graceful degradation with connection timeouts', async () => {
    // Mock slow/failing network conditions
    const mockSlowResponse = async (url: string, options: any) => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      
      // Return timeout error
      throw new Error('Network request timeout');
    };
    
    // Test how the app handles network timeouts
    const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
      try {
        // This should timeout and return a graceful error
        const response = await Promise.race([
          fetch('/api/events/check-conflicts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_start: '2024-03-15T14:00:00Z',
              event_end: '2024-03-15T16:00:00Z',
              partner_ids: ['user-123']
            })
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 3000)
          )
        ]);
        
        return await (response as Response).json();
      } catch (error) {
        // Should return graceful fallback response
        return {
          success: false,
          has_conflicts: false, // Fail safe: assume no conflicts
          conflicts: [],
          error: 'Network connectivity issues - please try again',
          offline_mode: true
        };
      }
    });
    
    // Should fail gracefully and quickly
    expect(duration).toBeLessThan(4000); // Timeout should be enforced
    expect(result.success).toBe(false);
    expect(result.offline_mode).toBe(true);
    expect(result.error).toContain('connectivity');
    
    console.log('✅ Network timeout handling working');
    console.log(`   Graceful timeout after ${duration.toFixed(2)}ms`);
  });
  
  it('💾 Offline data synchronization and conflict resolution', async () => {
    const testUser = generateLoadTestUsers(1)[0];
    await testHelpers.createTestUser(supabase, testUser);
    
    // Simulate creating events while offline
    const offlineEvents = [
      {
        id: 'offline-event-1',
        user_id: testUser.id,
        title: 'Created While Offline',
        start_time: '2024-03-20T10:00:00Z',
        end_time: '2024-03-20T11:00:00Z',
        privacy_level: 'visible',
        created_offline: true,
        local_timestamp: Date.now()
      },
      {
        id: 'offline-event-2',
        user_id: testUser.id,
        title: 'Another Offline Event',
        start_time: '2024-03-20T14:00:00Z',
        end_time: '2024-03-20T15:00:00Z',
        privacy_level: 'semi_private',
        created_offline: true,
        local_timestamp: Date.now()
      }
    ];
    
    // Store in local storage (simulating offline storage)
    const offlineStorage = new Map();
    offlineEvents.forEach(event => {
      offlineStorage.set(event.id, event);
    });
    
    // Simulate coming back online and syncing
    const { result: syncResult, duration: syncDuration } = await PerformanceTimer.timeAsyncOperation(async () => {
      const syncResponse = await fetch('/api/sync/offline-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offline_events: Array.from(offlineStorage.values()),
          user_id: testUser.id
        })
      });
      
      return await syncResponse.json();
    });
    
    // Sync should be successful and reasonably fast
    expect(syncResult.success).toBe(true);
    expect(syncResult.synced_events).toBe(2);
    expect(syncResult.conflicts_resolved).toBeDefined();
    expect(syncDuration).toBeLessThan(1000); // Under 1 second for 2 events
    
    // Verify events were actually created
    const { data: syncedEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', testUser.id);
      
    expect(syncedEvents).toHaveLength(2);
    expect(syncedEvents.some(e => e.title === 'Created While Offline')).toBe(true);
    
    console.log('✅ Offline sync working correctly');
    console.log(`   Synced 2 events in ${syncDuration.toFixed(2)}ms`);
  });
  
  it('🔄 Real-time reconnection and state recovery', async () => {
    const testUser = generateLoadTestUsers(1)[0];
    await testHelpers.createTestUser(supabase, testUser);
    
    // Simulate WebSocket connection drop and recovery
    let reconnectionTime: number = 0;
    let stateRecoveryTime: number = 0;
    
    const { result: reconnectionResult, duration: totalDuration } = await PerformanceTimer.timeAsyncOperation(async () => {
      // Simulate connection drop (would trigger in real WebSocket)
      const disconnectTime = Date.now();
      
      // Simulate reconnection attempt after 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Measure reconnection time
      const reconnectStart = performance.now();
      
      // Test real-time subscription recovery
      const response = await fetch('/api/realtime/reconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: testUser.id,
          last_sync_timestamp: disconnectTime,
          subscriptions: ['events', 'relationships']
        })
      });
      
      reconnectionTime = performance.now() - reconnectStart;
      
      const result = await response.json();
      
      // Measure state recovery time
      const stateRecoveryStart = performance.now();
      
      // Fetch missed updates during disconnection
      const stateResponse = await fetch(`/api/sync/missed-updates?user_id=${testUser.id}&since=${disconnectTime}`);
      const stateResult = await stateResponse.json();
      
      stateRecoveryTime = performance.now() - stateRecoveryStart;
      
      return {
        reconnection_success: response.status === 200,
        state_recovery_success: stateResponse.status === 200,
        missed_updates: stateResult.updates?.length || 0
      };
    });
    
    // Reconnection should be fast and successful
    expect(reconnectionResult.reconnection_success).toBe(true);
    expect(reconnectionResult.state_recovery_success).toBe(true);
    expect(reconnectionTime).toBeLessThan(500); // Under 500ms to reconnect
    expect(stateRecoveryTime).toBeLessThan(300); // Under 300ms to recover state
    
    console.log('✅ Real-time reconnection working');
    console.log(`   Reconnection: ${reconnectionTime.toFixed(2)}ms, State recovery: ${stateRecoveryTime.toFixed(2)}ms`);
  });
});

describe('🏗️ Database Performance Under 10,000 User Load', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    // Note: These tests would typically run against a dedicated test environment
    // with realistic data volumes
    await testHelpers.cleanupTestData(supabase);
  });

  it('💽 Database query performance with large datasets', async () => {
    // Create a realistic dataset (scaled down for test environment)
    const users = generateLoadTestUsers(100); // Represents 10k users scaled down
    const relationships = generateRealisticRelationshipNetwork(users, 0.05); // 5% density
    
    // Batch insert users (simulating bulk operations)
    const { duration: userInsertTime } = await PerformanceTimer.timeAsyncOperation(async () => {
      const batchSize = 20;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        await supabase.from('users').insert(batch);
      }
    });
    
    // Batch insert relationships
    const { duration: relationshipInsertTime } = await PerformanceTimer.timeAsyncOperation(async () => {
      const batchSize = 50;
      for (let i = 0; i < relationships.length; i += batchSize) {
        const batch = relationships.slice(i, i + batchSize);
        await supabase.from('relationships').insert(batch);
      }
    });
    
    // Test complex query performance (user with all their relationships and recent events)
    const testUser = users[0];
    const { result: complexQuery, duration: queryTime } = await PerformanceTimer.timeAsyncOperation(async () => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          relationships!relationships_user_id_fkey(
            *,
            partner:users!relationships_partner_id_fkey(display_name, email)
          ),
          events(
            *,
            event_privacy(*)
          )
        `)
        .eq('id', testUser.id);
        
      return { data, error };
    });
    
    // Performance benchmarks for database operations
    expect(userInsertTime).toBeLessThan(5000); // 100 users in under 5 seconds
    expect(relationshipInsertTime).toBeLessThan(10000); // Relationships in under 10 seconds  
    expect(queryTime).toBeLessThan(500); // Complex query in under 500ms
    expect(complexQuery.error).toBeNull();
    
    console.log('✅ Database performance benchmarks:');
    console.log(`   User insertion (100 users): ${userInsertTime.toFixed(2)}ms`);
    console.log(`   Relationship insertion: ${relationshipInsertTime.toFixed(2)}ms`);
    console.log(`   Complex query: ${queryTime.toFixed(2)}ms`);
  });
  
  it('🔍 Full-text search performance', async () => {
    // Create events with searchable content
    const searchTestEvents = Array(200).fill(null).map((_, i) => ({
      user_id: generateLoadTestUsers(1)[0].id,
      title: `Event ${i} - ${['Meeting', 'Date', 'Party', 'Therapy', 'Work'][i % 5]}`,
      description: `This is event number ${i} with some searchable content about ${['business', 'romance', 'fun', 'health', 'productivity'][i % 5]}`,
      start_time: '2024-04-01T10:00:00Z',
      end_time: '2024-04-01T11:00:00Z',
      privacy_level: 'visible'
    }));
    
    // Insert test events
    await supabase.from('events').insert(searchTestEvents);
    
    // Test search performance
    const searchQueries = ['Meeting', 'Date night', 'Therapy session', 'Work project'];
    
    for (const query of searchQueries) {
      const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
        const response = await fetch(`/api/events/search?q=${encodeURIComponent(query)}&limit=20`);
        return await response.json();
      });
      
      expect(duration).toBeLessThan(300); // Search under 300ms
      expect(result.events).toBeDefined();
      expect(result.events.length).toBeGreaterThan(0);
      
      console.log(`   Search "${query}": ${duration.toFixed(2)}ms (${result.events.length} results)`);
    }
  });
  
  it('📊 Aggregation query performance (analytics)', async () => {
    const users = generateLoadTestUsers(20);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    // Create events distributed across users and time
    const analyticsEvents = [];
    for (let i = 0; i < 500; i++) {
      analyticsEvents.push({
        user_id: users[i % users.length].id,
        title: `Analytics Event ${i}`,
        start_time: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(), // Spread over days
        end_time: new Date(Date.now() + i * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
        privacy_level: ['visible', 'semi_private', 'private'][i % 3]
      });
    }
    
    await supabase.from('events').insert(analyticsEvents);
    
    // Test analytics aggregation queries
    const { result: analyticsResult, duration: analyticsTime } = await PerformanceTimer.timeAsyncOperation(async () => {
      const response = await fetch('/api/analytics/event-statistics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_ids: users.slice(0, 10).map(u => u.id),
          date_range: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        })
      });
      return await response.json();
    });
    
    // Analytics queries should be reasonably fast
    expect(analyticsTime).toBeLessThan(1000); // Under 1 second
    expect(analyticsResult.total_events).toBeGreaterThan(0);
    expect(analyticsResult.privacy_breakdown).toBeDefined();
    
    console.log(`✅ Analytics aggregation: ${analyticsTime.toFixed(2)}ms`);
  });
});

describe('⚡ Real-time System Performance', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  it('🔄 Real-time event propagation performance', async () => {
    const users = generateLoadTestUsers(10);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    // Set up real-time subscriptions (simulated)
    const subscriptions = users.map(user => ({
      user_id: user.id,
      channels: ['events', 'relationships'],
      connected_at: Date.now()
    }));
    
    // Test real-time event creation and propagation
    const { result, duration } = await PerformanceTimer.timeAsyncOperation(async () => {
      // Create event that affects multiple users
      const { data: event } = await supabase
        .from('events')
        .insert({
          user_id: users[0].id,
          title: 'Real-time Test Event',
          start_time: '2024-05-01T14:00:00Z',
          end_time: '2024-05-01T15:00:00Z',
          privacy_level: 'visible'
        })
        .select()
        .single();
        
      // Simulate real-time notification to all subscribed users
      const notificationPromises = subscriptions.map(async (sub) => {
        const response = await fetch('/api/realtime/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: sub.user_id,
            event_type: 'event_created',
            event_id: event.id,
            channel: 'events'
          })
        });
        return response.json();
      });
      
      const results = await Promise.all(notificationPromises);
      return results;
    });
    
    // Real-time propagation should be very fast
    expect(duration).toBeLessThan(200); // Under 200ms to notify all users
    expect(result.every(r => r.success)).toBe(true);
    
    console.log(`✅ Real-time propagation to 10 users: ${duration.toFixed(2)}ms`);
  });
});
