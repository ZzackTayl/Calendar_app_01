/**
 * Test Helpers and Utilities for PolyHarmony Calendar
 * 
 * This module provides comprehensive test helpers for all key app features:
 * 
 * - Privacy boundary testing helpers
 * - Encryption/decryption test utilities
 * - Relationship scenario builders
 * - Event creation and conflict testing
 * - Calendar integration testing
 * - Performance testing utilities
 * - Database test helpers
 * - Authentication test helpers
 * 
 * Usage:
 * import { TestHelpers } from '@/tests/helpers';
 * const scenario = TestHelpers.privacy.createPrivacyScenario();
 */

import { vi } from 'vitest';
import { MockDataFactory, mockState } from '../mocks';
import type {
  User,
  Relationship,
  Event,
  PrivacyLevel,
  ConnectionTier,
  RelationshipType
} from '@/lib/supabase/types';

// ===================================================================
// PRIVACY TESTING HELPERS
// ===================================================================

export class PrivacyTestHelpers {
  /**
   * Creates a comprehensive privacy testing scenario with multiple users and relationships
   */
  static createPrivacyScenario(centerUserId = 'center-user') {
    // Reset state for clean test
    mockState.reset();
    
    // Create center user
    const centerUser = MockDataFactory.createUser({ id: centerUserId });
    mockState.setUser(centerUser);
    
    // Create partners with different privacy levels
    const primaryPartner = MockDataFactory.createUser({ id: 'primary-partner' });
    const secondaryPartner = MockDataFactory.createUser({ id: 'secondary-partner' });
    const casualPartner = MockDataFactory.createUser({ id: 'casual-partner' });
    const friendPartner = MockDataFactory.createUser({ id: 'friend-partner' });
    
    [primaryPartner, secondaryPartner, casualPartner, friendPartner].forEach(user => {
      mockState.setUser(user);
    });
    
    // Create relationships with different privacy levels
    const relationships = [
      MockDataFactory.createRelationship({
        user_id: centerUserId,
        partner_id: primaryPartner.id,
        partner_name: primaryPartner.full_name,
        relationship_type: 'primary',
        privacy_level: 'visible',
        connection_tier: 'details',
      }),
      MockDataFactory.createRelationship({
        user_id: centerUserId,
        partner_id: secondaryPartner.id,
        partner_name: secondaryPartner.full_name,
        relationship_type: 'secondary',
        privacy_level: 'semi_private',
        connection_tier: 'busy_only',
      }),
      MockDataFactory.createRelationship({
        user_id: centerUserId,
        partner_id: casualPartner.id,
        partner_name: casualPartner.full_name,
        relationship_type: 'casual',
        privacy_level: 'private',
        connection_tier: 'private',
      }),
      MockDataFactory.createRelationship({
        user_id: centerUserId,
        partner_id: friendPartner.id,
        partner_name: friendPartner.full_name,
        relationship_type: 'friendship',
        privacy_level: 'visible',
        connection_tier: 'details',
      }),
    ];
    
    relationships.forEach(rel => mockState.setRelationship(rel));
    
    // Create events with different privacy levels for each user
    const events = [
      // Center user events
      MockDataFactory.createEvent({
        user_id: centerUserId,
        title: 'Private Medical Appointment',
        description: 'STI testing - confidential',
        privacy_level: 'private',
        location: '123 Medical Plaza, Suite 400',
      }),
      MockDataFactory.createEvent({
        user_id: centerUserId,
        title: 'Coffee with Friends',
        description: 'Casual meetup at local cafe',
        privacy_level: 'visible',
        location: 'Coffee Shop Downtown',
      }),
      
      // Primary partner events
      MockDataFactory.createEvent({
        user_id: primaryPartner.id,
        title: 'Work Meeting',
        privacy_level: 'visible',
        relationship_id: relationships[0].id,
      }),
      MockDataFactory.createEvent({
        user_id: primaryPartner.id,
        title: 'Therapy Session',
        description: 'Individual therapy appointment',
        privacy_level: 'private',
        location: 'Wellness Center',
      }),
      
      // Secondary partner events
      MockDataFactory.createEvent({
        user_id: secondaryPartner.id,
        title: 'Dinner Plans',
        privacy_level: 'semi_private',
        relationship_id: relationships[1].id,
      }),
    ];
    
    events.forEach(event => mockState.setEvent(event));
    
    return {
      users: {
        center: centerUser,
        primary: primaryPartner,
        secondary: secondaryPartner,
        casual: casualPartner,
        friend: friendPartner,
      },
      relationships: {
        primary: relationships[0],
        secondary: relationships[1],
        casual: relationships[2],
        friend: relationships[3],
      },
      events,
    };
  }
  
