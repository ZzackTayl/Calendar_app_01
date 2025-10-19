# 🔄 Real-Time Sync Implementation Guide

**Priority:** CRITICAL  
**Estimated Time:** 6-8 hours  
**Complexity:** HIGH  
**Dependencies:** Supabase Realtime (already available)

---

## Overview

This guide provides step-by-step implementation of real-time synchronization across devices. Changes on Device A (create/update/delete events) will be **immediately pushed to Device B and Device C** without requiring manual refresh.

---

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Device A      │         │   Device B      │         │   Device C      │
│  (iPhone)       │         │  (Android)      │         │  (Web)          │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                          │                          │
         │ Creates Event           │ Subscribes               │ Subscribes
         │                          │ (Realtime)              │ (Realtime)
         ├─────────────────────────►│                          │
         │                          │                          │
         │ POST /events             │                          │
         │ (INSERT event)           │                          │
         │                          │                          │
         └──────────────────────────┼──────────────────────────►
         │                      ┌───▼───────────────────────┐   │
         │                      │   Supabase Database       │   │
         │                      │   events table            │   │
         │                      └───┬───────────────────────┘   │
         │                          │                          │
         │                     Broadcasts INSERT event via Realtime
         │                          │                          │
         │◄──────────────────────────┼──────────────────────────┤
         │                          ▼                          ▼
         │              Receives and displays     Receives and displays
         │              instantly! 🎉             instantly! 🎉
```

---

## Step-by-Step Implementation

### Step 1: Add Realtime Dependencies

Check that `supabase_flutter` includes realtime (it does by default).

**File:** `pubspec.yaml`
```yaml
dependencies:
  supabase_flutter: ^2.x.x  # Already included
  # No new packages needed - Realtime is built-in!
```

### Step 2: Create Realtime Service

**File:** `lib/logic/services/realtime_sync_service.dart` (NEW)

```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:developer' as developer;
import '../../domain/event.dart';
import '../../core/supabase_client.dart';

/// Service to manage real-time event synchronization
/// Listens for changes on Supabase and updates local state
class RealtimeSyncService {
  static RealtimeChannel? _eventsChannel;
  static RealtimeChannel? _contactsChannel;
  static RealtimeChannel? _calendarsChannel;
  
  static SupabaseClient get _client => SupabaseService.clientOrThrow;
  
  /// Called when event is inserted remotely
  static Future<void> Function(Map<String, dynamic>)? onEventInserted;
  
  /// Called when event is updated remotely
  static Future<void> Function(Map<String, dynamic>, Map<String, dynamic>)?
      onEventUpdated;
  
  /// Called when event is deleted remotely
  static Future<void> Function(Map<String, dynamic>)? onEventDeleted;
  
  /// Same for contacts and calendars
  static Future<void> Function(Map<String, dynamic>)? onContactInserted;
  static Future<void> Function(Map<String, dynamic>, Map<String, dynamic>)?
      onContactUpdated;
  static Future<void> Function(Map<String, dynamic>)? onContactDeleted;

  /// Subscribe to real-time changes on events table
  static Future<void> subscribeToEvents() async {
    if (!SupabaseService.isConfigured) return;
    
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        developer.log('Not authenticated - skipping Realtime subscribe');
        return;
      }

      // Unsubscribe if already subscribed
      if (_eventsChannel != null) {
        await _eventsChannel!.unsubscribe();
      }

      developer.log('Subscribing to Realtime events...', name: 'RealtimeSyncService');

      // Subscribe to the events table filtered by owner_id
      _eventsChannel = _client.realtime.channel(
        'realtime:events:owner_id=eq.$userId',
      );

