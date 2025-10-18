import 'dart:developer' as developer;
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../domain/user_calendar.dart';
import '../../domain/notification.dart' as notifications;
import '../../domain/availability_signal.dart';
import '../../domain/enums.dart';

/// Real Supabase API service for MyOrbit
class CalendarApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Get all events for the current user
  static Future<Result<List<CalendarEvent>>> getEvents() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('events')
          .select()
          .eq('owner_id', userId)
          .order('start', ascending: true);

      final events = (response as List).map((json) => CalendarEvent.fromJson(json)).toList();

      return Success(events);
    } on SocketException catch (e) {
      developer.log('Network error fetching events: $e', name: 'CalendarApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching events: $e', name: 'CalendarApi');
      return Failure('Failed to load events from server.', e);
    } catch (e) {
      developer.log('Error fetching events: $e', name: 'CalendarApi');
      return Failure('Failed to load events.', e as Exception?);
    }
  }

  /// Get the set of visible calendar IDs stored for the current user.
  static Future<Result<Set<String>>> getVisibleCalendars() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response =
          await _client.from('calendar_visibility').select().eq('owner_id', userId).maybeSingle();

      if (response == null) {
        return const Success({});
      }

      final ids =
          (response['visible_calendar_ids'] as List<dynamic>? ?? []).whereType<String>().toSet();
      return Success(ids);
    } on SocketException catch (e) {
      developer.log('Network error fetching calendar visibility: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching calendar visibility: $e', name: 'CalendarApi');
      return Failure('Failed to load calendar visibility.', e);
    } catch (e) {
      developer.log('Error fetching calendar visibility: $e', name: 'CalendarApi');
      return Failure('Failed to load calendar visibility.', e as Exception?);
    }
  }

  /// Persist the set of visible calendar IDs for the current user.
  static Future<Result<void>> setVisibleCalendars(Set<String> ids) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client.from('calendar_visibility').upsert(
        {
          'owner_id': userId,
          'visible_calendar_ids': ids.toList(growable: false),
          'updated_at': DateTime.now().toIso8601String(),
        },
        onConflict: 'owner_id',
      );

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error saving calendar visibility: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error saving calendar visibility: $e', name: 'CalendarApi');
      return Failure('Failed to save calendar visibility.', e);
    } catch (e) {
      developer.log('Error saving calendar visibility: $e', name: 'CalendarApi');
      return Failure('Failed to save calendar visibility.', e as Exception?);
    }
  }

  /// Get connected calendars for the current user.
  static Future<Result<List<UserCalendar>>> getCalendars() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('calendars')
          .select()
          .eq('owner_id', userId)
          .order('is_primary', ascending: false)
          .order('name', ascending: true);

      final calendars =
          (response as List).map((json) => UserCalendar.fromJson(json)).toList(growable: false);

      return Success(calendars);
    } on SocketException catch (e) {
      developer.log('Network error fetching calendars: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching calendars: $e', name: 'CalendarApi');
      return Failure('Failed to load calendars from server.', e);
    } catch (e) {
      developer.log('Error fetching calendars: $e', name: 'CalendarApi');
      return Failure('Failed to load calendars.', e as Exception?);
    }
  }

  /// Create a new event
  static Future<Result<CalendarEvent>> createEvent(CalendarEvent event) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final now = DateTime.now();
      final eventData = event.copyWith(
        ownerId: userId,
        createdAt: now,
        updatedAt: now,
      );

      final response =
          await _client.from('events').insert(eventData.toDatabaseInsertMap()).select().single();

      return Success(CalendarEvent.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error creating event: $e', name: 'CalendarApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error creating event: $e', name: 'CalendarApi');
      return Failure('Failed to create event.', e);
    } catch (e) {
      developer.log('Error creating event: $e', name: 'CalendarApi');
      return Failure('Failed to create event.', e as Exception?);
    }
  }

  /// Update an existing event
  static Future<Result<CalendarEvent>> updateEvent(CalendarEvent event) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final eventData = event.copyWith(updatedAt: DateTime.now());

      final response = await _client
          .from('events')
          .update(eventData.toDatabaseUpdateMap())
          .eq('id', event.id)
          .eq('owner_id', userId) // Ensure user can only update their own events
          .select()
          .single();

      return Success(CalendarEvent.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error updating event: $e', name: 'CalendarApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error updating event: $e', name: 'CalendarApi');
      return Failure('Failed to update event.', e);
    } catch (e) {
      developer.log('Error updating event: $e', name: 'CalendarApi');
      return Failure('Failed to update event.', e as Exception?);
    }
  }

  /// Delete an event
  static Future<Result<void>> deleteEvent(String eventId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client
          .from('events')
          .delete()
          .eq('id', eventId)
          .eq('owner_id', userId); // Ensure user can only delete their own events

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting event: $e', name: 'CalendarApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error deleting event: $e', name: 'CalendarApi');
      return Failure('Failed to delete event.', e);
    } catch (e) {
      developer.log('Error deleting event: $e', name: 'CalendarApi');
      return Failure('Failed to delete event.', e as Exception?);
    }
  }

  /// Get events for a specific date range
  static Future<Result<List<CalendarEvent>>> getEventsForDateRange(
    DateTime startDate,
    DateTime endDate,
  ) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('events')
          .select()
          .eq('owner_id', userId)
          .gte('start', startDate.toIso8601String())
          .lte('end', endDate.toIso8601String())
          .order('start', ascending: true);

      final events = (response as List).map((json) => CalendarEvent.fromJson(json)).toList();

      return Success(events);
    } on SocketException catch (e) {
      developer.log('Network error fetching events for date range: $e', name: 'CalendarApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching events for date range: $e', name: 'CalendarApi');
      return Failure('Failed to load events from server.', e);
    } catch (e) {
      developer.log('Error fetching events for date range: $e', name: 'CalendarApi');
      return Failure('Failed to load events.', e as Exception?);
    }
  }

  // ======================================================================
  // EVENT INVITE METHODS
  // ======================================================================

  /// Respond to an event invitation
  static Future<Result<void>> respondToEventInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      // Update the invite status
      await _client.from('event_invites').update({
        'status': response.name,
        'responded_at': DateTime.now().toIso8601String(),
      }).eq('id', inviteId);

      // Fetch the event and invite details to create notification
      final inviteData = await _client
          .from('event_invites')
          .select('event_id, contact_id')
          .eq('id', inviteId)
          .single();

      final eventData = await _client
          .from('events')
          .select('owner_id, title')
          .eq('id', inviteData['event_id'])
          .single();

      // Create notification for event owner
      final currentProfile =
          await _client.from('profiles').select('display_name').eq('id', userId).single();

      String notificationMessage;
      switch (response) {
        case InviteStatus.accepted:
          notificationMessage =
              '${currentProfile['display_name']} accepted your invite to "${eventData['title']}"';
          break;
        case InviteStatus.declined:
          notificationMessage =
              '${currentProfile['display_name']} declined your invite to "${eventData['title']}"';
          break;
        case InviteStatus.pending:
          // Maybe response
          notificationMessage =
              '${currentProfile['display_name']} responded "Maybe" to "${eventData['title']}"';
          break;
      }

      await _client.from('notifications').insert({
        'user_id': eventData['owner_id'],
        'type': 'event-update',
        'title': notificationMessage,
        'body': note ?? 'Tap to view event details',
        'data': {
          'event_id': inviteData['event_id'],
          'invite_id': inviteId,
          'response': response.name,
        },
        'created_at': DateTime.now().toIso8601String(),
      });

      developer.log(
        'Responded to invite $inviteId with $response',
        name: 'CalendarApi',
      );

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error responding to invite: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error responding to invite: $e', name: 'CalendarApi');
      return Failure('Failed to respond to invite.', e);
    } catch (e) {
      developer.log('Error responding to invite: $e', name: 'CalendarApi');
      return Failure('Failed to respond to invite.', e as Exception?);
    }
  }

  /// Get pending event invites for current user
  static Future<Result<List<EventInvite>>> getPendingInvites() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      // Get user's contacts to find their own contact_id
      final userContact =
          await _client.from('contacts').select('id').eq('external_user_id', userId).maybeSingle();

      if (userContact == null) {
        return const Success([]);
      }

      final response = await _client
          .from('event_invites')
          .select()
          .eq('contact_id', userContact['id'])
          .eq('status', 'pending')
          .order('created_at', ascending: false);

      final invites = (response as List).map((json) => EventInvite.fromJson(json)).toList();

      return Success(invites);
    } on SocketException catch (e) {
      developer.log('Network error fetching invites: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching invites: $e', name: 'CalendarApi');
      return Failure('Failed to load invites.', e);
    } catch (e) {
      developer.log('Error fetching invites: $e', name: 'CalendarApi');
      return Failure('Failed to load invites.', e as Exception?);
    }
  }

  /// Get event details for an invite
  static Future<Result<CalendarEvent>> getEventForInvite(String inviteId) async {
    try {
      final inviteData =
          await _client.from('event_invites').select('event_id').eq('id', inviteId).single();

      final eventData =
          await _client.from('events').select().eq('id', inviteData['event_id']).single();

      final event = CalendarEvent.fromJson(eventData);
      return Success(event);
    } on SocketException catch (e) {
      developer.log('Network error fetching event: $e', name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching event: $e', name: 'CalendarApi');
      return Failure('Failed to load event.', e);
    } catch (e) {
      developer.log('Error fetching event: $e', name: 'CalendarApi');
      return Failure('Failed to load event.', e as Exception?);
    }
  }
}