  /**
   * Tests privacy boundary enforcement for events
   */
  static testEventPrivacyBoundaries(events: Event[], viewerUserId: string, ownerUserId: string) {
    return events.map(event => {
      const isOwner = event.user_id === viewerUserId;
      const shouldSeeDetails = isOwner || this.canSeeEventDetails(viewerUserId, event);
      
      return {
        original: event,
        filtered: {
          ...event,
          title: shouldSeeDetails ? event.title : 'Busy',
          description: shouldSeeDetails ? event.description : null,
          location: shouldSeeDetails ? event.location : null,
        },
        privacy_applied: !shouldSeeDetails,
        viewer_can_see_details: shouldSeeDetails,
      };
    });
  }
  
  private static canSeeEventDetails(viewerUserId: string, event: Event): boolean {
    // Public events are always visible
    if (event.privacy_level === 'public') return true;
    // Owner-only events are never visible to others
    if (event.privacy_level === 'private') return false;

    // Check direct relationship between viewer and event owner
    const relationships = mockState.getUserRelationships(event.user_id);
    const viewerRelationship = relationships.find(rel => rel.partner_id === viewerUserId);

    if (!viewerRelationship) return false;

    // Details are only visible when the relationship privacy allows details
    // AND the connection tier is 'details'.
    // This ensures that switching a relationship to 'private' immediately hides details,
    // even if the connection tier remains 'details'.
    const relAllowsDetails = viewerRelationship.privacy_level === 'visible';
    const connectionAllowsDetails = viewerRelationship.connection_tier === 'details';

    return relAllowsDetails && connectionAllowsDetails;
  }
  
  /**
   * Validates that privacy levels cascade correctly through polycule
   */
  static validatePolyculePrivacyCascade(centerUserId: string) {
    const relationships = mockState.getUserRelationships(centerUserId);
    const results: any[] = [];
    
    relationships.forEach(primaryRel => {
      // Check if primary partner can see other relationships
      const otherRelationships = relationships.filter(rel => rel.id !== primaryRel.id);
      
      otherRelationships.forEach(otherRel => {
        const canSeeOther = this.canSeeRelationship(primaryRel.partner_id!, otherRel);
        results.push({
          // Expose stable identifier for tests that filter by viewer id
          viewer: primaryRel.partner_id,
          target: otherRel.partner_name,
          can_see: canSeeOther,
          privacy_level: otherRel.privacy_level,
          connection_tier: otherRel.connection_tier,
        });
      });
    });
    
    return results;
  }
  
  private static canSeeRelationship(viewerId: string, relationship: Relationship): boolean {
    // Simplified relationship visibility logic
    return relationship.privacy_level === 'visible' || relationship.privacy_level === 'public';
  }
}

// ===================================================================
// ENCRYPTION TESTING HELPERS
// ===================================================================

export class EncryptionTestHelpers {
  /**
   * Tests encryption of all sensitive fields
   */
  static testSensitiveFieldEncryption() {
    const testData = {
      phoneNumber: '(555) 123-4567',
      privateEventDescription: 'STI testing appointment - bring insurance card',
      sensitiveLocation: '123 Medical Plaza, Suite 400, Confidential Clinic',
      privateNotes: 'Partner has anxiety about medical appointments, be supportive',
      publicEventDescription: 'Team lunch meeting',
      genericLocation: 'Coffee Shop',
    };
    
    return {
      testData,
      shouldEncrypt: {
        phoneNumber: true,
        privateEventDescription: true, // if privacy_level is 'private'
        sensitiveLocation: true, // contains medical/address keywords
        privateNotes: true,
        publicEventDescription: false, // if privacy_level is not 'private'
        genericLocation: false, // generic location
      },
    };
  }
  
  /**
   * Creates encryption test scenarios with various data types
   */
  static createEncryptionScenarios() {
    return {
      phoneNumbers: [
        '(555) 123-4567',
        '+1-555-123-4567',
        '555.123.4567',
        '5551234567',
      ],
      sensitiveLocations: [
        '123 Main St, Apt 4B, San Francisco, CA',
        'Dr. Smith Medical Clinic',
        'Home',
        'Therapist Office - Downtown',
        '456 Therapy Lane, Suite 200',
      ],
      genericLocations: [
        'Coffee Shop',
        'Restaurant',
        'Park',
        'Library',
        'Beach',
      ],
      privateDescriptions: [
        'HIV medication pickup',
        'Couples therapy session about jealousy',
        'STI testing - annual checkup',
        'Mental health appointment',
        'Private medical consultation',
      ],
      publicDescriptions: [
        'Team meeting',
        'Lunch date',
        'Movie night',
        'Study session',
        'Coffee meetup',
      ],
    };
  }
  