      // Listen for all changes (INSERT, UPDATE, DELETE)
      _eventsChannel!
          .on(
            RealtimeListenTypes.postgresChanges,
            ChannelFilter(
              event: '*', // All events
              schema: 'public',
              table: 'events',
              filter: 'owner_id=eq.$userId',
            ),
            (payload, [ref]) async {
              final eventType = payload.eventType;
              final newRecord = payload.newRecord;
              final oldRecord = payload.oldRecord;

              developer.log(
                'Realtime event: $eventType',
                name: 'RealtimeSyncService',
              );

              // Handle different operation types
              switch (eventType) {
                case 'INSERT':
                  // Event created on another device
                  if (onEventInserted != null) {
                    try {
                      await onEventInserted!(newRecord);
                      developer.log(
                        'Inserted event: ${newRecord['id']}',
                        name: 'RealtimeSyncService',
                      );
                    } catch (e) {
                      developer.log(
                        'Error handling INSERT: $e',
                        name: 'RealtimeSyncService',
                      );
                    }
                  }
                  break;

                case 'UPDATE':
                  // Event modified on another device
                  if (onEventUpdated != null) {
                    try {
                      await onEventUpdated!(newRecord, oldRecord);
                      developer.log(
                        'Updated event: ${newRecord['id']}',
                        name: 'RealtimeSyncService',
                      );
                    } catch (e) {
                      developer.log(
                        'Error handling UPDATE: $e',
                        name: 'RealtimeSyncService',
                      );
                    }
                  }
                  break;

                case 'DELETE':
                  // Event deleted on another device
                  if (onEventDeleted != null) {
                    try {
                      await onEventDeleted!(oldRecord);
                      developer.log(
                        'Deleted event: ${oldRecord['id']}',
                        name: 'RealtimeSyncService',
                      );
                    } catch (e) {
                      developer.log(
                        'Error handling DELETE: $e',
                        name: 'RealtimeSyncService',
                      );
                    }
                  }
                  break;
              }
            },
          )
          .subscribe((status, err) {
            if (err != null) {
              developer.log(
                'Realtime subscription error: $err',
                name: 'RealtimeSyncService',
                level: Level.warning,
              );
            } else {
              developer.log(
                'Realtime subscription established: $status',
                name: 'RealtimeSyncService',
              );
            }
          });
    } catch (e) {
      developer.log(
        'Failed to subscribe to Realtime: $e',
        name: 'RealtimeSyncService',
        level: Level.severe,
      );
    }
  }

  /// Subscribe to real-time changes on contacts table
  static Future<void> subscribeToContacts() async {
    if (!SupabaseService.isConfigured) return;

    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return;

      if (_contactsChannel != null) {
        await _contactsChannel!.unsubscribe();
      }

      developer.log('Subscribing to Realtime contacts...', name: 'RealtimeSyncService');

      _contactsChannel = _client.realtime.channel(
        'realtime:contacts:owner_id=eq.$userId',
      );

      _contactsChannel!
          .on(
            RealtimeListenTypes.postgresChanges,
            ChannelFilter(
              event: '*',
              schema: 'public',
              table: 'contacts',
              filter: 'owner_id=eq.$userId',
            ),
            (payload, [ref]) async {
              final eventType = payload.eventType;

              switch (eventType) {
                case 'INSERT':
                  if (onContactInserted != null) {
                    await onContactInserted!(payload.newRecord);
                  }
                  break;
                case 'UPDATE':
                  if (onContactUpdated != null) {
                    await onContactUpdated!(payload.newRecord, payload.oldRecord);
                  }
                  break;
                case 'DELETE':
                  if (onContactDeleted != null) {
                    await onContactDeleted!(payload.oldRecord);
                  }
                  break;
              }
            },
          )
          .subscribe();
    } catch (e) {
      developer.log(
        'Failed to subscribe to contacts: $e',
        name: 'RealtimeSyncService',
      );
    }
  }

  /// Unsubscribe from all real-time channels
  static Future<void> unsubscribeAll() async {
    try {
      if (_eventsChannel != null) {
        await _eventsChannel!.unsubscribe();
        _eventsChannel = null;
      }
      if (_contactsChannel != null) {
        await _contactsChannel!.unsubscribe();
        _contactsChannel = null;
      }
      if (_calendarsChannel != null) {
        await _calendarsChannel!.unsubscribe();
        _calendarsChannel = null;
      }
      developer.log('Unsubscribed from all Realtime channels',
          name: 'RealtimeSyncService');
    } catch (e) {
      developer.log('Error unsubscribing: $e', name: 'RealtimeSyncService');
    }
  }
}
```

### Step 3: Update Event Providers

**File:** `lib/logic/providers/event_providers.dart` (MODIFY)

```dart
// At the top, add:
import '../services/realtime_sync_service.dart';

// Modify the build method:
@riverpod
class EventList extends _$EventList {
  List<CalendarEvent> _offlineEvents = const [];

  bool get _useSupabase => SupabaseService.isConfigured;