/// Contact API service
class ContactApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Get all contacts for the current user
  static Future<Result<List<Contact>>> getContacts() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('contacts')
          .select()
          .eq('owner_id', userId)
          .order('name', ascending: true);

      final contacts = (response as List).map((json) => Contact.fromJson(json)).toList();
      return Success(contacts);
    } on SocketException catch (e) {
      developer.log('Network error fetching contacts: $e', name: 'ContactApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching contacts: $e', name: 'ContactApi');
      return Failure('Failed to load contacts from server.', e);
    } catch (e) {
      developer.log('Error fetching contacts: $e', name: 'ContactApi');
      return Failure('Failed to load contacts.', e as Exception?);
    }
  }

  /// Create a new contact
  static Future<Result<Contact>> createContact(Contact contact) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final contactData = contact.copyWith(ownerId: userId, createdAt: DateTime.now());

      final response =
          await _client.from('contacts').insert(contactData.toJson()).select().single();

      return Success(Contact.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error creating contact: $e', name: 'ContactApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error creating contact: $e', name: 'ContactApi');
      return Failure('Failed to create contact.', e);
    } catch (e) {
      developer.log('Error creating contact: $e', name: 'ContactApi');
      return Failure('Failed to create contact.', e as Exception?);
    }
  }

  /// Update an existing contact
  static Future<Result<Contact>> updateContact(Contact contact) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final contactData = contact.copyWith(updatedAt: DateTime.now());

      final response = await _client
          .from('contacts')
          .update(contactData.toJson())
          .eq('id', contact.id)
          .eq('owner_id', userId)
          .select()
          .single();

      return Success(Contact.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error updating contact: $e', name: 'ContactApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error updating contact: $e', name: 'ContactApi');
      return Failure('Failed to update contact.', e);
    } catch (e) {
      developer.log('Error updating contact: $e', name: 'ContactApi');
      return Failure('Failed to update contact.', e as Exception?);
    }
  }

  /// Delete a contact
  static Future<Result<void>> deleteContact(String contactId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client.from('contacts').delete().eq('id', contactId).eq('owner_id', userId);

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting contact: $e', name: 'ContactApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error deleting contact: $e', name: 'ContactApi');
      return Failure('Failed to delete contact.', e);
    } catch (e) {
      developer.log('Error deleting contact: $e', name: 'ContactApi');
      return Failure('Failed to delete contact.', e as Exception?);
    }
  }
}

