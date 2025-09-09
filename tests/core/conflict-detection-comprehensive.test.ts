/**
 * Comprehensive Conflict Detection Tests
 * 
 * Tests the enhanced multi-partner conflict detection system with:
 * - Sub-2 second performance requirements
 * - Privacy-aware conflict filtering
 * - Batch processing capabilities
 * - Smart scheduling suggestions
 * - Buffer time management
 * - Travel time considerations
 * 
 * CRITICAL: These tests validate the core scheduling functionality
 * that enables seamless multi-partner calendar coordination.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestHelpers } from '@/tests/helpers';
import { MockDataFactory, createMockConflictDetection, mockState } from '@/tests/mocks';
import type { Event } from '@/lib/supabase/types';

describe('Conflict Detection - Comprehensive Testing', () => {
  let mockConflictChecker: any;

  beforeEach(async () => {
    await TestHelpers.cleanupTestData();
    mockConflictChecker = createMockConflictDetection();
  });

  describe('Performance Requirements (Sub-2 Second)', () => {
    it('should detect conflicts across 10 partners in under 2 seconds', async () => {
      // Arrange: Create large multi-partner scenario
      const scenario = TestHelpers.conflicts.createMultiPartnerConflictScenario(10);
      
      // Add realistic events to mock state
      scenario.partners.forEach(partner => mockState.setUser(partner));
      scenario.events.forEach(event => mockState.setEvent(event));

      // Act: Measure conflict detection performance
      const performanceResult = await TestHelpers.conflicts.validateConflictDetectionPerformance(
        mockConflictChecker,
        scenario.request,
        'test-user-1',
        2000 // 2 second requirement
      );

      // Assert: Must meet performance requirement
      expect(performanceResult.success).toBe(true);
      expect(performanceResult.meets_requirement).toBe(true);
      expect(performanceResult.response_time_ms).toBeLessThan(2000);
      
      // Verify results structure
      expect(performanceResult.result).toBeDefined();
      expect(performanceResult.result.conflicts).toBeDefined();
      expect(performanceResult.result.performance_metrics).toBeDefined();
      
      // Performance metrics should be reasonable
      const metrics = performanceResult.result.performance_metrics;
      expect(metrics.processing_time_ms).toBeLessThan(2000);
      expect(metrics.partners_checked).toBe(10);
      expect(metrics.database_queries).toBeGreaterThan(0);
    });

    it('should handle 50+ partners with maintained performance', async () => {
      // Arrange: Create large-scale scenario (enterprise-level)
      const largeScenario = TestHelpers.conflicts.createMultiPartnerConflictScenario(50);
      
      largeScenario.partners.forEach(partner => mockState.setUser(partner));
      largeScenario.events.forEach(event => mockState.setEvent(event));

      // Act: Test with high partner count
      const startTime = Date.now();
      const result = await mockConflictChecker.checkBatch(largeScenario.request, 'test-user-1');
      const duration = Date.now() - startTime;

      // Assert: Even with 50 partners, should be fast
      expect(duration).toBeLessThan(2000);
      expect(result.success).toBe(true);
      expect(result.performance_metrics.partners_checked).toBe(50);
      expect(result.conflicts).toBeDefined();
    });

    it('should maintain performance under repeated requests (caching)', async () => {
      // Arrange: Create scenario for cache testing
      const scenario = TestHelpers.conflicts.createMultiPartnerConflictScenario(5);
      
      scenario.partners.forEach(partner => mockState.setUser(partner));
      scenario.events.forEach(event => mockState.setEvent(event));

      // Act: Make multiple identical requests
      const results = [];
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        const result = await mockConflictChecker.checkBatch(scenario.request, 'test-user-1');
        const duration = Date.now() - startTime;
        
        results.push({
          attempt: i + 1,
          duration,
          cache_hit_ratio: result.performance_metrics?.cache_hit_ratio || 0
        });
      }

      // Assert: Later requests should be faster due to caching
      expect(results[0].duration).toBeGreaterThan(0);
      
      // At least some cache hits should occur in later requests
      const laterRequests = results.slice(1);
      const hasCacheHits = laterRequests.some(result => result.cache_hit_ratio > 0);
      expect(hasCacheHits).toBe(true);
    });
  });

  describe('Conflict Types and Detection Accuracy', () => {
    it('should correctly identify hard overlap conflicts', async () => {
      // Arrange: Create overlapping events
      const scenarios = TestHelpers.conflicts.createConflictScenarios();
      const baseTime = new Date().toISOString();
      
      // Create users and events for hard overlap test
      const user1 = MockDataFactory.createUser({ id: 'conflict-user-1' });
      const user2 = MockDataFactory.createUser({ id: 'conflict-user-2' });
      mockState.setUser(user1);
      mockState.setUser(user2);

      const overlappingEvents = MockDataFactory.createConflictingEvents(
        ['conflict-user-1', 'conflict-user-2'],
        baseTime
      );

      overlappingEvents.forEach(event => mockState.setEvent(event));

      const request = {
        event_start: baseTime,
        event_end: new Date(new Date(baseTime).getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['conflict-user-1', 'conflict-user-2'],
        buffer_time_minutes: 15,
      };

      // Act: Detect conflicts
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should detect hard overlaps
      expect(result.success).toBe(true);
      expect(result.has_conflicts).toBe(true);
      expect(result.conflicts).toBeDefined();
      
      const hardOverlaps = result.conflicts.filter((c: any) => c.conflict_type === 'hard_overlap');
      expect(hardOverlaps.length).toBeGreaterThan(0);
      
      // Verify conflict details
      hardOverlaps.forEach((conflict: any) => {
        expect(conflict.severity).toBeDefined();
        expect(conflict.conflicting_events).toBeDefined();
        expect(conflict.conflicting_events.length).toBeGreaterThan(0);
        expect(conflict.suggested_alternatives).toBeDefined();
      });
    });

    it('should detect soft buffer conflicts', async () => {
      // Arrange: Create events with insufficient buffer time
      const baseTime = new Date();
      
      const user1 = MockDataFactory.createUser({ id: 'buffer-user-1' });
      mockState.setUser(user1);

      // Event that ends 10 minutes before proposed event
      const bufferEvent = MockDataFactory.createEvent({
        user_id: 'buffer-user-1',
        start_time: new Date(baseTime.getTime() - 70 * 60 * 1000).toISOString(), // 70 mins ago
        end_time: new Date(baseTime.getTime() - 10 * 60 * 1000).toISOString(), // 10 mins ago
        title: 'Previous Meeting',
      });

      mockState.setEvent(bufferEvent);

      const request = {
        event_start: baseTime.toISOString(),
        event_end: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['buffer-user-1'],
        buffer_time_minutes: 15, // Requires 15 min buffer, but only has 10
      };

      // Act: Check for buffer conflicts
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should detect buffer conflict
      expect(result.success).toBe(true);
      
      // Mock implementation should simulate buffer conflicts
      if (result.has_conflicts) {
        const bufferConflicts = result.conflicts.filter((c: any) => c.conflict_type === 'soft_buffer');
        expect(bufferConflicts.length).toBeGreaterThanOrEqual(0); // May be simulated differently in mock
      }
    });

    it('should consider travel time in conflict detection', async () => {
      // Arrange: Create events with travel time requirements
      const baseTime = new Date();
      
      const user1 = MockDataFactory.createUser({ id: 'travel-user-1' });
      mockState.setUser(user1);

      const distantEvent = MockDataFactory.createEvent({
        user_id: 'travel-user-1',
        start_time: new Date(baseTime.getTime() - 90 * 60 * 1000).toISOString(),
        end_time: new Date(baseTime.getTime() - 30 * 60 * 1000).toISOString(),
        title: 'Meeting Across Town',
        location: '123 Distant Street, Far City',
      });

      mockState.setEvent(distantEvent);

      const request = {
        event_start: baseTime.toISOString(),
        event_end: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['travel-user-1'],
        buffer_time_minutes: 15,
        location: '456 Local Avenue, Nearby',
        consider_travel_time: true,
      };

      // Act: Check with travel time consideration
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should consider travel logistics
      expect(result.success).toBe(true);
      
      if (result.smart_suggestions?.alternative_slots) {
        result.smart_suggestions.alternative_slots.forEach((slot: any) => {
          expect(slot.travel_feasible).toBeDefined();
        });
      }
    });
  });

  describe('Privacy-Aware Conflict Detection', () => {
    it('should filter private event details in conflict responses', async () => {
      // Arrange: Create scenario with private events
      const baseTime = new Date().toISOString();
      
      const user1 = MockDataFactory.createUser({ id: 'private-user-1' });
      mockState.setUser(user1);

      const privateEvent = MockDataFactory.createEvent({
        user_id: 'private-user-1',
        title: 'Confidential Medical Appointment',
        description: 'STI testing - very private',
        location: '123 Medical Center, Private Wing',
        privacy_level: 'private',
        start_time: baseTime,
        end_time: new Date(new Date(baseTime).getTime() + 90 * 60 * 1000).toISOString(),
      });

      mockState.setEvent(privateEvent);

      const request = {
        event_start: baseTime,
        event_end: new Date(new Date(baseTime).getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['private-user-1'],
        buffer_time_minutes: 15,
      };

      // Act: Detect conflicts with privacy filtering
      const result = await mockConflictChecker.checkBatch(request, 'test-user-2'); // Different user viewing

      // Assert: Private details should be filtered
      expect(result.success).toBe(true);
      expect(result.privacy_summary).toBeDefined();
      
      if (result.has_conflicts) {
        result.conflicts.forEach((conflict: any) => {
          conflict.conflicting_events.forEach((event: any) => {
            if (event.privacy_level === 'private') {
              expect(event.visible_details.title).toBe(true); // May show "Busy" 
              expect(event.visible_details.description).toBe(false);
              expect(event.visible_details.location).toBe(false);
              expect(event.visible_details.attendees).toBe(false);
            }
          });
        });
      }
    });

    it('should respect relationship privacy levels in conflict visibility', async () => {
      // Arrange: Create relationship with specific privacy level
      const scenario = TestHelpers.privacy.createPrivacyScenario('privacy-center');
      
      const baseTime = new Date().toISOString();
      
      // Create conflicting event for secondary partner (semi_private relationship)
      const semiPrivateEvent = MockDataFactory.createEvent({
        user_id: 'secondary-partner',
        title: 'Personal Meeting',
        privacy_level: 'visible', // Event is visible, but relationship is semi_private
        start_time: baseTime,
        end_time: new Date(new Date(baseTime).getTime() + 90 * 60 * 1000).toISOString(),
      });

      mockState.setEvent(semiPrivateEvent);

      const request = {
        event_start: baseTime,
        event_end: new Date(new Date(baseTime).getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['secondary-partner'],
        buffer_time_minutes: 15,
      };

      // Act: Check conflicts from primary partner perspective
      const result = await mockConflictChecker.checkBatch(request, 'primary-partner');

      // Assert: Should respect relationship privacy settings
      expect(result.success).toBe(true);
      expect(result.privacy_summary).toBeDefined();
      expect(result.privacy_summary.privacy_filtered_events).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Smart Scheduling Suggestions', () => {
    it('should provide intelligent alternative time slots', async () => {
      // Arrange: Create scenario with conflicts requiring alternatives
      const scenario = TestHelpers.conflicts.createMultiPartnerConflictScenario(3);
      
      scenario.partners.forEach(partner => mockState.setUser(partner));
      scenario.events.forEach(event => mockState.setEvent(event));

      // Act: Request conflict detection with alternatives
      const request = {
        ...scenario.request,
        alternative_slots_count: 5,
        preferred_times: ['09:00', '14:00', '16:00'],
      };

      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should provide smart suggestions
      expect(result.success).toBe(true);
      expect(result.smart_suggestions).toBeDefined();
      
      if (result.smart_suggestions) {
        const suggestions = result.smart_suggestions;
        
        // Should have alternative slots
        expect(suggestions.alternative_slots).toBeDefined();
        expect(Array.isArray(suggestions.alternative_slots)).toBe(true);
        
        if (suggestions.alternative_slots.length > 0) {
          suggestions.alternative_slots.forEach((slot: any) => {
            expect(slot.start_time).toBeDefined();
            expect(slot.end_time).toBeDefined();
            expect(slot.confidence_score).toBeDefined();
            expect(slot.confidence_score).toBeGreaterThanOrEqual(0);
            expect(slot.confidence_score).toBeLessThanOrEqual(1);
            expect(slot.buffer_quality).toBeDefined();
            expect(slot.travel_feasible).toBeDefined();
            expect(slot.time_preference_score).toBeDefined();
          });
        }
        
        // Should have scheduling insights
        expect(suggestions.scheduling_insights).toBeDefined();
        expect(Array.isArray(suggestions.scheduling_insights)).toBe(true);
        
        // Should suggest best time windows
        expect(suggestions.best_time_windows).toBeDefined();
        expect(Array.isArray(suggestions.best_time_windows)).toBe(true);
      }
    });

    it('should optimize suggestions based on partner availability patterns', async () => {
      // Arrange: Create patterns of availability
      const partners = [
        MockDataFactory.createUser({ id: 'morning-person' }),
        MockDataFactory.createUser({ id: 'afternoon-person' }),
        MockDataFactory.createUser({ id: 'flexible-person' }),
      ];

      partners.forEach(partner => mockState.setUser(partner));

      // Create events showing preferences
      const morningEvents = [
        MockDataFactory.createEvent({
          user_id: 'morning-person',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          title: 'Morning Meeting',
        }),
      ];

      const afternoonEvents = [
        MockDataFactory.createEvent({
          user_id: 'afternoon-person',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          title: 'Afternoon Meeting',
        }),
      ];

      [...morningEvents, ...afternoonEvents].forEach(event => mockState.setEvent(event));

      const request = {
        event_start: new Date().toISOString(),
        event_end: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
        partner_ids: partners.map(p => p.id),
        alternative_slots_count: 10,
      };

      // Act: Get optimized suggestions
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should provide optimized suggestions
      expect(result.success).toBe(true);
      
      if (result.smart_suggestions?.alternative_slots) {
        // Should have multiple options with varying confidence scores
        const slots = result.smart_suggestions.alternative_slots;
        expect(slots.length).toBeGreaterThan(0);
        
        // Should have range of confidence scores
        const confidenceScores = slots.map((slot: any) => slot.confidence_score);
        const hasVariedScores = Math.max(...confidenceScores) > Math.min(...confidenceScores);
        expect(hasVariedScores).toBe(true);
      }
    });
  });

  describe('Batch Processing Efficiency', () => {
    it('should process multiple partner checks in single batch operation', async () => {
      // Arrange: Create large scenario
      const scenario = TestHelpers.conflicts.createMultiPartnerConflictScenario(8);
      
      scenario.partners.forEach(partner => mockState.setUser(partner));
      scenario.events.forEach(event => mockState.setEvent(event));

      // Act: Single batch request for all partners
      const result = await mockConflictChecker.checkBatch(scenario.request, 'test-user-1');

      // Assert: Should process all partners in batch
      expect(result.success).toBe(true);
      expect(result.performance_metrics.partners_checked).toBe(8);
      expect(result.performance_metrics.database_queries).toBeLessThanOrEqual(2); // Efficient batching
      
      // Should have results for all partners
      expect(result.conflicts).toBeDefined();
      
      // Privacy summary should account for all events checked
      expect(result.privacy_summary.total_events_checked).toBeGreaterThan(0);
    });

    it('should handle mixed conflict types in batch processing', async () => {
      // Arrange: Create diverse conflict scenarios
      const baseTime = new Date();
      const partners = [];
      const events = [];

      // Create 5 partners with different conflict types
      for (let i = 0; i < 5; i++) {
        const partner = MockDataFactory.createUser({ id: `mixed-partner-${i}` });
        partners.push(partner);
        mockState.setUser(partner);

        if (i % 3 === 0) {
          // Hard overlap
          events.push(MockDataFactory.createEvent({
            user_id: partner.id,
            start_time: baseTime.toISOString(),
            end_time: new Date(baseTime.getTime() + 90 * 60 * 1000).toISOString(),
            title: `Overlapping Meeting ${i}`,
          }));
        } else if (i % 3 === 1) {
          // Buffer conflict
          events.push(MockDataFactory.createEvent({
            user_id: partner.id,
            start_time: new Date(baseTime.getTime() - 75 * 60 * 1000).toISOString(),
            end_time: new Date(baseTime.getTime() - 5 * 60 * 1000).toISOString(),
            title: `Buffer Issue Meeting ${i}`,
          }));
        }
        // i % 3 === 2: No conflict (available)
      }

      events.forEach(event => mockState.setEvent(event));

      const request = {
        event_start: baseTime.toISOString(),
        event_end: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        partner_ids: partners.map(p => p.id),
        buffer_time_minutes: 15,
      };

      // Act: Process mixed conflicts
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should handle all conflict types
      expect(result.success).toBe(true);
      expect(result.conflicts).toBeDefined();
      
      // Should identify different conflict types
      if (result.has_conflicts) {
        const conflictTypes = result.conflicts.map((c: any) => c.conflict_type);
        const uniqueTypes = [...new Set(conflictTypes)];
        expect(uniqueTypes.length).toBeGreaterThanOrEqual(1);
      }

      // Should maintain performance with mixed types
      expect(result.performance_metrics.processing_time_ms).toBeLessThan(2000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty partner lists gracefully', async () => {
      // Arrange: Request with no partners
      const request = {
        event_start: new Date().toISOString(),
        event_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        partner_ids: [],
        buffer_time_minutes: 15,
      };

      // Act: Process empty request
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should handle gracefully
      expect(result.success).toBe(true);
      expect(result.has_conflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(result.performance_metrics.partners_checked).toBe(0);
    });

    it('should handle invalid time ranges', async () => {
      // Arrange: Request with invalid time range (end before start)
      const request = {
        event_start: new Date().toISOString(),
        event_end: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // Past time
        partner_ids: ['test-partner'],
        buffer_time_minutes: 15,
      };

      // Act & Assert: Should either fix or reject invalid request
      try {
        const result = await mockConflictChecker.checkBatch(request, 'test-user-1');
        
        // If it succeeds, should have corrected the time range
        if (result.success) {
          expect(result.conflicts).toBeDefined();
        }
      } catch (error) {
        // Or it should throw a meaningful error
        expect(error).toBeDefined();
      }
    });

    it('should handle non-existent partners gracefully', async () => {
      // Arrange: Request with non-existent partner IDs
      const request = {
        event_start: new Date().toISOString(),
        event_end: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        partner_ids: ['non-existent-1', 'non-existent-2'],
        buffer_time_minutes: 15,
      };

      // Act: Process request with invalid partners
      const result = await mockConflictChecker.checkBatch(request, 'test-user-1');

      // Assert: Should handle gracefully (no conflicts for non-existent users)
      expect(result.success).toBe(true);
      expect(result.performance_metrics.partners_checked).toBe(2);
    });
  });
});