  @override
  Future<List<CalendarEvent>> build() async {
    if (!_useSupabase) {
      _offlineEvents = await OfflineCacheService.loadEvents();
      return List.unmodifiable(_offlineEvents);
    }

    // Get initial events
    final result = await CalendarApi.getEvents();
    final events = result.when(
      success: (events) => events,
      failure: (message, exception) => throw Exception(message),
    );

    // ✨ NEW: Set up real-time listeners
    _setupRealtimeListeners();

    // Cleanup on dispose
    ref.onDispose(() {
      RealtimeSyncService.unsubscribeAll();
    });

    return events;
  }

  void _setupRealtimeListeners() {
    // Handle remote inserts
    RealtimeSyncService.onEventInserted = (record) async {
      final event = CalendarEvent.fromJson(record);
      await addEvent(event);
    };

    // Handle remote updates
    RealtimeSyncService.onEventUpdated = (newRecord, oldRecord) async {
      final event = CalendarEvent.fromJson(newRecord);
      await updateEvent(event);
    };

    // Handle remote deletes
    RealtimeSyncService.onEventDeleted = (record) async {
      final event = CalendarEvent.fromJson(record);
      await deleteEvent(event.id);
    };

    // Start listening
    RealtimeSyncService.subscribeToEvents();
  }

  // Rest of the code remains the same...
  
  Future<void> addEvent(CalendarEvent event) async {
    // ... existing code
  }

  Future<void> updateEvent(CalendarEvent event) async {
    // ... existing code
  }

  Future<void> deleteEvent(String eventId) async {
    // ... existing code
  }
}
```

### Step 4: Initialize Realtime in App Shell

**File:** `lib/main.dart` or your app initialization (MODIFY)

```dart
// In your AppShell or root widget build method:
@override
void initState() {
  super.initState();
  
  // Initialize Realtime syncing when app starts
  if (SupabaseService.isConfigured) {
    _initializeRealtimeSync();
  }
}

Future<void> _initializeRealtimeSync() async {
  // Subscribe to real-time changes when user is authenticated
  if (SupabaseService.isAuthenticated) {
    await RealtimeSyncService.subscribeToEvents();
    await RealtimeSyncService.subscribeToContacts();
  }
}
```

### Step 5: Add Conflict Resolution

**File:** `lib/logic/services/conflict_resolution_service.dart` (NEW)

```dart
import '../../domain/event.dart';
import 'dart:developer' as developer;

enum ConflictResolutionStrategy {
  /// Keep the most recently modified version
  lastWriteWins,
  
  /// Merge non-conflicting fields
  intelligentMerge,
  
  /// Always use local version
  preferLocal,
  
  /// Always use remote version
  preferRemote,
}

class ConflictResolutionService {
  static ConflictResolutionStrategy strategy = 
      ConflictResolutionStrategy.lastWriteWins;

  /// Resolve conflict between local and remote versions
  static CalendarEvent resolveConflict({
    required CalendarEvent localVersion,
    required CalendarEvent remoteVersion,
  }) {
    developer.log(
      'Resolving conflict for event: ${localVersion.id}',
      name: 'ConflictResolutionService',
    );

    switch (strategy) {
      case ConflictResolutionStrategy.lastWriteWins:
        return _lastWriteWins(localVersion, remoteVersion);
      
      case ConflictResolutionStrategy.intelligentMerge:
        return _intelligentMerge(localVersion, remoteVersion);
      
      case ConflictResolutionStrategy.preferLocal:
        return localVersion;
      
      case ConflictResolutionStrategy.preferRemote:
        return remoteVersion;
    }
  }

  /// Last-Write-Wins: Keep whichever version was modified most recently
  static CalendarEvent _lastWriteWins(
    CalendarEvent local,
    CalendarEvent remote,
  ) {
    final localTime = local.updatedAt ?? local.createdAt;
    final remoteTime = remote.updatedAt ?? remote.createdAt;

    if (localTime.isAfter(remoteTime)) {
      developer.log('Local version wins', name: 'ConflictResolutionService');
      return local;
    } else {
      developer.log('Remote version wins', name: 'ConflictResolutionService');
      return remote;
    }
  }

