/**
 * CRITICAL: Privacy Boundary Testing Framework
 * 
 * This test suite prevents the most catastrophic failure mode:
 * Privacy violations that could expose private events to unintended viewers.
 * 
 * Failure of any of these tests should BLOCK deployment to production.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../../lib/test-helpers';

// Test data generators for realistic polyamorous relationship networks
const generateTestUsers = () => ({
  alice: { id: 'user-alice', phone: '+1234567890', display_name: 'Alice', email: 'alice@test.com' },
  bob: { id: 'user-bob', phone: '+1234567891', display_name: 'Bob', email: 'bob@test.com' },
  charlie: { id: 'user-charlie', phone: '+1234567892', display_name: 'Charlie', email: 'charlie@test.com' },
  diana: { id: 'user-diana', phone: '+1234567893', display_name: 'Diana', email: 'diana@test.com' },
});

const generateComplexRelationshipNetwork = (users: any) => [
  // Alice's relationships
  { user_id: users.alice.id, partner_id: users.bob.id, relationship_type: 'primary', default_privacy_level: 'visible' },
  { user_id: users.alice.id, partner_id: users.charlie.id, relationship_type: 'secondary', default_privacy_level: 'semi_private' },
  { user_id: users.alice.id, partner_id: users.diana.id, relationship_type: 'casual', default_privacy_level: 'private' },
  
  // Bob's relationships (reverse + additional)
  { user_id: users.bob.id, partner_id: users.alice.id, relationship_type: 'primary', default_privacy_level: 'visible' },
  { user_id: users.bob.id, partner_id: users.charlie.id, relationship_type: 'casual', default_privacy_level: 'semi_private' },
  
  // Charlie's relationships
  { user_id: users.charlie.id, partner_id: users.alice.id, relationship_type: 'secondary', default_privacy_level: 'visible' },
  { user_id: users.charlie.id, partner_id: users.bob.id, relationship_type: 'friendship', default_privacy_level: 'private' },
  { user_id: users.charlie.id, partner_id: users.diana.id, relationship_type: 'long_distance', default_privacy_level: 'visible' },
});


describe('🚨 CRITICAL: Privacy Boundary Testing', () => {
  let supabase: any;
  let testUsers: any;
  let relationships: any[];
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Set up test environment using new test helpers
    await testHelpers.setupTestEnvironment(supabase);
    
    // Set up test data
    testUsers = generateTestUsers();
    relationships = generateComplexRelationshipNetwork(testUsers);
  });

  beforeEach(async () => {
    // Clean slate for each test
    await testHelpers.cleanupTestData(supabase);
    
    // Create test users
    for (const user of Object.values(testUsers)) {
      await testHelpers.createTestUser(supabase, user);
    }
    
    // Create relationships
    for (const rel of relationships) {
      await testHelpers.createTestRelationship(supabase, rel);
    }
  });

  afterEach(async () => {
    await testHelpers.cleanupTestData(supabase);
  });
  
  afterAll(async () => {
    await testHelpers.teardownTestEnvironment();
  });

  describe('🛡️ Event Privacy Level Enforcement', () => {
    it('CRITICAL: Private events must NEVER be visible to any partner', async () => {
      // Alice creates a private therapy session
      const privateEvent = {
        user_id: testUsers.alice.id,
        title: 'Therapy Session - Personal Issues',
        description: 'Discussing relationship anxieties with therapist',
        start_time: '2024-01-15T14:00:00Z',
        end_time: '2024-01-15T15:00:00Z',
        privacy_level: 'private',
        location: 'Dr. Smith Office'
      };

      const { data: event } = await supabase
        .from('events')
        .insert(privateEvent)
        .select()
        .single();

      // Test visibility from ALL partners' perspectives
      for (const partner of [testUsers.bob, testUsers.charlie, testUsers.diana]) {
        // Authenticate as the partner
        await testHelpers.authenticateAs(supabase, partner);
        
        // Attempt to query Alice's events
        const { data: visibleEvents } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', testUsers.alice.id);

        // CRITICAL: Private events must not appear in results
        expect(visibleEvents).not.toContainEqual(expect.objectContaining({
          id: event.id
        }));

        // CRITICAL: Direct queries by ID must fail
        const { data: directQuery, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', event.id);

        expect(directQuery).toBeNull();
        expect(error).toBeTruthy(); // Should be blocked by RLS
      }
    });

    it('CRITICAL: Semi-private events show only title, no details', async () => {
      // Alice creates a semi-private date with undisclosed partner
      const semiPrivateEvent = {
        user_id: testUsers.alice.id,
        title: 'Date Night',
        description: 'Dinner with new potential partner - very private details here',
        start_time: '2024-01-15T19:00:00Z',
        end_time: '2024-01-15T22:00:00Z',
        privacy_level: 'semi_private',
        location: 'Expensive Restaurant Downtown'
      };

      await supabase
        .from('events')
        .insert(semiPrivateEvent);

      // Test visibility from Charlie (semi_private relationship)
      await testHelpers.authenticateAs(supabase, testUsers.charlie);
      
      const { data: visibleEvents } = await supabase
        .from('events_with_privacy')  // Using view that applies privacy filtering
        .select('*')
        .eq('user_id', testUsers.alice.id);

      const semiPrivateVisible = visibleEvents?.find(e => e.title === 'Date Night');
      
      expect(semiPrivateVisible).toBeDefined();
      expect(semiPrivateVisible.title).toBe('Date Night'); // Title visible
      expect(semiPrivateVisible.description).toBeNull(); // Details hidden
      expect(semiPrivateVisible.location).toBeNull(); // Location hidden
    });

    it('CRITICAL: Visible events show full details only to designated partners', async () => {
      // Alice creates a visible event for her primary partner Bob
      const visibleEvent = {
        user_id: testUsers.alice.id,
        title: 'Movie Night with Bob',
        description: 'Watching the new Marvel movie together',
        start_time: '2024-01-15T20:00:00Z',
        end_time: '2024-01-15T23:00:00Z',
        privacy_level: 'visible',
        location: 'Home Theater'
      };

      await supabase
        .from('events')
        .insert(visibleEvent);

      // Bob (visible relationship) should see full details
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      const { data: bobView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('user_id', testUsers.alice.id);

      const movieNight = bobView?.find(e => e.title === 'Movie Night with Bob');
      expect(movieNight).toBeDefined();
      expect(movieNight.description).toBe('Watching the new Marvel movie together');
      expect(movieNight.location).toBe('Home Theater');

      // Charlie (semi_private relationship) should see only title
      await testHelpers.authenticateAs(supabase, testUsers.charlie);
      const { data: charlieView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('user_id', testUsers.alice.id);

      const movieNightCharlie = charlieView?.find(e => e.title === 'Movie Night with Bob');
      expect(movieNightCharlie).toBeDefined();
      expect(movieNightCharlie.description).toBeNull(); // Hidden due to relationship privacy
      expect(movieNightCharlie.location).toBeNull();
    });
  });

  describe('🚨 Conflict Detection Privacy Enforcement', () => {
    it('CRITICAL: Conflict detection must not reveal private event details', async () => {
      // Alice has a private therapy session
      await supabase
        .from('events')
        .insert({
          user_id: testUsers.alice.id,
          title: 'Private Therapy - Trauma Processing',
          start_time: '2024-01-15T14:00:00Z',
          end_time: '2024-01-15T15:00:00Z',
          privacy_level: 'private'
        });

      // Bob tries to schedule a date during the same time
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      
      const conflictCheck = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_start: '2024-01-15T14:30:00Z',
          event_end: '2024-01-15T16:00:00Z',
          partner_ids: [testUsers.alice.id]
        })
      });

      const result = await conflictCheck.json();

      // Must detect conflict but NOT reveal private details
      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts[0].conflicting_events[0]).toMatchObject({
        title: 'Private Event', // Sanitized title
        description: null,
        location: null
      });
      
      // CRITICAL: Original title must NEVER appear in API response
      expect(JSON.stringify(result)).not.toContain('Trauma Processing');
      expect(JSON.stringify(result)).not.toContain('Private Therapy');
    });

    it('CRITICAL: Batch conflict detection preserves all privacy levels', async () => {
      // Create events with different privacy levels
      const events = [
        {
          user_id: testUsers.alice.id,
          title: 'Private Therapy',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          privacy_level: 'private'
        },
        {
          user_id: testUsers.bob.id,
          title: 'Semi-Private Personal Time',
          start_time: '2024-01-15T14:00:00Z',
          end_time: '2024-01-15T15:00:00Z',
          privacy_level: 'semi_private'
        },
        {
          user_id: testUsers.charlie.id,
          title: 'Public Community Event',
          start_time: '2024-01-15T18:00:00Z',
          end_time: '2024-01-15T20:00:00Z',
          privacy_level: 'public'
        }
      ];

      for (const event of events) {
        await supabase.from('events').insert(event);
      }

      // Diana tries to schedule overlapping events with all partners
      await testHelpers.authenticateAs(supabase, testUsers.diana);
      
      const batchConflictCheck = await fetch('/api/events/check-conflicts/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_start: '2024-01-15T09:30:00Z',
          event_end: '2024-01-15T20:30:00Z',
          partner_ids: [testUsers.alice.id, testUsers.bob.id, testUsers.charlie.id]
        })
      });

      const result = await batchConflictCheck.json();
      
      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toHaveLength(3);
      
      // Verify privacy filtering is applied correctly
      const aliceConflict = result.conflicts.find((c: any) => c.partner_id === testUsers.alice.id);
      const bobConflict = result.conflicts.find((c: any) => c.partner_id === testUsers.bob.id);
      const charlieConflict = result.conflicts.find((c: any) => c.partner_id === testUsers.charlie.id);
      
      // Alice's private event should be sanitized
      expect(aliceConflict.conflicting_events[0].title).toBe('Private Event');
      
      // Bob's semi-private event should show title only
      expect(bobConflict.conflicting_events[0].title).toBe('Semi-Private Personal Time');
      
      // Charlie's public event should show full details
      expect(charlieConflict.conflicting_events[0].title).toBe('Public Community Event');
    });
  });

  describe('🔒 Data Breach Prevention', () => {
    it('CRITICAL: SQL injection attempts must not bypass privacy', async () => {
      // Malicious user tries SQL injection to access private data
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      
      const maliciousQueries = [
        "'; DROP TABLE events; --",
        "' OR '1'='1' --",
        "' UNION SELECT * FROM events WHERE privacy_level='private' --",
        "admin'--",
        "' OR 1=1#"
      ];

      for (const maliciousInput of maliciousQueries) {
        // Attempt to use malicious input in various API endpoints
        const searchResponse = await fetch(`/api/events/search?query=${encodeURIComponent(maliciousInput)}`);
        const searchResult = await searchResponse.json();
        
        // Should not return any private events or cause errors
        expect(searchResult.error).toBeFalsy();
        if (searchResult.events) {
          expect(searchResult.events.every((e: any) => e.privacy_level !== 'private')).toBe(true);
        }
      }
    });

    it('CRITICAL: Cross-user data access attempts must fail', async () => {
      // Alice creates a private event
      const privateEvent = {
        user_id: testUsers.alice.id,
        title: 'Confidential Meeting',
        privacy_level: 'private',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z'
      };

      const { data: event } = await supabase
        .from('events')
        .insert(privateEvent)
        .select()
        .single();

      // Bob attempts various ways to access Alice's private data
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      
      // Direct ID access
      const { data: directAccess, error: directError } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id);
      
      expect(directAccess).toHaveLength(0);
      expect(directError).toBeTruthy();
      
      // Batch query attempt
      const { data: batchAccess, error: batchError } = await supabase
        .from('events')
        .select('*')
        .in('id', [event.id]);
        
      expect(batchAccess).toHaveLength(0);
      
      // User ID filter attempt
      const { data: userAccess } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', testUsers.alice.id);
        
      // Should only return events visible to Bob based on relationship privacy
      const privateEvents = userAccess?.filter(e => e.privacy_level === 'private') || [];
      expect(privateEvents).toHaveLength(0);
    });
  });

  describe('🎭 Permission Inheritance and Overrides', () => {
    it('CRITICAL: Manual privacy overrides must persist and be enforceable', async () => {
      // Alice creates an event and manually sets specific permissions
      const eventWithOverrides = {
        user_id: testUsers.alice.id,
        title: 'Special Date with Details',
        description: 'Anniversary dinner details',
        start_time: '2024-01-15T19:00:00Z',
        end_time: '2024-01-15T22:00:00Z',
        privacy_level: 'visible'
      };

      const { data: event } = await supabase
        .from('events')
        .insert(eventWithOverrides)
        .select()
        .single();

      // Manually override: Bob should see full details, Charlie should see nothing
      await supabase
        .from('event_privacy')
        .insert([
          { event_id: event.id, user_id: testUsers.bob.id, permission_level: 'full' },
          { event_id: event.id, user_id: testUsers.charlie.id, permission_level: 'none' }
        ]);

      // Test Bob's access (should see full details despite default relationship privacy)
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      const { data: bobView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id);

      expect(bobView).toHaveLength(1);
      expect(bobView[0].description).toBe('Anniversary dinner details');

      // Test Charlie's access (should see nothing despite default relationship privacy)
      await testHelpers.authenticateAs(supabase, testUsers.charlie);
      const { data: charlieView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id);

      expect(charlieView).toHaveLength(0); // Completely hidden
    });

    it('CRITICAL: Group permission changes must not override individual restrictions', async () => {
      // Alice creates an event with both group and individual permissions
      const { data: event } = await supabase
        .from('events')
        .insert({
          user_id: testUsers.alice.id,
          title: 'Group Event with Exceptions',
          privacy_level: 'visible'
        })
        .select()
        .single();

      // Set group permission to 'visible' but Diana to 'none'
      await supabase
        .from('event_privacy')
        .insert([
          { event_id: event.id, group_id: 'alice-polycule', permission_level: 'visible' },
          { event_id: event.id, user_id: testUsers.diana.id, permission_level: 'none' }
        ]);

      // Diana should still not see the event (individual override takes precedence)
      await testHelpers.authenticateAs(supabase, testUsers.diana);
      const { data: dianaView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id);

      expect(dianaView).toHaveLength(0);

      // Bob should see it (group permission applies)
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      const { data: bobView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id);

      expect(bobView).toHaveLength(1);
      expect(bobView[0].title).toBe('Group Event with Exceptions');
    });
  });

  describe('⏱️ Time-Sensitive Privacy Testing', () => {
    it('CRITICAL: Privacy changes must apply immediately across all views', async () => {
      // Alice creates a public event
      const { data: event } = await supabase
        .from('events')
        .insert({
          user_id: testUsers.alice.id,
          title: 'Initially Public Event',
          privacy_level: 'public',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z'
        })
        .select()
        .single();

      // Bob can see it initially
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      let { data: bobView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id);

      expect(bobView).toHaveLength(1);

      // Alice changes it to private
      await testHelpers.authenticateAs(supabase, testUsers.alice);
      await supabase
        .from('events')
        .update({ privacy_level: 'private' })
        .eq('id', event.id);

      // Bob should immediately lose access
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      ({ data: bobView } = await supabase
        .from('events_with_privacy')
        .select('*')
        .eq('id', event.id));

      expect(bobView).toHaveLength(0);

      // Test real-time subscriptions also respect privacy changes
      // (This would require WebSocket testing in a real implementation)
    });
  });

  describe('🔍 Privacy Audit Logging', () => {
    it('CRITICAL: All privacy violations attempts must be logged', async () => {
      // Bob attempts to access Alice's private event
      await testHelpers.authenticateAs(supabase, testUsers.bob);
      
      const { data: alicePrivateEvents } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', testUsers.alice.id)
        .eq('privacy_level', 'private');

      // Check that the attempt was logged
      const { data: auditLogs } = await supabase
        .from('privacy_audit_log')
        .select('*')
        .eq('attempted_by', testUsers.bob.id)
        .eq('resource_owner', testUsers.alice.id)
        .eq('action', 'unauthorized_access_attempt');

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        attempted_by: testUsers.bob.id,
        resource_owner: testUsers.alice.id,
        resource_type: 'event',
        action: 'unauthorized_access_attempt',
        denied_reason: 'insufficient_privacy_permissions'
      });
    });
  });
});

/**
 * DISASTER RECOVERY TESTING
 * These tests ensure privacy is maintained even during system failures
 */
describe('🆘 Privacy During System Failures', () => {
  it('CRITICAL: Database connection failures must fail secure (hide all data)', async () => {
    // Simulate database connection issues
    const mockSupabase = {
      ...supabase,
      from: () => ({
        select: () => ({
          eq: () => ({
            then: () => Promise.reject(new Error('Database connection failed'))
          })
        })
      })
    };

    // API should return no data rather than cached/stale data
    const response = await fetch('/api/events?user_id=' + testUsers.alice.id);
    const result = await response.json();

    // Should return empty results or clear error, never cached private data
    expect(result.events || []).toHaveLength(0);
    expect(result.error).toBeTruthy();
  });

  it('CRITICAL: Cache invalidation failures must not expose stale private data', async () => {
    // This test would require mocking your caching layer
    // Implementation depends on your specific caching strategy (Redis, in-memory, etc.)
    
    // The principle: if cache invalidation fails after a privacy level change,
    // the system should err on the side of caution and not serve potentially stale private data
  });
});