  /**
   * Validates encryption/decryption round trip
   */
  static validateEncryptionRoundTrip(originalData: string, encrypted: string, decrypted: string) {
    return {
      original: originalData,
      encrypted: encrypted,
      decrypted: decrypted,
      is_encrypted: encrypted !== originalData && encrypted.includes(':'),
      round_trip_successful: originalData === decrypted,
      encryption_format_valid: this.isValidEncryptionFormat(encrypted),
    };
  }
  
  private static isValidEncryptionFormat(encrypted: string): boolean {
    // Check if follows expected format: encrypted:base64:timestamp or similar
    return /^encrypted:[A-Za-z0-9+/=]+:\d+$/.test(encrypted);
  }
}

// ===================================================================
// CONFLICT DETECTION TESTING HELPERS
// ===================================================================

export class ConflictDetectionTestHelpers {
  /**
   * Creates realistic conflict scenarios for testing
   */
  static createConflictScenarios(baseTime: string = new Date().toISOString()) {
    const baseDate = new Date(baseTime);
    
    return {
      // Hard overlapping events (complete overlap)
      hardOverlap: {
        event1: {
          start: baseDate.toISOString(),
          end: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        },
        event2: {
          start: baseDate.toISOString(),
          end: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        },
        expectedConflictType: 'hard_overlap',
        expectedOverlapMinutes: 120,
      },
      
      // Partial overlap
      partialOverlap: {
        event1: {
          start: baseDate.toISOString(),
          end: new Date(baseDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        },
        event2: {
          start: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
          end: new Date(baseDate.getTime() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours total
        },
        expectedConflictType: 'hard_overlap',
        expectedOverlapMinutes: 60,
      },
      
      // Buffer time conflict (15 minute buffer)
      bufferConflict: {
        event1: {
          start: baseDate.toISOString(),
          end: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
        },
        event2: {
          start: new Date(baseDate.getTime() + 70 * 60 * 1000).toISOString(), // 10 minutes later
          end: new Date(baseDate.getTime() + 130 * 60 * 1000).toISOString(),
        },
        bufferMinutes: 15,
        expectedConflictType: 'soft_buffer',
      },
      
      // No conflict (adequate buffer)
      noConflict: {
        event1: {
          start: baseDate.toISOString(),
          end: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
        },
        event2: {
          start: new Date(baseDate.getTime() + 90 * 60 * 1000).toISOString(), // 30 minutes later
          end: new Date(baseDate.getTime() + 150 * 60 * 1000).toISOString(),
        },
        bufferMinutes: 15,
        expectedConflict: false,
      },
    };
  }
  
  /**
   * Creates multi-partner conflict scenario for testing batch operations
   */
  static createMultiPartnerConflictScenario(partnerCount = 5, baseTime?: string) {
    const partners = [];
    const events = [];
    const conflicts = [];
    
    const testBaseTime = baseTime || new Date().toISOString();
    
    for (let i = 0; i < partnerCount; i++) {
      const partnerId = `partner-${i + 1}`;
      const partner = MockDataFactory.createUser({ id: partnerId });
      partners.push(partner);
      
      // Create overlapping events for some partners
      if (i % 2 === 0) { // Every other partner has conflicts
        const conflictEvent = MockDataFactory.createEvent({
          user_id: partnerId,
          start_time: testBaseTime,
          end_time: new Date(new Date(testBaseTime).getTime() + 90 * 60 * 1000).toISOString(),
          title: `Conflicting Meeting ${i + 1}`,
          privacy_level: i % 3 === 0 ? 'private' : 'visible', // Mix privacy levels
        });
        
        events.push(conflictEvent);
        conflicts.push({
          partner_id: partnerId,
          has_conflict: true,
          conflict_type: 'hard_overlap',
          privacy_filtered: conflictEvent.privacy_level === 'private',
        });
      }
    }
    
    return {
      partners,
      events,
      conflicts,
      request: {
        event_start: testBaseTime,
        event_end: new Date(new Date(testBaseTime).getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: partners.map(p => p.id),
        buffer_time_minutes: 15,
      },
    };
  }
  
  /**
   * Validates conflict detection performance requirements (sub-2 second)
   */
  static async validateConflictDetectionPerformance(
    conflictChecker: any, 
    request: any, 
    userId: string,
    maxResponseTimeMs = 2000
  ) {
    const startTime = Date.now();
    
    try {
      const result = await conflictChecker.checkBatch(request, userId);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      return {
        success: true,
        response_time_ms: responseTime,
        meets_requirement: responseTime <= maxResponseTimeMs,
        result,
        performance_metrics: result.performance_metrics,
      };
    } catch (error) {
      const endTime = Date.now();
      return {
        success: false,
        response_time_ms: endTime - startTime,
        meets_requirement: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// ===================================================================
// DATABASE TESTING HELPERS
// ===================================================================

export class DatabaseTestHelpers {
  /**
   * Sets up a clean test database state
   */
  static async setupCleanTestState() {
    mockState.reset();
    
    // Add any additional cleanup logic here
    return {
      users_cleared: true,
      relationships_cleared: true,
      events_cleared: true,
      groups_cleared: true,
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Creates a realistic test dataset
   */
  static createRealisticTestDataset() {
    const centerUserId = 'test-center-user';
    const network = MockDataFactory.createPolyculeNetwork(centerUserId, 6);
    
    // Add to mock state
    network.users.forEach(user => mockState.setUser(user));
    network.relationships.forEach(rel => mockState.setRelationship(rel));
    network.events.forEach(event => mockState.setEvent(event));
    network.groups.forEach(group => mockState.setGroup ? mockState.setGroup(group) : null);
    
    return {
      center_user_id: centerUserId,
      network,
      stats: {
        users: network.users.length,
        relationships: network.relationships.length,
        events: network.events.length,
        groups: network.groups.length,
      },
    };
  }
  
  /**
   * Validates data consistency across relationships
   */
  static validateDataConsistency() {
    const state = mockState.getState();
    const issues: string[] = [];
    
    // Check that all relationships reference valid users
    for (const relationship of state.relationships.values()) {
      if (!state.users.has(relationship.user_id)) {
        issues.push(`Relationship ${relationship.id} references non-existent user ${relationship.user_id}`);
      }
      if (relationship.partner_id && !state.users.has(relationship.partner_id)) {
        issues.push(`Relationship ${relationship.id} references non-existent partner ${relationship.partner_id}`);
      }
    }
    
    // Check that all events reference valid users
    for (const event of state.events.values()) {
      if (!state.users.has(event.user_id)) {
        issues.push(`Event ${event.id} references non-existent user ${event.user_id}`);
      }
      if (event.relationship_id && !state.relationships.has(event.relationship_id)) {
        issues.push(`Event ${event.id} references non-existent relationship ${event.relationship_id}`);
      }
    }
    
    return {
      is_consistent: issues.length === 0,
      issues,
      validation_timestamp: new Date().toISOString(),
    };
  }
}

// ===================================================================
// AUTHENTICATION TESTING HELPERS
// ===================================================================

export class AuthTestHelpers {
  /**
   * Creates authenticated test user session
   */
  static createAuthenticatedSession(userId = 'test-user-1') {
    const user = MockDataFactory.createUser({ id: userId });
    const session = MockDataFactory.createSession({ user });
    
    mockState.setUser(user);
    mockState.getState().sessions.set('test-session', session);
    
    return { user, session };
  }
  
  /**
   * Tests authentication flow scenarios
   */
  static createAuthenticationScenarios() {
    return {
      validCredentials: {
        email: 'test@example.com',
        password: 'correct-password',
        expectedSuccess: true,
      },
      invalidCredentials: {
        email: 'test@example.com',
        password: 'wrong-password',
        expectedSuccess: false,
      },
      unregisteredEmail: {
        email: 'nonexistent@example.com',
        password: 'any-password',
        expectedSuccess: false,
      },
    };
  }
  
  /**
   * Validates session state
   */
  static validateSessionState(expectedUserId?: string) {
    const sessions = mockState.getState().sessions;
    const hasActiveSession = sessions.size > 0;
    const activeSession = sessions.get('test-session');
    
    return {
      has_active_session: hasActiveSession,
      session: activeSession,
      user_matches: expectedUserId ? activeSession?.user?.id === expectedUserId : null,
      is_expired: activeSession ? Date.now() > activeSession.expires_at * 1000 : null,
    };
  }
}

// ===================================================================
// MAIN TEST HELPERS EXPORT
// ===================================================================

export class TestHelpers {
  static privacy = PrivacyTestHelpers;
  static encryption = EncryptionTestHelpers;
  static conflicts = ConflictDetectionTestHelpers;
  static database = DatabaseTestHelpers;
  static auth = AuthTestHelpers;
  
  /**
   * Cleanup all test data and state
   */
  static async cleanupTestData() {
    await DatabaseTestHelpers.setupCleanTestState();
    return {
      cleanup_completed: true,
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Create a full integration test scenario
   */
  static createIntegrationTestScenario() {
    const userId = 'integration-test-user';
    const { user, session } = AuthTestHelpers.createAuthenticatedSession(userId);
    const network = MockDataFactory.createPolyculeNetwork(userId, 4);
    const conflicts = ConflictDetectionTestHelpers.createMultiPartnerConflictScenario(3);
    
    return {
      auth: { user, session },
      network,
      conflicts,
      privacy: PrivacyTestHelpers.createPrivacyScenario(userId),
    };
  }
}

export default TestHelpers;