  /// Intelligent Merge: Take non-conflicting changes from both versions
  static CalendarEvent _intelligentMerge(
    CalendarEvent local,
    CalendarEvent remote,
  ) {
    developer.log(
      'Merging versions intelligently',
      name: 'ConflictResolutionService',
    );

    // Start with remote as base
    var merged = remote;

    // If local title is different and more recent, use it
    if (local.title != remote.title &&
        (local.updatedAt ?? local.createdAt)
            .isAfter(remote.updatedAt ?? remote.createdAt)) {
      merged = merged.copyWith(title: local.title);
    }

    // Apply same logic to other important fields
    // This way, if user A changed title and user B changed time,
    // both changes are preserved
    
    return merged;
  }
}
```

### Step 6: Add Sync Status UI

**File:** `lib/logic/providers/sync_status_provider.dart` (NEW)

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'sync_status_provider.g.dart';

enum SyncStatus {
  syncing,
  synced,
  error,
  offline,
}

@riverpod
class SyncStatusNotifier extends _$SyncStatusNotifier {
  @override
  SyncStatus build() {
    return SyncStatus.synced;
  }

  void setSyncing() => state = SyncStatus.syncing;
  void setSynced() => state = SyncStatus.synced;
  void setError() => state = SyncStatus.error;
  void setOffline() => state = SyncStatus.offline;
}

// Show sync status in UI
@riverpod
String syncStatusText(Ref ref) {
  final status = ref.watch(syncStatusNotifierProvider);
  
  switch (status) {
    case SyncStatus.syncing:
      return 'Syncing...';
    case SyncStatus.synced:
      return 'Synced';
    case SyncStatus.error:
      return 'Sync error';
    case SyncStatus.offline:
      return 'Offline';
  }
}
```

---

## Testing the Implementation

### Manual Testing

```dart
// 1. Open app on Device A (iPhone)
// 2. Open app on Device B (Android)
// 3. Create event on Device A
// 4. ✅ Event should appear on Device B immediately (no refresh needed!)

// 5. Edit event on Device B
// 6. ✅ Changes should appear on Device A immediately

// 7. Go offline on Device B
// 8. Make changes on Device A
// 9. Go online on Device B
// 10. ✅ Changes from Device A should sync to Device B
```

### Unit Tests

**File:** `test/logic/services/realtime_sync_service_test.dart` (NEW)

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('RealtimeSyncService', () {
    test('calls onEventInserted when INSERT event received', () async {
      // Mock implementation
      var called = false;
      RealtimeSyncService.onEventInserted = (record) async {
        called = true;
      };

      // Simulate Realtime event
      // ... test code
      
      expect(called, true);
    });

    test('calls onEventUpdated when UPDATE event received', () async {
      // Test update handling
    });

    test('calls onEventDeleted when DELETE event received', () async {
      // Test delete handling
    });
  });
}
```

---

## Deployment Checklist

- [ ] Supabase Realtime enabled on production instance
- [ ] Row-Level Security (RLS) policies configured on events table
- [ ] `realtime` schema enabled for events, contacts, calendars tables
- [ ] Tested on Android, iOS, Web, macOS
- [ ] Conflict resolution strategy documented
- [ ] Error handling tested (network failures, auth timeouts)
- [ ] Sync status UI shows in dashboard
- [ ] Performance tested with 100+ events

---

## Troubleshooting

### Real-time not working?

1. **Check Supabase Realtime is enabled**
   ```bash
   # In Supabase Dashboard:
   # Settings → Database → Replication → Make sure tables have replication enabled
   ```

2. **Check RLS policies allow reading your own events**
   ```sql
   -- Should be something like:
   CREATE POLICY "Users can view own events"
   ON events FOR SELECT
   USING (auth.uid() = owner_id);
   ```

3. **Check authentication**
   ```dart
   if (SupabaseService.isAuthenticated) {
     print('Authenticated: ${SupabaseService.currentUser?.id}');
   } else {
     print('Not authenticated - Realtime won\'t work');
   }
   ```

4. **Check WebSocket connection**
   - Open DevTools Console in Web version
   - Look for `ws:` WebSocket messages
   - Should see connection to `wss://...`

### Conflicts happening?

1. Implement conflict detection more strictly
2. Add timestamps to all events
3. Consider queueing updates if conflict detected
4. Show user a "merge" dialog

### Performance issues?

1. Only subscribe to tables you need (events, contacts)
2. Add filters to reduce payload size
3. Batch updates instead of individual updates
4. Consider debouncing rapid updates

---

## Next Steps

After implementing real-time sync:

1. **Sync Queue** - Handle offline changes
2. **Google Calendar** - Bidirectional sync
3. **Apple Calendar** - EventKit integration
4. **Advanced UI** - Show sync status, conflicts, retry options

Would you like me to implement any of these?
