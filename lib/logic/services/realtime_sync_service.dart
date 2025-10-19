import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:developer' as developer;
import '../../core/supabase_client.dart';

/// Service to manage real-time event and contact synchronization
/// Listens for changes on Supabase and triggers callbacks to update local state
class RealtimeSyncService {
  static RealtimeChannel? _eventsChannel;
  static RealtimeChannel? _contactsChannel;

  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  // Event callbacks
  static Future<void> Function(Map<String, dynamic>)? onEventInserted;
  static Future<void> Function(Map<String, dynamic>, Map<String, dynamic>)?
      onEventUpdated;
  static Future<void> Function(Map<String, dynamic>)? onEventDeleted;

  // Contact callbacks
  static Future<void> Function(Map<String, dynamic>)? onContactInserted;
  static Future<void> Function(Map<String, dynamic>, Map<String, dynamic>)?
      onContactUpdated;
  static Future<void> Function(Map<String, dynamic>)? onContactDeleted;

  /// Subscribe to real-time changes on events table
  static Future<void> subscribeToEvents() async {
    if (!SupabaseService.isConfigured) {
      developer.log('Supabase not configured - skipping realtime subscription',
          name: 'RealtimeSyncService');
      return;
    }

    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        developer.log('Not authenticated - skipping realtime subscribe',
            name: 'RealtimeSyncService');
        return;
      }

      // Unsubscribe if already subscribed
      if (_eventsChannel != null) {
        await _eventsChannel!.unsubscribe();
      }

      developer.log('Subscribing to realtime events...',
          name: 'RealtimeSyncService');

      // Create a unique channel name per user
      _eventsChannel = _client.channel(
        'events:$userId',
        opts: const RealtimeChannelConfig(self: true),
      );

      // Listen for all changes on events table filtered by owner_id
      _eventsChannel!
          .onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: 'events',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'owner_id',
          value: userId,
        ),
        callback: (payload) async {
          final eventType = payload.eventType;
          final newRecord = payload.newRecord;
          final oldRecord = payload.oldRecord;

          developer.log(
            'Realtime event: $eventType',
            name: 'RealtimeSyncService',
          );

          // Handle different operation types
          switch (eventType) {
            case PostgresChangeEvent.insert:
              if (onEventInserted != null && newRecord.isNotEmpty) {
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

            case PostgresChangeEvent.update:
              if (onEventUpdated != null && newRecord.isNotEmpty) {
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

            case PostgresChangeEvent.delete:
              if (onEventDeleted != null && oldRecord.isNotEmpty) {
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

            case PostgresChangeEvent.all:
              // Should not receive 'all' as an event type in callbacks
              break;
          }
        },
      )
          .subscribe((status, err) {
        if (err != null) {
          developer.log(
            'Realtime subscription error: $err',
            name: 'RealtimeSyncService',
          );
        } else {
          developer.log(
            'Realtime events subscription status: $status',
            name: 'RealtimeSyncService',
          );
        }
      });
    } catch (e) {
      developer.log(
        'Failed to subscribe to realtime events: $e',
        name: 'RealtimeSyncService',
      );
    }
  }

  /// Subscribe to real-time changes on contacts table
  static Future<void> subscribeToContacts() async {
    if (!SupabaseService.isConfigured) {
      return;
    }

    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return;

      if (_contactsChannel != null) {
        await _contactsChannel!.unsubscribe();
      }

      developer.log('Subscribing to realtime contacts...',
          name: 'RealtimeSyncService');

      _contactsChannel = _client.channel(
        'contacts:$userId',
        opts: const RealtimeChannelConfig(self: true),
      );

      _contactsChannel!
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'contacts',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'owner_id',
              value: userId,
            ),
            callback: (payload) async {
              final eventType = payload.eventType;

              switch (eventType) {
                case PostgresChangeEvent.insert:
                  if (onContactInserted != null &&
                      payload.newRecord.isNotEmpty) {
                    await onContactInserted!(payload.newRecord);
                  }
                  break;
                case PostgresChangeEvent.update:
                  if (onContactUpdated != null &&
                      payload.newRecord.isNotEmpty) {
                    await onContactUpdated!(
                        payload.newRecord, payload.oldRecord);
                  }
                  break;
                case PostgresChangeEvent.delete:
                  if (onContactDeleted != null &&
                      payload.oldRecord.isNotEmpty) {
                    await onContactDeleted!(payload.oldRecord);
                  }
                  break;
                case PostgresChangeEvent.all:
                  // Should not receive 'all' as an event type in callbacks
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
      developer.log('Unsubscribed from all realtime channels',
          name: 'RealtimeSyncService');
    } catch (e) {
      developer.log('Error unsubscribing: $e', name: 'RealtimeSyncService');
    }
  }

  /// Check if currently subscribed to events
  static bool get isSubscribedToEvents => _eventsChannel != null;

  /// Check if currently subscribed to contacts
  static bool get isSubscribedToContacts => _contactsChannel != null;
}