/// Availability Signal API service
class SignalApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  static Future<Result<List<AvailabilitySignal>>> getSignalsForCurrentUser() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('availability_signals')
          .select()
          .eq('owner_id', userId)
          .order('start_time', ascending: true);

      final signals = (response as List)
          .whereType<Map<String, dynamic>>()
          .map(_mapSignalFromSupabase)
          .toList(growable: false);

      return Success(signals);
    } on SocketException catch (e) {
      developer.log('Network error fetching availability signals: $e', name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching availability signals: $e', name: 'SignalApi');
      return Failure('Failed to load availability signals.', e);
    } catch (e) {
      developer.log('Error fetching availability signals: $e', name: 'SignalApi');
      return Failure('Failed to load availability signals.', e as Exception?);
    }
  }

  static Future<Result<AvailabilitySignal>> createSignal(AvailabilitySignal signal) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final payload = {
        'id': signal.id,
        'owner_id': userId,
        'signal_type': signal.signalType.name,
        'start_time': signal.startTime.toIso8601String(),
        'end_time': signal.endTime.toIso8601String(),
        'duration': signal.duration?.name,
        'message': signal.message,
        'created_at': signal.createdAt.toIso8601String(),
      };

      final response = await _client.from('availability_signals').insert(payload).select().single();

      return Success(_mapSignalFromSupabase(response));
    } on SocketException catch (e) {
      developer.log('Network error creating availability signal: $e', name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error creating availability signal: $e', name: 'SignalApi');
      return Failure('Failed to create availability signal.', e);
    } catch (e) {
      developer.log('Error creating availability signal: $e', name: 'SignalApi');
      return Failure('Failed to create availability signal.', e as Exception?);
    }
  }

  static Future<Result<AvailabilitySignal>> updateSignal(AvailabilitySignal signal) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final payload = {
        'signal_type': signal.signalType.name,
        'start_time': signal.startTime.toIso8601String(),
        'end_time': signal.endTime.toIso8601String(),
        'duration': signal.duration?.name,
        'message': signal.message,
      };

      final response = await _client
          .from('availability_signals')
          .update(payload)
          .eq('id', signal.id)
          .eq('owner_id', userId)
          .select()
          .single();

      return Success(_mapSignalFromSupabase(response));
    } on SocketException catch (e) {
      developer.log('Network error updating availability signal: $e', name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error updating availability signal: $e', name: 'SignalApi');
      return Failure('Failed to update availability signal.', e);
    } catch (e) {
      developer.log('Error updating availability signal: $e', name: 'SignalApi');
      return Failure('Failed to update availability signal.', e as Exception?);
    }
  }

  static Future<Result<void>> cancelSignal(String signalId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client
          .from('availability_signals')
          .update({
            'end_time': DateTime.now().toIso8601String(),
          })
          .eq('id', signalId)
          .eq('owner_id', userId);

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error cancelling availability signal: $e', name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error cancelling availability signal: $e', name: 'SignalApi');
      return Failure('Failed to cancel availability signal.', e);
    } catch (e) {
      developer.log('Error cancelling availability signal: $e', name: 'SignalApi');
      return Failure('Failed to cancel availability signal.', e as Exception?);
    }
  }

  static Future<Result<void>> shareSignalWithPartners({
    required String signalId,
    required List<String> partnerIds,
  }) async {
    if (partnerIds.isEmpty) {
      return const Success(null);
    }

    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final rows = partnerIds
          .map(
            (partnerId) => {
              'signal_id': signalId,
              'shared_by_user_id': userId,
              'shared_with_user_id': partnerId,
            },
          )
          .toList(growable: false);

      await _client.from('signal_shares').insert(rows);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error sharing availability signal: $e', name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error sharing availability signal: $e', name: 'SignalApi');
      return Failure('Failed to share availability signal.', e);
    } catch (e) {
      developer.log('Error sharing availability signal: $e', name: 'SignalApi');
      return Failure('Failed to share availability signal.', e as Exception?);
    }
  }

  static AvailabilitySignal _mapSignalFromSupabase(Map<String, dynamic> json) {
    final signalTypeString = json['signal_type'] as String?;
    final durationString = json['duration'] as String?;

    final signalType = signalTypeString != null
        ? SignalType.values.firstWhere(
            (value) => value.name == signalTypeString,
            orElse: () => SignalType.available,
          )
        : SignalType.available;

    final duration = durationString != null
        ? SignalDuration.values.firstWhere(
            (value) => value.name == durationString,
            orElse: () => SignalDuration.custom,
          )
        : null;

    final startRaw = json['start_time'] ?? json['start'] ?? json['start_date'];
    final endRaw = json['end_time'] ?? json['end'] ?? json['end_date'];
    final createdRaw = json['created_at'] ?? json['createdAt'];

    final startTime = _parseDateTime(startRaw) ?? DateTime.now();
    final endTime = _parseDateTime(endRaw) ?? startTime.add(const Duration(hours: 1));
    final createdAt = _parseDateTime(createdRaw) ?? startTime;

    return AvailabilitySignal(
      id: json['id'] as String,
      userId: json['owner_id'] as String? ?? '',
      signalType: signalType,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      message: json['message'] as String?,
      createdAt: createdAt,
    );
  }

  static DateTime? _parseDateTime(Object? value) {
    if (value == null) {
      return null;
    }
    if (value is DateTime) {
      return value;
    }
    if (value is String && value.isNotEmpty) {
      return DateTime.tryParse(value);
    }
    return null;
  }
}

