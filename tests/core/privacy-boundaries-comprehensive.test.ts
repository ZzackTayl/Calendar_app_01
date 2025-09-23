/**
 * Comprehensive Privacy Boundary Tests
 * 
 * Tests the 4-level privacy system with realistic scenarios:
 * - Private: Only user can see
 * - Semi-Private: Limited visibility  
 * - Visible: Connected relationships can see details
 * - Public: Everyone can see
 * 
 * These tests validate the CRITICAL privacy boundary enforcement
 * that prevents private data leakage across relationships.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestHelpers } from '@/tests/helpers';
import { MockDataFactory, mockState } from '@/tests/mocks';
import type { Event, PrivacyLevel } from '@/lib/supabase/types';

describe('Privacy Boundaries - Comprehensive Testing', () => {
  beforeEach(async () => {
    await TestHelpers.cleanupTestData();
  });

  describe('4-Level Privacy System Enforcement', () => {
    it('should enforce private events are completely hidden from partners', async () => {
      // Arrange: Create privacy scenario with multiple partners
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      
      // Create private events with sensitive information
      const privateEvents = [
        MockDataFactory.createEvent({
          user_id: 'center-user',
          title: 'STI Testing Appointment',
          description: 'HIV test at clinic - bring insurance card',
          location: '123 Medical Plaza, Suite 400, Confidential Clinic',
          privacy_level: 'private',
        }),
        MockDataFactory.createEvent({
          user_id: 'center-user', 
          title: 'Therapy Session',
          description: 'Individual therapy for anxiety and relationship issues',
          location: 'Dr. Smith Therapy Office, Downtown',
          privacy_level: 'private',
        }),
      ];

      privateEvents.forEach(event => mockState.setEvent(event));

      // Act: Test privacy boundaries from different partner perspectives
      const primaryPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        privateEvents, 
        'primary-partner', 
        'center-user'
      );

      const secondaryPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        privateEvents,
        'secondary-partner',
        'center-user'
      );

      const casualPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        privateEvents,
        'casual-partner', 
        'center-user'
      );

      // Assert: Private events should be completely filtered for all partners
      privateEvents.forEach((_, index) => {
        // Primary partner should not see private details
        expect(primaryPartnerView[index].privacy_applied).toBe(true);
        expect(primaryPartnerView[index].filtered.title).toBe('Busy');
        expect(primaryPartnerView[index].filtered.description).toBeNull();
        expect(primaryPartnerView[index].filtered.location).toBeNull();

        // Secondary partner should not see private details
        expect(secondaryPartnerView[index].privacy_applied).toBe(true);
        expect(secondaryPartnerView[index].filtered.title).toBe('Busy');
        expect(secondaryPartnerView[index].filtered.description).toBeNull();

        // Casual partner should not see private details
        expect(casualPartnerView[index].privacy_applied).toBe(true);
        expect(casualPartnerView[index].filtered.title).toBe('Busy');
        expect(casualPartnerView[index].filtered.description).toBeNull();
      });
    });

    it('should allow visible events to be seen by connected relationships', async () => {
      // Arrange: Create scenario with visible events
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      
      const visibleEvents = [
        MockDataFactory.createEvent({
          user_id: 'center-user',
          title: 'Coffee Date Downtown',
          description: 'Meeting at the new cafe on 5th street',
          location: 'Downtown Coffee Shop',
          privacy_level: 'visible',
        }),
        MockDataFactory.createEvent({
          user_id: 'center-user',
          title: 'Movie Night',
          description: 'Watching the new sci-fi movie',
          location: 'Home',
          privacy_level: 'visible',
        }),
      ];

      visibleEvents.forEach(event => mockState.setEvent(event));

      // Act: Test visibility for partners with appropriate permissions
      const primaryPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        visibleEvents,
        'primary-partner',
        'center-user'
      );

      const friendPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        visibleEvents,
        'friend-partner', 
        'center-user'
      );

      // Assert: Visible events should be seen by connected relationships
      visibleEvents.forEach((originalEvent, index) => {
        // Primary partner (visible relationship) should see details
        expect(primaryPartnerView[index].privacy_applied).toBe(false);
        expect(primaryPartnerView[index].filtered.title).toBe(originalEvent.title);
        expect(primaryPartnerView[index].filtered.description).toBe(originalEvent.description);
        expect(primaryPartnerView[index].filtered.location).toBe(originalEvent.location);

        // Friend partner (visible relationship) should see details  
        expect(friendPartnerView[index].privacy_applied).toBe(false);
        expect(friendPartnerView[index].filtered.title).toBe(originalEvent.title);
        expect(friendPartnerView[index].filtered.description).toBe(originalEvent.description);
      });
    });

    it('should handle semi-private events with limited visibility', async () => {
      // Arrange: Create scenario with semi-private events
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      
      const semiPrivateEvents = [
        MockDataFactory.createEvent({
          user_id: 'center-user',
          title: 'Date Night',
          description: 'Dinner with someone special',
          location: 'Nice Restaurant',
          privacy_level: 'semi_private',
        }),
      ];

      semiPrivateEvents.forEach(event => mockState.setEvent(event));

      // Act: Test semi-private visibility
      const secondaryPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        semiPrivateEvents,
        'secondary-partner',
        'center-user'
      );

      const casualPartnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        semiPrivateEvents,
        'casual-partner',
        'center-user'
      );

      // Assert: Semi-private events should have limited visibility
      // Secondary partner (semi_private relationship) might see limited info
      expect(secondaryPartnerView[0].viewer_can_see_details).toBe(false);
      
      // Casual partner (private relationship) should not see details
      expect(casualPartnerView[0].privacy_applied).toBe(true);
      expect(casualPartnerView[0].filtered.title).toBe('Busy');
    });

    it('should allow public events to be visible to everyone', async () => {
      // Arrange: Create public events
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      
      const publicEvents = [
        MockDataFactory.createEvent({
          user_id: 'center-user',
          title: 'Community Event',
          description: 'Public volunteer work at the community center',
          location: 'Community Center',
          privacy_level: 'public',
        }),
      ];

      publicEvents.forEach(event => mockState.setEvent(event));

      // Act: Test public visibility for all partner types
      const allPartnerTypes = ['primary-partner', 'secondary-partner', 'casual-partner', 'friend-partner'];
      
      const allViews = allPartnerTypes.map(partnerId => 
        TestHelpers.privacy.testEventPrivacyBoundaries(publicEvents, partnerId, 'center-user')
      );

      // Assert: Public events should be visible to all partners
      allViews.forEach((partnerView, partnerIndex) => {
        expect(partnerView[0].privacy_applied).toBe(false);
        expect(partnerView[0].filtered.title).toBe(publicEvents[0].title);
        expect(partnerView[0].filtered.description).toBe(publicEvents[0].description);
        expect(partnerView[0].filtered.location).toBe(publicEvents[0].location);
      });
    });
  });

  describe('Privacy Cascade Through Polycule Network', () => {
    it('should properly cascade privacy settings through complex polycule', async () => {
      // Arrange: Create complex polycule network
      const network = MockDataFactory.createPolyculeNetwork('center-user', 6);
      
      // Add network to mock state
      network.users.forEach(user => mockState.setUser(user));
      network.relationships.forEach(rel => mockState.setRelationship(rel));
      network.events.forEach(event => mockState.setEvent(event));

      // Act: Test privacy cascade validation
      const cascadeResults = TestHelpers.privacy.validatePolyculePrivacyCascade('center-user');

      // Assert: Privacy levels should cascade appropriately
      expect(cascadeResults).toBeDefined();
      expect(cascadeResults.length).toBeGreaterThan(0);

      // Primary relationships should be able to see some secondary relationships
      const primaryToSecondary = cascadeResults.filter(result => 
        // Primary relationships have connection tier 'details' in our mock factory
        result.connection_tier === 'details' && result.privacy_level === 'visible'
      );

      expect(primaryToSecondary.length).toBeGreaterThan(0);

      // Private relationships should not be visible to others
      const privateRelationships = cascadeResults.filter(result => 
        result.privacy_level === 'private'
      );

      privateRelationships.forEach(result => {
        expect(result.can_see).toBe(false);
      });
    });

    it('should prevent metamour access to private information', async () => {
      // Arrange: Create scenario with metamours (partners of partners)
      const scenario = TestHelpers.privacy.createPrivacyScenario('center-user');
      
      // Create private event for primary partner
      const primaryPartnerPrivateEvent = MockDataFactory.createEvent({
        user_id: 'primary-partner',
        title: 'Medical Appointment',
        description: 'Personal medical issue - confidential',
        privacy_level: 'private',
      });

      mockState.setEvent(primaryPartnerPrivateEvent);

      // Act: Test if secondary partner (metamour) can see primary partner's private event
      const metamourView = TestHelpers.privacy.testEventPrivacyBoundaries(
        [primaryPartnerPrivateEvent],
        'secondary-partner',
        'primary-partner'
      );

      // Assert: Metamours should not see private events of other partners
      expect(metamourView[0].privacy_applied).toBe(true);
      expect(metamourView[0].filtered.title).toBe('Busy');
      expect(metamourView[0].filtered.description).toBeNull();
      expect(metamourView[0].filtered.location).toBeNull();
    });
  });

  describe('Privacy Boundary Edge Cases', () => {
    it('should handle users with no relationships attempting access', async () => {
      // Arrange: Create events for a user
      const isolatedUser = MockDataFactory.createUser({ id: 'isolated-user' });
      mockState.setUser(isolatedUser);

      const events = MockDataFactory.createPrivacyTestEvents('isolated-user');
      events.forEach(event => mockState.setEvent(event));

      // Create unconnected viewer
      const unconnectedUser = MockDataFactory.createUser({ id: 'unconnected-user' });
      mockState.setUser(unconnectedUser);

      // Act: Test access from unconnected user
      const unconnectedView = TestHelpers.privacy.testEventPrivacyBoundaries(
        events,
        'unconnected-user',
        'isolated-user'
      );

      // Assert: Unconnected users should only see public events
      const privateEvents = unconnectedView.filter((_, index) => events[index].privacy_level === 'private');
      const publicEvents = unconnectedView.filter((_, index) => events[index].privacy_level === 'public');

      privateEvents.forEach(view => {
        expect(view.privacy_applied).toBe(true);
        expect(view.filtered.title).toBe('Busy');
      });

      publicEvents.forEach(view => {
        expect(view.privacy_applied).toBe(false);
      });
    });

    it('should handle transitioning privacy levels correctly', async () => {
      // Arrange: Create relationship that changes privacy levels
      const user1 = MockDataFactory.createUser({ id: 'user-1' });
      const user2 = MockDataFactory.createUser({ id: 'user-2' });
      
      mockState.setUser(user1);
      mockState.setUser(user2);

      // Initial relationship with visible privacy
      let relationship = MockDataFactory.createRelationship({
        user_id: 'user-1',
        partner_id: 'user-2',
        privacy_level: 'visible',
      });

      mockState.setRelationship(relationship);

      const testEvent = MockDataFactory.createEvent({
        user_id: 'user-1',
        privacy_level: 'visible',
        title: 'Visible Event',
      });

      mockState.setEvent(testEvent);

      // Act & Assert: Test visibility before privacy change
      let beforeView = TestHelpers.privacy.testEventPrivacyBoundaries(
        [testEvent],
        'user-2',
        'user-1'
      );

      expect(beforeView[0].privacy_applied).toBe(false);

      // Change relationship privacy to private
      relationship.privacy_level = 'private';
      mockState.setRelationship(relationship);

      // Act & Assert: Test visibility after privacy change
      let afterView = TestHelpers.privacy.testEventPrivacyBoundaries(
        [testEvent],
        'user-2', 
        'user-1'
      );

      expect(afterView[0].privacy_applied).toBe(true);
      expect(afterView[0].filtered.title).toBe('Busy');
    });

    it('should validate privacy settings with encrypted data', async () => {
      // Arrange: Create events with encrypted sensitive data
      const encryptionScenarios = TestHelpers.encryption.testSensitiveFieldEncryption();
      
      const user = MockDataFactory.createUser({ id: 'encryption-user' });
      mockState.setUser(user);

      // Create events with different privacy levels and encrypted data
      const encryptedPrivateEvent = MockDataFactory.createEvent({
        user_id: 'encryption-user',
        title: 'Private Medical',
        description: encryptionScenarios.testData.privateEventDescription,
        location: encryptionScenarios.testData.sensitiveLocation,
        privacy_level: 'private',
      });

      const encryptedPublicEvent = MockDataFactory.createEvent({
        user_id: 'encryption-user',
        title: 'Public Meeting',
        description: encryptionScenarios.testData.publicEventDescription,
        location: encryptionScenarios.testData.genericLocation,
        privacy_level: 'public',
      });

      mockState.setEvent(encryptedPrivateEvent);
      mockState.setEvent(encryptedPublicEvent);

      // Create viewing partner
      const partner = MockDataFactory.createUser({ id: 'viewing-partner' });
      mockState.setUser(partner);

      const relationship = MockDataFactory.createRelationship({
        user_id: 'encryption-user',
        partner_id: 'viewing-partner',
        privacy_level: 'visible',
      });

      mockState.setRelationship(relationship);

      // Act: Test privacy boundaries with encrypted data
      const partnerView = TestHelpers.privacy.testEventPrivacyBoundaries(
        [encryptedPrivateEvent, encryptedPublicEvent],
        'viewing-partner',
        'encryption-user'
      );

      // Assert: Privacy should be enforced even with encrypted data
      expect(partnerView[0].privacy_applied).toBe(true); // Private event hidden
      expect(partnerView[0].filtered.title).toBe('Busy');
      expect(partnerView[0].filtered.description).toBeNull();
      
      expect(partnerView[1].privacy_applied).toBe(false); // Public event visible
      expect(partnerView[1].filtered.title).toBe(encryptedPublicEvent.title);
    });
  });

  describe('Performance Requirements', () => {
    it('should process privacy boundaries within performance requirements', async () => {
      // Arrange: Create large dataset for performance testing
      const largeNetwork = MockDataFactory.createPolyculeNetwork('perf-center', 10);
      
      // Add many events to test performance
      const manyEvents: Event[] = [];
      for (let i = 0; i < 100; i++) {
        manyEvents.push(MockDataFactory.createEvent({
          user_id: 'perf-center',
          privacy_level: (i % 4) === 0 ? 'private' : 'visible',
        }));
      }

      // Add to mock state
      largeNetwork.users.forEach(user => mockState.setUser(user));
      largeNetwork.relationships.forEach(rel => mockState.setRelationship(rel));
      manyEvents.forEach(event => mockState.setEvent(event));

      // Act: Measure privacy boundary processing time
      const startTime = Date.now();
      
      const results = TestHelpers.privacy.testEventPrivacyBoundaries(
        manyEvents,
        largeNetwork.relationships[0].partner_id!,
        'perf-center'
      );
      
      const processingTime = Date.now() - startTime;

      // Assert: Privacy processing should be fast (sub-100ms for this size)
      expect(processingTime).toBeLessThan(100);
      expect(results).toHaveLength(100);
      
      // Verify correct privacy application
      const privateEventResults = results.filter((_, index) => manyEvents[index].privacy_level === 'private');
      privateEventResults.forEach(result => {
        expect(result.privacy_applied).toBe(true);
      });
    });
  });
});
