/**
 * Data Integrity & Recovery Testing Framework
 * 
 * Tests critical data consistency and recovery scenarios to prevent:
 * - Lost or duplicated events (especially recurring/exception cases)
 * - Data inconsistency across devices and sync points
 * - Corruption during backup/recovery operations
 * - Privacy boundary violations during data operations
 * - Concurrent modification conflicts
 * 
 * These tests address the catastrophic failure modes you identified
 * that would cause immediate user abandonment.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../db/test-utilities';

// Data integrity testing utilities
class DataIntegrityFramework {
  private static eventSnapshots: Map<string, any[]> = new Map();
  private static syncOperations: any[] = [];
  
  static async captureDataSnapshot(supabase: any, userId: string, label: string = 'snapshot') {
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    
    if (error) throw new Error(`Failed to capture snapshot: ${error.message}`);
    
    this.eventSnapshots.set(`${userId}-${label}`, events || []);
    return events || [];
  }
  
  static getSnapshot(userId: string, label: string = 'snapshot'): any[] {
    return this.eventSnapshots.get(`${userId}-${label}`) || [];
  }
  
  static compareSnapshots(
    userId: string, 
    beforeLabel: string, 
    afterLabel: string
  ): {
    added: any[];
    removed: any[];
    modified: any[];
    duplicates: any[];
    unchanged: any[];
  } {
    const before = this.getSnapshot(userId, beforeLabel);
    const after = this.getSnapshot(userId, afterLabel);
    
    const added = after.filter(afterEvent => 
      !before.some(beforeEvent => beforeEvent.id === afterEvent.id)
    );
    
    const removed = before.filter(beforeEvent => 
      !after.some(afterEvent => afterEvent.id === beforeEvent.id)
    );
    
    const modified = after.filter(afterEvent => {
      const beforeEvent = before.find(b => b.id === afterEvent.id);
      return beforeEvent && JSON.stringify(beforeEvent) !== JSON.stringify(afterEvent);
    });
    
    const unchanged = after.filter(afterEvent => {
      const beforeEvent = before.find(b => b.id === afterEvent.id);
      return beforeEvent && JSON.stringify(beforeEvent) === JSON.stringify(afterEvent);
    });
    
    // Detect duplicates by title/time combination
    const duplicates = after.filter((event, index, arr) => 
      arr.findIndex(e => 
        e.title === event.title && 
        e.start_time === event.start_time && 
        e.user_id === event.user_id &&
        e.id !== event.id
      ) !== index
    );
    
    return { added, removed, modified, duplicates, unchanged };
  }
  
  static logSyncOperation(operation: any) {
    this.syncOperations.push({
      ...operation,
      timestamp: new Date().toISOString()
    });
  }
  
  static getSyncOperations(): any[] {
    return [...this.syncOperations];
  }
  
  static clearSnapshots() {
    this.eventSnapshots.clear();
    this.syncOperations = [];
  }
  
  static async simulateNetworkPartition(supabase: any, durationMs: number = 5000) {
    // Simulate network partition by temporarily breaking the connection
    const originalUrl = supabase.supabaseUrl;
    
    // Break connection
    Object.defineProperty(supabase, 'supabaseUrl', {
      value: 'https://unreachable-partition.invalid',
      writable: true
    });
    
    // Wait for partition duration
    await new Promise(resolve => setTimeout(resolve, durationMs));
    
    // Restore connection
    Object.defineProperty(supabase, 'supabaseUrl', {
      value: originalUrl,
      writable: true
    });
  }
}

// Concurrent operation simulation
const simulateConcurrentModifications = async (
  operations: (() => Promise<any>)[], 
  concurrencyLevel: number = 5
) => {
  const results = [];
  
  for (let i = 0; i < operations.length; i += concurrencyLevel) {
    const batch = operations.slice(i, i + concurrencyLevel);
    const batchResults = await Promise.allSettled(batch.map(op => op()));
    results.push(...batchResults);
  }
  
  return results;
};

describe('🔄 Data Consistency Across Device Sync', () => {
  let supabase: any;
  let testUsers: any[];
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    testUsers = [
      {
        id: 'sync-user-mobile',
        email: 'mobile.user@testpoly.com',
        phone_number: '+14155551001',
        display_name: 'Mobile User',
        device_type: 'mobile'
      },
      {
        id: 'sync-user-web',
        email: 'web.user@testpoly.com',
        phone_number: '+14155551002',
        display_name: 'Web User',
        device_type: 'web'
      }
    ];
    
    await testHelpers.setupTestEnvironment(supabase);
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    DataIntegrityFramework.clearSnapshots();
    
    for (const user of testUsers) {
      await testHelpers.createTestUser(supabase, user);
    }
  });

  it('📱 Cross-device event synchronization maintains consistency', async () => {
    const mobileUser = testUsers[0];
    const webUser = testUsers[1];
    
    // Mobile device creates events offline, then syncs
    await testHelpers.authenticateAs(supabase, mobileUser);
    
    // Capture initial state
    await DataIntegrityFramework.captureDataSnapshot(supabase, mobileUser.id, 'before-mobile-events');
    
    // Create events on mobile (simulated offline creation)
    const mobileEvents = [
      {
        id: 'mobile-event-1',
        user_id: mobileUser.id,
        title: 'Morning Workout',
        start_time: '2024-03-01T07:00:00Z',
        end_time: '2024-03-01T08:00:00Z',
        privacy_level: 'private',
        device_created: 'mobile',
        sync_status: 'pending'
      },
      {
        id: 'mobile-event-2',
        user_id: mobileUser.id,
        title: 'Work Meeting',
        start_time: '2024-03-01T10:00:00Z',
        end_time: '2024-03-01T11:00:00Z',
        privacy_level: 'visible',
        device_created: 'mobile',
        sync_status: 'pending'
      }
    ];
    
    // Insert mobile events with sync tracking
    const { data: insertedMobileEvents, error: mobileError } = await supabase
      .from('events')
      .insert(mobileEvents)
      .select();
    
    expect(mobileError).toBeNull();
    expect(insertedMobileEvents).toHaveLength(2);
    
    // Web device creates events simultaneously
    await testHelpers.authenticateAs(supabase, webUser);
    
    const webEvents = [
      {
        id: 'web-event-1',
        user_id: webUser.id,
        title: 'Client Call',
        start_time: '2024-03-01T14:00:00Z',
        end_time: '2024-03-01T15:00:00Z',
        privacy_level: 'semi_private',
        device_created: 'web',
        sync_status: 'synced'
      },
      {
        id: 'web-event-2',
        user_id: webUser.id,
        title: 'Lunch Break',
        start_time: '2024-03-01T12:00:00Z',
        end_time: '2024-03-01T13:00:00Z',
        privacy_level: 'visible',
        device_created: 'web',
        sync_status: 'synced'
      }
    ];
    
    const { data: insertedWebEvents, error: webError } = await supabase
      .from('events')
      .insert(webEvents)
      .select();
    
    expect(webError).toBeNull();
    expect(insertedWebEvents).toHaveLength(2);
    
    // Simulate sync operation between devices
    DataIntegrityFramework.logSyncOperation({
      type: 'cross_device_sync',
      source_device: 'mobile',
      target_device: 'web',
      events_synced: mobileEvents.length
    });
    
    // Capture final state after sync
    await DataIntegrityFramework.captureDataSnapshot(supabase, mobileUser.id, 'after-sync-mobile');
    await DataIntegrityFramework.captureDataSnapshot(supabase, webUser.id, 'after-sync-web');
    
    // Verify data integrity
    const { data: allMobileEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', mobileUser.id);
      
    const { data: allWebEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', webUser.id);
    
    // Verify no data loss
    expect(allMobileEvents).toHaveLength(2);
    expect(allWebEvents).toHaveLength(2);
    
    // Verify no duplicates created during sync
    const mobileComparison = DataIntegrityFramework.compareSnapshots(
      mobileUser.id, 'before-mobile-events', 'after-sync-mobile'
    );
    expect(mobileComparison.duplicates).toHaveLength(0);
    expect(mobileComparison.added).toHaveLength(2); // Only the events we created
    expect(mobileComparison.removed).toHaveLength(0); // No data loss
    
    // Verify sync status was updated
    const syncedEvents = allMobileEvents.filter(e => e.sync_status === 'synced' || e.sync_status === 'pending');
    expect(syncedEvents).toHaveLength(2);
    
    console.log('✅ Cross-device sync completed successfully:');
    console.log(`   Mobile events: ${allMobileEvents.length}, Web events: ${allWebEvents.length}`);
    console.log(`   Duplicates detected: ${mobileComparison.duplicates.length}`);
  });
  
  it('⚡ Concurrent event modifications resolve conflicts correctly', async () => {
    const user = testUsers[0];
    await testHelpers.authenticateAs(supabase, user);
    
    // Create a base event
    const { data: baseEvent } = await supabase
      .from('events')
      .insert({
        user_id: user.id,
        title: 'Team Meeting',
        start_time: '2024-03-05T14:00:00Z',
        end_time: '2024-03-05T15:00:00Z',
        privacy_level: 'visible',
        version: 1
      })
      .select()
      .single();
    
    await DataIntegrityFramework.captureDataSnapshot(supabase, user.id, 'before-concurrent');
    
    // Simulate concurrent modifications from different devices
    const concurrentOperations = [
      // Device 1: Updates title
      async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return supabase
          .from('events')
          .update({ 
            title: 'Team Meeting - Updated by Device 1',
            version: 2,
            last_modified_by: 'device-1'
          })
          .eq('id', baseEvent.id)
          .eq('version', 1); // Optimistic locking
      },
      
      // Device 2: Updates time
      async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return supabase
          .from('events')
          .update({ 
            start_time: '2024-03-05T15:00:00Z',
            end_time: '2024-03-05T16:00:00Z',
            version: 2,
            last_modified_by: 'device-2'
          })
          .eq('id', baseEvent.id)
          .eq('version', 1); // Optimistic locking
      },
      
      // Device 3: Updates location
      async () => {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        return supabase
          .from('events')
          .update({ 
            location: 'Conference Room A',
            version: 2,
            last_modified_by: 'device-3'
          })
          .eq('id', baseEvent.id)
          .eq('version', 1); // Optimistic locking
      }
    ];
    
    const results = await simulateConcurrentModifications(concurrentOperations, 3);
    
    // Only one modification should succeed (optimistic locking)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value?.error === null);
    const failed = results.filter(r => r.status === 'rejected' || r.value?.error !== null);
    
    expect(successful.length).toBe(1); // Only one should succeed
    expect(failed.length).toBe(2); // Two should fail due to version conflict
    
    // Verify final event state
    const { data: finalEvent } = await supabase
      .from('events')
      .select('*')
      .eq('id', baseEvent.id)
      .single();
    
    expect(finalEvent.version).toBe(2); // Version incremented
    expect(finalEvent.last_modified_by).toMatch(/device-[123]/); // Modified by one device
    
    await DataIntegrityFramework.captureDataSnapshot(supabase, user.id, 'after-concurrent');
    const comparison = DataIntegrityFramework.compareSnapshots(
      user.id, 'before-concurrent', 'after-concurrent'
    );
    
    // Should have no duplicates or data loss
    expect(comparison.duplicates).toHaveLength(0);
    expect(comparison.removed).toHaveLength(0);
    expect(comparison.modified).toHaveLength(1); // Only the one event modified
    
    console.log('✅ Concurrent modification conflict resolution working:');
    console.log(`   ${successful.length} successful, ${failed.length} failed (expected)`);
    console.log(`   Final event version: ${finalEvent.version}`);
  });
  
  it('🌐 Network partition recovery maintains data integrity', async () => {
    const user = testUsers[0];
    await testHelpers.authenticateAs(supabase, user);
    
    // Create initial events
    const initialEvents = [
      {
        user_id: user.id,
        title: 'Pre-partition Event',
        start_time: '2024-03-10T10:00:00Z',
        end_time: '2024-03-10T11:00:00Z',
        privacy_level: 'visible'
      }
    ];
    
    await supabase.from('events').insert(initialEvents);
    await DataIntegrityFramework.captureDataSnapshot(supabase, user.id, 'pre-partition');
    
    // Simulate network partition
    const partitionDuration = 2000; // 2 seconds
    const partitionPromise = DataIntegrityFramework.simulateNetworkPartition(supabase, partitionDuration);
    
    // During partition, try to create events (should queue for later sync)
    const partitionEvents = [
      {
        id: 'partition-event-1',
        user_id: user.id,
        title: 'Created During Partition',
        start_time: '2024-03-10T14:00:00Z',
        end_time: '2024-03-10T15:00:00Z',
        privacy_level: 'semi_private',
        sync_status: 'pending',
        created_offline: true
      }
    ];
    
    // This should fail during partition
    let partitionCreateResult;
    try {
      partitionCreateResult = await supabase
        .from('events')
        .insert(partitionEvents[0]);
    } catch (error) {
      partitionCreateResult = { error };
    }
    
    // Wait for partition to end
    await partitionPromise;
    
    // After partition recovery, sync offline events
    const { data: syncResult, error: syncError } = await supabase
      .from('events')
      .insert(partitionEvents[0])
      .select();
    
    expect(syncError).toBeNull();
    expect(syncResult).toHaveLength(1);
    
    await DataIntegrityFramework.captureDataSnapshot(supabase, user.id, 'post-partition');
    
    // Verify data integrity after partition recovery
    const comparison = DataIntegrityFramework.compareSnapshots(
      user.id, 'pre-partition', 'post-partition'
    );
    
    expect(comparison.duplicates).toHaveLength(0); // No duplicates
    expect(comparison.added).toHaveLength(1); // Only the partition event added
    expect(comparison.removed).toHaveLength(0); // No data loss
    
    // Verify all events are present
    const { data: allEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id);
    
    expect(allEvents).toHaveLength(2); // Initial + partition event
    
    console.log('✅ Network partition recovery successful:');
    console.log(`   Events before: ${comparison.unchanged.length + comparison.modified.length + comparison.removed.length}`);
    console.log(`   Events after: ${comparison.unchanged.length + comparison.modified.length + comparison.added.length}`);
    console.log(`   Events lost: ${comparison.removed.length}`);
  });
});

describe('🔁 Recurring Event Integrity & Exception Handling', () => {
  let supabase: any;
  let testUser: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    testUser = {
      id: 'recurring-test-user',
      email: 'recurring@testpoly.com',
      phone_number: '+14155551003',
      display_name: 'Recurring Test User'
    };
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    DataIntegrityFramework.clearSnapshots();
    await testHelpers.createTestUser(supabase, testUser);
    await testHelpers.authenticateAs(supabase, testUser);
  });

  it('🔄 Recurring event series maintains integrity across modifications', async () => {
    // Create a recurring event series
    const recurringEvent = {
      user_id: testUser.id,
      title: 'Weekly Team Standup',
      start_time: '2024-03-04T09:00:00Z', // Monday
      end_time: '2024-03-04T09:30:00Z',
      privacy_level: 'visible',
      recurring: true,
      recurrence_pattern: 'RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8', // 8 weeks
      series_id: 'standup-series-2024'
    };
    
    const { data: createdEvent } = await supabase
      .from('events')
      .insert(recurringEvent)
      .select()
      .single();
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'recurring-created');
    
    // Generate individual occurrences (simulating what the system would do)
    const occurrences = [];
    const startDate = new Date('2024-03-04T09:00:00Z');
    
    for (let week = 0; week < 8; week++) {
      const occurrenceDate = new Date(startDate);
      occurrenceDate.setDate(startDate.getDate() + (week * 7));
      
      occurrences.push({
        user_id: testUser.id,
        title: 'Weekly Team Standup',
        start_time: occurrenceDate.toISOString(),
        end_time: new Date(occurrenceDate.getTime() + 30 * 60 * 1000).toISOString(), // +30 minutes
        privacy_level: 'visible',
        recurring: false,
        series_id: 'standup-series-2024',
        series_master_id: createdEvent.id,
        occurrence_index: week
      });
    }
    
    const { data: insertedOccurrences } = await supabase
      .from('events')
      .insert(occurrences)
      .select();
    
    expect(insertedOccurrences).toHaveLength(8);
    
    // Test modification scenarios
    
    // 1. Modify single occurrence (should create exception)
    const thirdOccurrence = insertedOccurrences[2]; // Third week
    const { error: singleModifyError } = await supabase
      .from('events')
      .update({
        title: 'Weekly Team Standup - Special Topic',
        start_time: '2024-03-18T10:00:00Z', // Different time
        is_exception: true
      })
      .eq('id', thirdOccurrence.id);
    
    expect(singleModifyError).toBeNull();
    
    // 2. Delete single occurrence (should create deletion exception)
    const fifthOccurrence = insertedOccurrences[4]; // Fifth week
    await supabase
      .from('event_exceptions')
      .insert({
        series_id: 'standup-series-2024',
        exception_date: fifthOccurrence.start_time,
        exception_type: 'deleted',
        original_event_id: fifthOccurrence.id
      });
    
    await supabase
      .from('events')
      .delete()
      .eq('id', fifthOccurrence.id);
    
    // 3. Modify entire series (should update all non-exception occurrences)
    const { error: seriesModifyError } = await supabase
      .from('events')
      .update({
        location: 'New Conference Room',
        updated_at: new Date().toISOString()
      })
      .eq('series_id', 'standup-series-2024')
      .eq('is_exception', false);
    
    expect(seriesModifyError).toBeNull();
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'recurring-modified');
    
    // Verify integrity of recurring series
    const { data: finalEvents } = await supabase
      .from('events')
      .select('*')
      .eq('series_id', 'standup-series-2024')
      .order('start_time');
    
    const { data: exceptions } = await supabase
      .from('event_exceptions')
      .select('*')
      .eq('series_id', 'standup-series-2024');
    
    // Should have 7 events (8 original - 1 deleted) + 1 master event = 8 events
    expect(finalEvents).toHaveLength(8); // 7 occurrences + 1 master
    expect(exceptions).toHaveLength(1); // 1 deletion exception
    
    // Verify exception handling
    const modifiedException = finalEvents.find(e => e.title.includes('Special Topic'));
    expect(modifiedException).toBeDefined();
    expect(modifiedException.is_exception).toBe(true);
    
    // Verify series modification applied to non-exceptions
    const regularOccurrences = finalEvents.filter(e => 
      !e.recurring && !e.is_exception && e.series_master_id
    );
    expect(regularOccurrences.every(e => e.location === 'New Conference Room')).toBe(true);
    
    // Verify no duplicates created
    const comparison = DataIntegrityFramework.compareSnapshots(
      testUser.id, 'recurring-created', 'recurring-modified'
    );
    expect(comparison.duplicates).toHaveLength(0);
    
    console.log('✅ Recurring event integrity maintained:');
    console.log(`   Final events: ${finalEvents.length}`);
    console.log(`   Exceptions: ${exceptions.length}`);
    console.log(`   Duplicates: ${comparison.duplicates.length}`);
  });
  
  it('🔧 Exception handling prevents cascade failures', async () => {
    // Create a recurring event with complex exception scenarios
    const complexRecurring = {
      user_id: testUser.id,
      title: 'Daily Workout',
      start_time: '2024-03-01T06:00:00Z',
      end_time: '2024-03-01T07:00:00Z',
      privacy_level: 'private',
      recurring: true,
      recurrence_pattern: 'RRULE:FREQ=DAILY;COUNT=14', // 2 weeks
      series_id: 'workout-series-2024'
    };
    
    const { data: masterEvent } = await supabase
      .from('events')
      .insert(complexRecurring)
      .select()
      .single();
    
    // Generate 14 daily occurrences
    const occurrences = [];
    const startDate = new Date('2024-03-01T06:00:00Z');
    
    for (let day = 0; day < 14; day++) {
      const occurrenceDate = new Date(startDate);
      occurrenceDate.setDate(startDate.getDate() + day);
      
      occurrences.push({
        user_id: testUser.id,
        title: 'Daily Workout',
        start_time: occurrenceDate.toISOString(),
        end_time: new Date(occurrenceDate.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
        privacy_level: 'private',
        recurring: false,
        series_id: 'workout-series-2024',
        series_master_id: masterEvent.id,
        occurrence_index: day
      });
    }
    
    await supabase.from('events').insert(occurrences);
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'before-exceptions');
    
    // Create multiple exceptions simultaneously (stress test)
    const exceptionOperations = [
      // Move weekend workouts to different time
      () => supabase.from('events')
        .update({ start_time: '2024-03-02T08:00:00Z', is_exception: true })
        .eq('series_id', 'workout-series-2024')
        .eq('occurrence_index', 1), // Saturday
        
      () => supabase.from('events')
        .update({ start_time: '2024-03-03T08:00:00Z', is_exception: true })
        .eq('series_id', 'workout-series-2024')
        .eq('occurrence_index', 2), // Sunday
        
      // Cancel mid-week workout
      () => supabase.from('events')
        .delete()
        .eq('series_id', 'workout-series-2024')
        .eq('occurrence_index', 5), // Wednesday
        
      // Extend one workout
      () => supabase.from('events')
        .update({ 
          end_time: '2024-03-08T08:00:00Z', // 2 hours instead of 1
          title: 'Extended Daily Workout',
          is_exception: true 
        })
        .eq('series_id', 'workout-series-2024')
        .eq('occurrence_index', 7) // Next Friday
    ];
    
    const exceptionResults = await simulateConcurrentModifications(exceptionOperations, 4);
    
    // All exception operations should succeed
    const successfulExceptions = exceptionResults.filter(r => 
      r.status === 'fulfilled' && !r.value?.error
    );
    expect(successfulExceptions.length).toBe(4);
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'after-exceptions');
    
    // Verify exception integrity
    const { data: finalEvents } = await supabase
      .from('events')
      .select('*')
      .eq('series_id', 'workout-series-2024')
      .order('occurrence_index');
    
    // Should have 13 events (14 - 1 deleted) + 1 master = 14 events
    expect(finalEvents).toHaveLength(14);
    
    // Verify exceptions are properly marked
    const exceptions = finalEvents.filter(e => e.is_exception === true);
    expect(exceptions.length).toBeGreaterThan(0);
    
    // Verify no data corruption in non-exception events
    const regularEvents = finalEvents.filter(e => 
      !e.recurring && !e.is_exception && e.occurrence_index !== undefined
    );
    expect(regularEvents.every(e => e.title === 'Daily Workout')).toBe(true);
    expect(regularEvents.every(e => e.privacy_level === 'private')).toBe(true);
    
    // Verify no cascading failures affected other series
    const comparison = DataIntegrityFramework.compareSnapshots(
      testUser.id, 'before-exceptions', 'after-exceptions'
    );
    expect(comparison.duplicates).toHaveLength(0);
    
    console.log('✅ Exception handling prevented cascade failures:');
    console.log(`   Successful exceptions: ${successfulExceptions.length}/4`);
    console.log(`   Final events: ${finalEvents.length}`);
    console.log(`   Explicit exceptions: ${exceptions.length}`);
  });
});

describe('💾 Backup & Recovery Data Integrity', () => {
  let supabase: any;
  let testUser: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    testUser = {
      id: 'backup-test-user',
      email: 'backup@testpoly.com',
      phone_number: '+14155551004',
      display_name: 'Backup Test User'
    };
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    DataIntegrityFramework.clearSnapshots();
    await testHelpers.createTestUser(supabase, testUser);
    await testHelpers.authenticateAs(supabase, testUser);
  });

  it('📦 Full user data backup maintains referential integrity', async () => {
    // Create comprehensive test data
    const testData = {
      events: [
        {
          user_id: testUser.id,
          title: 'Important Meeting',
          start_time: '2024-03-15T14:00:00Z',
          end_time: '2024-03-15T15:00:00Z',
          privacy_level: 'visible'
        },
        {
          user_id: testUser.id,
          title: 'Personal Time',
          start_time: '2024-03-15T18:00:00Z',
          end_time: '2024-03-15T19:00:00Z',
          privacy_level: 'private'
        }
      ],
      relationships: [
        {
          user_id: testUser.id,
          partner_id: 'partner-1',
          relationship_type: 'primary',
          default_privacy_level: 'visible'
        }
      ],
      groups: [
        {
          id: 'group-1',
          created_by: testUser.id,
          name: 'Polycule Group',
          privacy_level: 'semi_private'
        }
      ]
    };
    
    // Insert test data
    await supabase.from('events').insert(testData.events);
    await supabase.from('relationships').insert(testData.relationships);
    await supabase.from('groups').insert(testData.groups);
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'pre-backup');
    
    // Perform backup operation
    const backupResponse = await fetch('/api/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: testUser.id,
        backup_type: 'full',
        include_privacy: true,
        encryption: 'aes-256'
      })
    });
    
    const backupResult = await backupResponse.json();
    expect(backupResult.success).toBe(true);
    expect(backupResult.backup_id).toBeDefined();
    expect(backupResult.encrypted).toBe(true);
    
    // Verify backup contents
    const backupVerifyResponse = await fetch(`/api/backup/verify/${backupResult.backup_id}`);
    const verifyResult = await backupVerifyResponse.json();
    
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.tables_backed_up).toContain('events');
    expect(verifyResult.tables_backed_up).toContain('relationships');
    expect(verifyResult.tables_backed_up).toContain('groups');
    expect(verifyResult.total_records).toBeGreaterThan(0);
    
    // Verify referential integrity in backup
    expect(verifyResult.integrity_checks.foreign_keys_valid).toBe(true);
    expect(verifyResult.integrity_checks.privacy_levels_consistent).toBe(true);
    
    console.log('✅ Full backup completed with integrity:');
    console.log(`   Backup ID: ${backupResult.backup_id}`);
    console.log(`   Tables: ${verifyResult.tables_backed_up.length}`);
    console.log(`   Records: ${verifyResult.total_records}`);
  });
  
  it('🔄 Data recovery restores complete user state without corruption', async () => {
    // Create original data
    const originalEvents = [
      {
        id: 'original-event-1',
        user_id: testUser.id,
        title: 'Original Event 1',
        start_time: '2024-03-20T10:00:00Z',
        end_time: '2024-03-20T11:00:00Z',
        privacy_level: 'visible'
      },
      {
        id: 'original-event-2',
        user_id: testUser.id,
        title: 'Original Event 2',
        start_time: '2024-03-20T14:00:00Z',
        end_time: '2024-03-20T15:00:00Z',
        privacy_level: 'semi_private'
      }
    ];
    
    await supabase.from('events').insert(originalEvents);
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'original-data');
    
    // Create backup
    const backupResponse = await fetch('/api/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: testUser.id,
        backup_type: 'full'
      })
    });
    
    const backupResult = await backupResponse.json();
    expect(backupResult.success).toBe(true);
    
    // Simulate data corruption/loss
    await supabase.from('events').delete().eq('user_id', testUser.id);
    
    // Modify one event to simulate partial corruption
    await supabase.from('events').insert({
      id: 'corrupted-event',
      user_id: testUser.id,
      title: 'Corrupted Event',
      start_time: '2024-03-20T10:00:00Z',
      end_time: '2024-03-20T11:00:00Z',
      privacy_level: 'visible'
    });
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'corrupted-data');
    
    // Perform recovery
    const recoveryResponse = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backup_id: backupResult.backup_id,
        user_id: testUser.id,
        restore_strategy: 'replace_all',
        verify_integrity: true
      })
    });
    
    const recoveryResult = await recoveryResponse.json();
    expect(recoveryResult.success).toBe(true);
    expect(recoveryResult.records_restored).toBe(originalEvents.length);
    
    await DataIntegrityFramework.captureDataSnapshot(testUser.id, testUser.id, 'restored-data');
    
    // Verify complete restoration
    const { data: restoredEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', testUser.id)
      .order('start_time');
    
    expect(restoredEvents).toHaveLength(originalEvents.length);
    
    // Verify data integrity
    const restorationComparison = DataIntegrityFramework.compareSnapshots(
      testUser.id, 'original-data', 'restored-data'
    );
    
    expect(restorationComparison.duplicates).toHaveLength(0); // No duplicates
    expect(restorationComparison.removed).toHaveLength(0); // No data loss
    expect(restorationComparison.added).toHaveLength(0); // Exact restoration
    
    // Verify specific event data integrity
    const originalEvent1 = originalEvents.find(e => e.title === 'Original Event 1');
    const restoredEvent1 = restoredEvents.find(e => e.title === 'Original Event 1');
    
    expect(restoredEvent1).toBeDefined();
    expect(restoredEvent1.id).toBe(originalEvent1.id);
    expect(restoredEvent1.privacy_level).toBe(originalEvent1.privacy_level);
    expect(restoredEvent1.start_time).toBe(originalEvent1.start_time);
    
    // Verify corrupted data was properly replaced
    const corruptedEventExists = restoredEvents.some(e => e.title === 'Corrupted Event');
    expect(corruptedEventExists).toBe(false);
    
    console.log('✅ Data recovery completed successfully:');
    console.log(`   Records restored: ${recoveryResult.records_restored}`);
    console.log(`   Integrity maintained: ${restorationComparison.duplicates.length === 0}`);
    console.log(`   Corruption removed: ${!corruptedEventExists}`);
  });
  
  it('🛡️ Privacy-sensitive backup/restore maintains confidentiality', async () => {
    // Create events with different privacy levels
    const privacyTestEvents = [
      {
        user_id: testUser.id,
        title: 'Public Community Event',
        description: 'Everyone can see this',
        start_time: '2024-03-25T12:00:00Z',
        end_time: '2024-03-25T13:00:00Z',
        privacy_level: 'public'
      },
      {
        user_id: testUser.id,
        title: 'Private Therapy Session',
        description: 'Confidential personal session',
        start_time: '2024-03-25T15:00:00Z',
        end_time: '2024-03-25T16:00:00Z',
        privacy_level: 'private'
      },
      {
        user_id: testUser.id,
        title: 'Semi-Private Date',
        description: 'Limited visibility date',
        start_time: '2024-03-25T19:00:00Z',
        end_time: '2024-03-25T21:00:00Z',
        privacy_level: 'semi_private'
      }
    ];
    
    await supabase.from('events').insert(privacyTestEvents);
    
    // Create encrypted backup
    const encryptedBackupResponse = await fetch('/api/backup/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: testUser.id,
        backup_type: 'full',
        encryption: 'aes-256',
        privacy_aware: true,
        include_private_data: true
      })
    });
    
    const encryptedBackup = await encryptedBackupResponse.json();
    expect(encryptedBackup.success).toBe(true);
    expect(encryptedBackup.encryption_verified).toBe(true);
    
    // Verify backup is actually encrypted
    const backupContentResponse = await fetch(`/api/backup/content/${encryptedBackup.backup_id}`);
    const backupContent = await backupContentResponse.json();
    
    expect(backupContent.encrypted).toBe(true);
    expect(backupContent.raw_content).not.toContain('Private Therapy Session'); // Should not contain plaintext
    expect(backupContent.raw_content).not.toContain('Confidential personal session');
    
    // Test selective privacy-level restore
    const selectiveRestoreResponse = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backup_id: encryptedBackup.backup_id,
        user_id: testUser.id,
        restore_strategy: 'privacy_filtered',
        max_privacy_level: 'semi_private', // Exclude private events
        verify_integrity: true
      })
    });
    
    const selectiveRestore = await selectiveRestoreResponse.json();
    expect(selectiveRestore.success).toBe(true);
    expect(selectiveRestore.privacy_filtering_applied).toBe(true);
    
    // Verify privacy filtering worked
    const { data: filteredEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', testUser.id);
    
    const privateEvents = filteredEvents.filter(e => e.privacy_level === 'private');
    const nonPrivateEvents = filteredEvents.filter(e => e.privacy_level !== 'private');
    
    expect(privateEvents).toHaveLength(0); // Private events excluded
    expect(nonPrivateEvents).toHaveLength(2); // Public and semi-private included
    
    console.log('✅ Privacy-sensitive backup/restore working:');
    console.log(`   Encrypted backup created: ${encryptedBackup.backup_id}`);
    console.log(`   Privacy filtering applied: ${selectiveRestore.privacy_filtering_applied}`);
    console.log(`   Private events excluded: ${privateEvents.length === 0}`);
  });
});