/// Notifications API service
class NotificationApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  static Future<Result<List<notifications.Notification>>> getNotifications() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('notifications')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      final items = (response as List)
          .whereType<Map<String, dynamic>>()
          .map(_mapSupabaseNotification)
          .toList(growable: false);

      return Success(items);
    } on SocketException catch (e) {
      developer.log('Network error fetching notifications: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching notifications: $e', name: 'NotificationApi');
      return Failure('Failed to load notifications.', e);
    } catch (e) {
      developer.log('Error fetching notifications: $e', name: 'NotificationApi');
      return Failure('Failed to load notifications.', e as Exception?);
    }
  }

  static Future<Result<void>> markAsRead(String notificationId) async {
    try {
      await _client.from('notifications').update({
        'is_read': true,
        'read_at': DateTime.now().toIso8601String(),
      }).eq('id', notificationId);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error marking notification as read: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error marking notification as read: $e', name: 'NotificationApi');
      return Failure('Failed to update notification.', e);
    } catch (e) {
      developer.log('Error marking notification as read: $e', name: 'NotificationApi');
      return Failure('Failed to update notification.', e as Exception?);
    }
  }

  static Future<Result<void>> markAllAsRead() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client.from('notifications').update({
        'is_read': true,
        'read_at': DateTime.now().toIso8601String(),
      }).eq('user_id', userId);

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error marking all notifications as read: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error marking all notifications as read: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notifications.', e);
    } catch (e) {
      developer.log('Error marking all notifications as read: $e', name: 'NotificationApi');
      return Failure('Failed to update notifications.', e as Exception?);
    }
  }

  static Future<Result<void>> updateNotificationState(
    String notificationId, {
    Map<String, dynamic>? metadata,
    bool? isDismissed,
    bool? showInCenter,
  }) async {
    final payload = <String, dynamic>{};
    if (metadata != null) {
      payload['data'] = metadata;
    }
    if (isDismissed != null) {
      payload['is_dismissed'] = isDismissed;
    }
    if (showInCenter != null) {
      payload['show_in_center'] = showInCenter;
    }

    if (payload.isEmpty) {
      return const Success(null);
    }

    try {
      await _client.from('notifications').update(payload).eq('id', notificationId);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error updating notification state: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error updating notification state: $e', name: 'NotificationApi');
      return Failure('Failed to update notification.', e);
    } catch (e) {
      developer.log('Error updating notification state: $e', name: 'NotificationApi');
      return Failure('Failed to update notification.', e as Exception?);
    }
  }

  static Future<Result<void>> bulkDismissNotifications(
    List<String> notificationIds,
  ) async {
    if (notificationIds.isEmpty) {
      return const Success(null);
    }

    try {
      final formattedIds = '(${notificationIds.map((id) => '"$id"').join(',')})';

      await _client.from('notifications').update({
        'is_dismissed': true,
      }).filter('id', 'in', formattedIds);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error bulk dismissing notifications: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error bulk dismissing notifications: $e', name: 'NotificationApi');
      return Failure('Failed to update notifications.', e);
    } catch (e) {
      developer.log('Error bulk dismissing notifications: $e', name: 'NotificationApi');
      return Failure('Failed to update notifications.', e as Exception?);
    }
  }

  static Future<Result<void>> deleteNotification(String notificationId) async {
    try {
      await _client.from('notifications').delete().eq('id', notificationId);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting notification: $e', name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error deleting notification: $e', name: 'NotificationApi');
      return Failure('Failed to delete notification.', e);
    } catch (e) {
      developer.log('Error deleting notification: $e', name: 'NotificationApi');
      return Failure('Failed to delete notification.', e as Exception?);
    }
  }

  static notifications.Notification _mapSupabaseNotification(Map<String, dynamic> json) {
    final metadataRaw = json['data'];
    Map<String, dynamic>? metadata;
    if (metadataRaw is Map) {
      metadata = metadataRaw.map(
        (key, value) => MapEntry(key.toString(), value),
      );
    }

    final isDismissed = (json['is_dismissed'] as bool?) ?? metadata?['dismissed'] == true;
    final actionId = (metadata?['action_id'] as String?) ?? json['action_url'] as String?;
    final message = (json['body'] as String?) ?? (json['message'] as String?) ?? '';
    final timestampString = (json['created_at'] as String?) ?? (json['timestamp'] as String?);
    final timestamp = timestampString != null ? DateTime.parse(timestampString) : DateTime.now();
    final rawType = json['type'] as String?;

    return notifications.Notification(
      id: json['id'] as String,
      type: _mapNotificationType(json['type'] as String?),
      title: (json['title'] as String?) ?? '',
      message: message,
      isRead: json['is_read'] as bool? ?? false,
      timestamp: timestamp,
      actionId: actionId,
      metadata: metadata,
      isDismissed: isDismissed,
      showInCenter: _shouldShowInCenter(rawType, metadata, json),
    );
  }

  static notifications.NotificationType _mapNotificationType(String? value) {
    switch (value) {
      case 'event-invite':
      case 'contact-request':
        return notifications.NotificationType.invitation;
      case 'signal-expired':
        return notifications.NotificationType.cancellation;
      case 'signal-shared':
        return notifications.NotificationType.eventUpdate;
      case 'system':
        return notifications.NotificationType.general;
      default:
        return notifications.NotificationType.general;
    }
  }

  static bool _shouldShowInCenter(
    String? rawType,
    Map<String, dynamic>? metadata,
    Map<String, dynamic> rawJson,
  ) {
    final explicitColumn = rawJson['show_in_center'];
    if (explicitColumn is bool) {
      return explicitColumn;
    }

    if (rawType != null) {
      final normalized = rawType.toLowerCase();
      if (normalized == 'signal-expired' || normalized == 'availability-cancelled') {
        return false;
      }
    }

    if (metadata != null) {
      final routing = metadata['routing'] ?? metadata['surface'];
      if (routing is String) {
        final value = routing.toLowerCase();
        if (value == 'overview-only') {
          return false;
        }
        if (value == 'notification-center') {
          return true;
        }
      }
    }

    return true;
  }
}

/// Authentication API service
class AuthApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Sign in with Google OAuth
  static Future<Result<void>> signInWithGoogle() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'your-app-scheme://callback', // Configure this for your app
      );
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error signing in with Google: $e', name: 'AuthApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on AuthException catch (e) {
      developer.log('Auth error signing in with Google: $e', name: 'AuthApi');
      return Failure('Failed to sign in with Google.', e);
    } catch (e) {
      developer.log('Error signing in with Google: $e', name: 'AuthApi');
      return Failure('Failed to sign in with Google.', e as Exception?);
    }
  }

  /// Sign in with Apple OAuth
  static Future<Result<void>> signInWithApple() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'your-app-scheme://callback',
      );
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error signing in with Apple: $e', name: 'AuthApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on AuthException catch (e) {
      developer.log('Auth error signing in with Apple: $e', name: 'AuthApi');
      return Failure('Failed to sign in with Apple.', e);
    } catch (e) {
      developer.log('Error signing in with Apple: $e', name: 'AuthApi');
      return Failure('Failed to sign in with Apple.', e as Exception?);
    }
  }

  /// Sign in with email and password
  static Future<Result<AuthResponse>> signInWithEmail(
    String email,
    String password,
  ) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return Success(response);
    } on SocketException catch (e) {
      developer.log('Network error signing in with email: $e', name: 'AuthApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on AuthException catch (e) {
      developer.log('Auth error signing in with email: $e', name: 'AuthApi');
      if (e.message.contains('Invalid login credentials')) {
        return Failure('Invalid email or password.', e);
      }
      return Failure('Failed to sign in.', e);
    } catch (e) {
      developer.log('Error signing in with email: $e', name: 'AuthApi');
      return Failure('Failed to sign in.', e as Exception?);
    }
  }

  /// Sign up with email and password
  static Future<Result<AuthResponse>> signUpWithEmail(
    String email,
    String password,
  ) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
      );
      return Success(response);
    } on SocketException catch (e) {
      developer.log('Network error signing up with email: $e', name: 'AuthApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } on AuthException catch (e) {
      developer.log('Auth error signing up with email: $e', name: 'AuthApi');
      if (e.message.contains('already registered')) {
        return Failure('This email is already registered.', e);
      }
      return Failure('Failed to sign up.', e);
    } catch (e) {
      developer.log('Error signing up with email: $e', name: 'AuthApi');
      return Failure('Failed to sign up.', e as Exception?);
    }
  }

  /// Sign out
  static Future<Result<void>> signOut() async {
    try {
      await _client.auth.signOut();
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error signing out: $e', name: 'AuthApi');
      return Failure('Unable to connect. Please check your internet connection.', e);
    } catch (e) {
      developer.log('Error signing out: $e', name: 'AuthApi');
      return Failure('Failed to sign out.', e as Exception?);
    }
  }

  /// Get current user
  static User? getCurrentUser() {
    return _client.auth.currentUser;
  }

  /// Check if user is authenticated
  static bool get isAuthenticated => _client.auth.currentUser != null;

  /// Listen to auth state changes
  static Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;
}
