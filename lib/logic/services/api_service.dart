import 'dart:developer' as developer;
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';
import '../../core/env.dart';
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../domain/user_calendar.dart';
import '../../domain/notification.dart' as notifications;
import '../../domain/availability_signal.dart';
import '../../domain/signal_share.dart';
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

      final events = (response as List)
          .map((json) => CalendarEvent.fromJson(json))
          .toList();

      return Success(events);
    } on SocketException catch (e) {
      developer.log('Network error fetching events: $e', name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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

      final response = await _client
          .from('calendar_visibility')
          .select()
          .eq('owner_id', userId)
          .maybeSingle();

      if (response == null) {
        return const Success({});
      }

      final ids = (response['visible_calendar_ids'] as List<dynamic>? ?? [])
          .whereType<String>()
          .toSet();
      return Success(ids);
    } on SocketException catch (e) {
      developer.log('Network error fetching calendar visibility: $e',
          name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching calendar visibility: $e',
          name: 'CalendarApi');
      return Failure('Failed to load calendar visibility.', e);
    } catch (e) {
      developer.log('Error fetching calendar visibility: $e',
          name: 'CalendarApi');
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
      developer.log('Network error saving calendar visibility: $e',
          name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error saving calendar visibility: $e',
          name: 'CalendarApi');
      return Failure('Failed to save calendar visibility.', e);
    } catch (e) {
      developer.log('Error saving calendar visibility: $e',
          name: 'CalendarApi');
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

      final calendars = (response as List)
          .map((json) => UserCalendar.fromJson(json))
          .toList(growable: false);

      return Success(calendars);
    } on SocketException catch (e) {
      developer.log('Network error fetching calendars: $e',
          name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching calendars: $e',
          name: 'CalendarApi');
      return Failure('Failed to load calendars from server.', e);
    } catch (e) {
      developer.log('Error fetching calendars: $e', name: 'CalendarApi');
      return Failure('Failed to load calendars.', e as Exception?);
    }
  }

  /// Ensure the current user has a primary calendar row.
  static Future<Result<void>> ensurePrimaryCalendarForCurrentUser() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final existingCalendar = await _client
          .from('calendars')
          .select('id')
          .eq('owner_id', userId)
          .limit(1)
          .maybeSingle();

      if (existingCalendar != null) {
        return const Success(null);
      }

      await _client.from('calendars').insert({
        'owner_id': userId,
        'name': 'MyOrbit Calendar',
        'is_primary': true,
        'is_visible': true,
      });

      developer.log('Primary calendar created for user $userId',
          name: 'CalendarApi');
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error ensuring primary calendar: $e',
          name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error ensuring primary calendar: $e',
          name: 'CalendarApi');
      return Failure('Failed to create primary calendar.', e);
    } catch (e) {
      developer.log('Error ensuring primary calendar: $e', name: 'CalendarApi');
      return Failure('Failed to create primary calendar.', e as Exception?);
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

      final response = await _client
          .from('events')
          .insert(eventData.toDatabaseInsertMap())
          .select()
          .single();

      return Success(CalendarEvent.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error creating event: $e', name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
          .eq('owner_id',
              userId) // Ensure user can only update their own events
          .select()
          .single();

      return Success(CalendarEvent.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error updating event: $e', name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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

      await _client.from('events').delete().eq('id', eventId).eq(
          'owner_id', userId); // Ensure user can only delete their own events

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting event: $e', name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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

      final events = (response as List)
          .map((json) => CalendarEvent.fromJson(json))
          .toList();

      return Success(events);
    } on SocketException catch (e) {
      developer.log('Network error fetching events for date range: $e',
          name: 'CalendarApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching events for date range: $e',
          name: 'CalendarApi');
      return Failure('Failed to load events from server.', e);
    } catch (e) {
      developer.log('Error fetching events for date range: $e',
          name: 'CalendarApi');
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
      final currentProfile = await _client
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();

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
      developer.log('Network error responding to invite: $e',
          name: 'CalendarApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error responding to invite: $e',
          name: 'CalendarApi');
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
      final userContact = await _client
          .from('contacts')
          .select('id')
          .eq('external_user_id', userId)
          .maybeSingle();

      if (userContact == null) {
        return const Success([]);
      }

      final response = await _client
          .from('event_invites')
          .select()
          .eq('contact_id', userContact['id'])
          .eq('status', 'pending')
          .order('created_at', ascending: false);

      final invites =
          (response as List).map((json) => EventInvite.fromJson(json)).toList();

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
  static Future<Result<CalendarEvent>> getEventForInvite(
      String inviteId) async {
    try {
      final inviteData = await _client
          .from('event_invites')
          .select('event_id')
          .eq('id', inviteId)
          .single();

      final eventData = await _client
          .from('events')
          .select()
          .eq('id', inviteData['event_id'])
          .single();

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

      final contacts =
          (response as List).map((json) => Contact.fromJson(json)).toList();
      return Success(contacts);
    } on SocketException catch (e) {
      developer.log('Network error fetching contacts: $e', name: 'ContactApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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

      final contactData =
          contact.copyWith(ownerId: userId, createdAt: DateTime.now());

      final response = await _client
          .from('contacts')
          .insert(contactData.toJson())
          .select()
          .single();

      return Success(Contact.fromJson(response));
    } on SocketException catch (e) {
      developer.log('Network error creating contact: $e', name: 'ContactApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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

      await _client
          .from('contacts')
          .delete()
          .eq('id', contactId)
          .eq('owner_id', userId);

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting contact: $e', name: 'ContactApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
  static Future<Result<List<SignalShare>>> Function()? _getSignalSharesOverride;
  static Future<Result<List<AvailabilitySignal>>> Function(List<String>)?
      _getSignalsByIdsOverride;

  static Future<Result<List<AvailabilitySignal>>>
      getSignalsForCurrentUser() async {
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
      developer.log('Network error fetching availability signals: $e',
          name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching availability signals: $e',
          name: 'SignalApi');
      return Failure('Failed to load availability signals.', e);
    } catch (e) {
      developer.log('Error fetching availability signals: $e',
          name: 'SignalApi');
      return Failure('Failed to load availability signals.', e as Exception?);
    }
  }

  static Future<Result<AvailabilitySignal>> createSignal(
      AvailabilitySignal signal) async {
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

      final response = await _client
          .from('availability_signals')
          .insert(payload)
          .select()
          .single();

      return Success(_mapSignalFromSupabase(response));
    } on SocketException catch (e) {
      developer.log('Network error creating availability signal: $e',
          name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error creating availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to create availability signal.', e);
    } catch (e) {
      developer.log('Error creating availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to create availability signal.', e as Exception?);
    }
  }

  static Future<Result<AvailabilitySignal>> updateSignal(
      AvailabilitySignal signal) async {
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
      developer.log('Network error updating availability signal: $e',
          name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error updating availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to update availability signal.', e);
    } catch (e) {
      developer.log('Error updating availability signal: $e',
          name: 'SignalApi');
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
      developer.log('Network error cancelling availability signal: $e',
          name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error cancelling availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to cancel availability signal.', e);
    } catch (e) {
      developer.log('Error cancelling availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to cancel availability signal.', e as Exception?);
    }
  }

  static Future<Result<void>> shareSignalWithPartners({
    required String signalId,
    required List<String> partnerIds,
    Map<String, bool>? notifyMap,
    Map<String, bool>? autoAcceptMap,
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
              if (notifyMap != null && notifyMap.containsKey(partnerId))
                'notify': notifyMap[partnerId],
              if (autoAcceptMap != null && autoAcceptMap.containsKey(partnerId))
                'auto_accept': autoAcceptMap[partnerId],
            },
          )
          .toList(growable: false);

      await _client.from('signal_shares').insert(rows);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error sharing availability signal: $e',
          name: 'SignalApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error sharing availability signal: $e',
          name: 'SignalApi');
      return Failure('Failed to share availability signal.', e);
    } catch (e) {
      developer.log('Error sharing availability signal: $e', name: 'SignalApi');
      return Failure('Failed to share availability signal.', e as Exception?);
    }
  }

  static Future<Result<List<SignalShare>>> getSignalSharesForUser() async {
    final override = _getSignalSharesOverride;
    if (override != null) {
      return override();
    }

    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('signal_shares')
          .select()
          .or('shared_by_user_id.eq.$userId,shared_with_user_id.eq.$userId')
          .order('created_at', ascending: false);

      final shares = (response as List)
          .whereType<Map<String, dynamic>>()
          .map(_mapSignalShare)
          .toList(growable: false);

      return Success(shares);
    } on SocketException catch (e) {
      developer.log('Network error fetching signal shares: $e',
          name: 'SignalApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching signal shares: $e',
          name: 'SignalApi');
      return Failure('Failed to load signal shares.', e);
    } catch (e) {
      developer.log('Error fetching signal shares: $e', name: 'SignalApi');
      return Failure('Failed to load signal shares.', e as Exception?);
    }
  }

  static Future<Result<List<AvailabilitySignal>>> getSignalsByIds(
    List<String> ids,
  ) async {
    final override = _getSignalsByIdsOverride;
    if (override != null) {
      return override(ids);
    }

    if (ids.isEmpty) {
      return const Success([]);
    }

    try {
      final formattedIds = '(${ids.map((id) => '"$id"').join(',')})';
      final response = await _client
          .from('availability_signals')
          .select()
          .filter('id', 'in', formattedIds);

      final signals = (response as List)
          .whereType<Map<String, dynamic>>()
          .map(_mapSignalFromSupabase)
          .toList(growable: false);

      return Success(signals);
    } on SocketException catch (e) {
      developer.log('Network error fetching signals by id: $e',
          name: 'SignalApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching signals by id: $e',
          name: 'SignalApi');
      return Failure('Failed to load availability signals.', e);
    } catch (e) {
      developer.log('Error fetching signals by id: $e', name: 'SignalApi');
      return Failure('Failed to load availability signals.', e as Exception?);
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
    final endTime =
        _parseDateTime(endRaw) ?? startTime.add(const Duration(hours: 1));
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

  static SignalShare _mapSignalShare(Map<String, dynamic> json) {
    return SignalShare(
      id: json['id'] as String,
      signalId: json['signal_id'] as String,
      sharedWithUserId: json['shared_with_user_id'] as String,
      sharedByUserId: json['shared_by_user_id'] as String,
      createdAt: _parseDateTime(json['created_at']) ?? DateTime.now(),
      notify: json['notify'] as bool? ?? true,
      autoAccept: json['auto_accept'] as bool? ?? false,
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

  @visibleForTesting
  static void debugOverride({
    Future<Result<List<SignalShare>>> Function()? getSignalShares,
    Future<Result<List<AvailabilitySignal>>> Function(List<String> ids)?
        getSignalsByIds,
  }) {
    _getSignalSharesOverride = getSignalShares;
    _getSignalsByIdsOverride = getSignalsByIds;
  }

  @visibleForTesting
  static void debugResetOverrides() {
    _getSignalSharesOverride = null;
    _getSignalsByIdsOverride = null;
  }
}

/// Notifications API service
class NotificationApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  static Future<Result<List<notifications.Notification>>>
      getNotifications() async {
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
      developer.log('Network error fetching notifications: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error fetching notifications: $e',
          name: 'NotificationApi');
      return Failure('Failed to load notifications.', e);
    } catch (e) {
      developer.log('Error fetching notifications: $e',
          name: 'NotificationApi');
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
      developer.log('Network error marking notification as read: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error marking notification as read: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notification.', e);
    } catch (e) {
      developer.log('Error marking notification as read: $e',
          name: 'NotificationApi');
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
      developer.log('Network error marking all notifications as read: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error marking all notifications as read: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notifications.', e);
    } catch (e) {
      developer.log('Error marking all notifications as read: $e',
          name: 'NotificationApi');
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
      await _client
          .from('notifications')
          .update(payload)
          .eq('id', notificationId);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error updating notification state: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error updating notification state: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notification.', e);
    } catch (e) {
      developer.log('Error updating notification state: $e',
          name: 'NotificationApi');
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
      final formattedIds =
          '(${notificationIds.map((id) => '"$id"').join(',')})';

      await _client.from('notifications').update({
        'is_dismissed': true,
      }).filter('id', 'in', formattedIds);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error bulk dismissing notifications: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error bulk dismissing notifications: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notifications.', e);
    } catch (e) {
      developer.log('Error bulk dismissing notifications: $e',
          name: 'NotificationApi');
      return Failure('Failed to update notifications.', e as Exception?);
    }
  }

  static Future<Result<void>> deleteNotification(String notificationId) async {
    try {
      await _client.from('notifications').delete().eq('id', notificationId);
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error deleting notification: $e',
          name: 'NotificationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error deleting notification: $e',
          name: 'NotificationApi');
      return Failure('Failed to delete notification.', e);
    } catch (e) {
      developer.log('Error deleting notification: $e', name: 'NotificationApi');
      return Failure('Failed to delete notification.', e as Exception?);
    }
  }

  static notifications.Notification _mapSupabaseNotification(
      Map<String, dynamic> json) {
    final metadataRaw = json['data'];
    Map<String, dynamic>? metadata;
    if (metadataRaw is Map) {
      metadata = metadataRaw.map(
        (key, value) => MapEntry(key.toString(), value),
      );
    }

    final isDismissed =
        (json['is_dismissed'] as bool?) ?? metadata?['dismissed'] == true;
    final actionId =
        (metadata?['action_id'] as String?) ?? json['action_url'] as String?;
    final message =
        (json['body'] as String?) ?? (json['message'] as String?) ?? '';
    final timestampString =
        (json['created_at'] as String?) ?? (json['timestamp'] as String?);
    final timestamp = timestampString != null
        ? DateTime.parse(timestampString)
        : DateTime.now();
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
    if (value == null) {
      return notifications.NotificationType.system;
    }

    final normalized = value.toLowerCase().replaceAll('-', '_');

    switch (normalized) {
      case 'event_invite':
      case 'invite':
        return notifications.NotificationType.eventInvite;
      case 'contact_request':
      case 'partner_request':
      case 'connection_request':
        return notifications.NotificationType.partnerRequest;
      case 'contact_accepted':
      case 'partner_accepted':
      case 'connection_accepted':
        return notifications.NotificationType.partnerAccepted;
      case 'event_reminder':
      case 'reminder':
        return notifications.NotificationType.eventReminder;
      case 'event_updated':
      case 'event_update':
      case 'event_change':
        return notifications.NotificationType.eventUpdated;
      case 'event_cancelled':
      case 'event_canceled':
        return notifications.NotificationType.eventCancelled;
      case 'signal_shared':
      case 'availability_shared':
        return notifications.NotificationType.signalShared;
      case 'signal_received':
      case 'availability_received':
        return notifications.NotificationType.signalReceived;
      case 'signal_expired':
        return notifications.NotificationType.signalReceived;
      case 'system':
      case 'general':
      case 'broadcast':
      case 'info':
        return notifications.NotificationType.system;
      default:
        return notifications.NotificationType.system;
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
      if (normalized == 'signal-expired' ||
          normalized == 'availability-cancelled') {
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

  @visibleForTesting
  static notifications.NotificationType debugMapNotificationType(
      String? value) {
    return _mapNotificationType(value);
  }
}

/// Calendar Sharing API service
class CalendarSharingApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Send calendar share invites to multiple contacts
  static Future<Result<void>> sendCalendarShareInvites({
    required List<String> contactIds,
    required String permission,
    required bool canViewDetails,
    required bool canEditEvents,
    required bool shareAvailability,
    String? message,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      // Update contact permissions with share settings
      final updates = contactIds
          .map((contactId) => {
                'id': contactId,
                'permission': permission,
                'labels': [
                  if (canViewDetails) 'can_view_details',
                  if (canEditEvents) 'can_edit_events',
                  if (shareAvailability) 'can_see_availability',
                ],
                'updated_at': DateTime.now().toIso8601String(),
              })
          .toList();

      for (final update in updates) {
        await _client
            .from('contacts')
            .update({
              'permission': update['permission'],
              'labels': update['labels'],
              'updated_at': update['updated_at'],
            })
            .eq('id', update['id'] as String)
            .eq('owner_id', userId as Object);
      }

      // Get user profile for notification
      final userProfile = await _client
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();

      // Create notifications for each recipient
      final notificationPromises = contactIds.map((contactId) async {
        final contact = await _client
            .from('contacts')
            .select('external_user_id')
            .eq('id', contactId)
            .single();

        if (contact['external_user_id'] != null) {
          await _client.from('notifications').insert({
            'user_id': contact['external_user_id'],
            'type': 'calendar-shared',
            'title': 'Calendar shared',
            'body':
                '${userProfile['display_name']} shared their calendar with you',
            'data': {
              'contact_id': contactId,
              'shared_by': userId,
              'permissions': permission,
            },
            'created_at': DateTime.now().toIso8601String(),
          });
        }
      });

      await Future.wait(notificationPromises);

      developer.log(
        'Calendar share invites sent to ${contactIds.length} contacts',
        name: 'CalendarSharingApi',
      );

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error sending calendar share invites: $e',
          name: 'CalendarSharingApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log(
        'Database error sending calendar share invites: $e',
        name: 'CalendarSharingApi',
      );
      return Failure('Failed to send calendar share invites.', e);
    } catch (e) {
      developer.log('Error sending calendar share invites: $e',
          name: 'CalendarSharingApi');
      return Failure('Failed to send calendar share invites.', e as Exception?);
    }
  }

  /// Update share permissions for a contact
  static Future<Result<void>> updateSharePermissions({
    required String contactId,
    required String newPermission,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      await _client
          .from('contacts')
          .update({
            'permission': newPermission,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', contactId)
          .eq('owner_id', userId);

      return const Success(null);
    } on SocketException catch (e) {
      developer.log(
        'Network error updating share permissions: $e',
        name: 'CalendarSharingApi',
      );
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log(
        'Database error updating share permissions: $e',
        name: 'CalendarSharingApi',
      );
      return Failure('Failed to update share permissions.', e);
    } catch (e) {
      developer.log('Error updating share permissions: $e',
          name: 'CalendarSharingApi');
      return Failure('Failed to update share permissions.', e as Exception?);
    }
  }
}

/// Calendar Migration API service
class CalendarMigrationApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Start a calendar migration from external source
  static Future<Result<Map<String, dynamic>>> startCalendarMigration({
    required String source,
    required bool includePastEvents,
    required bool includeSharedCalendars,
    required bool mergeDuplicates,
    required bool notifyPartners,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final migrationId = const Uuid().v4();

      // Create migration record
      final response = await _client
          .from('calendar_migrations')
          .insert({
            'id': migrationId,
            'user_id': userId,
            'source': source,
            'include_past_events': includePastEvents,
            'include_shared_calendars': includeSharedCalendars,
            'merge_duplicates': mergeDuplicates,
            'notify_partners': notifyPartners,
            'status': 'processing',
            'created_at': DateTime.now().toIso8601String(),
          })
          .select()
          .single();

      // In a production app, this would trigger an async job
      // For now, we'll create a background task notification
      await _client.from('notifications').insert({
        'user_id': userId,
        'type': 'migration-started',
        'title': 'Calendar import started',
        'body':
            'We\'re importing your $source calendar. You\'ll get an email when it\'s done.',
        'data': {
          'migration_id': migrationId,
          'source': source,
        },
        'created_at': DateTime.now().toIso8601String(),
      });

      developer.log(
        'Calendar migration started: $migrationId from $source',
        name: 'CalendarMigrationApi',
      );

      return Success(response);
    } on SocketException catch (e) {
      developer.log('Network error starting migration: $e',
          name: 'CalendarMigrationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log('Database error starting migration: $e',
          name: 'CalendarMigrationApi');
      return Failure('Failed to start calendar migration.', e);
    } catch (e) {
      developer.log('Error starting migration: $e',
          name: 'CalendarMigrationApi');
      return Failure('Failed to start calendar migration.', e as Exception?);
    }
  }

  /// Get migration status
  static Future<Result<Map<String, dynamic>>> getMigrationStatus(
      String migrationId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('calendar_migrations')
          .select()
          .eq('id', migrationId)
          .eq('user_id', userId)
          .single();

      return Success(response);
    } on SocketException catch (e) {
      developer.log('Network error fetching migration status: $e',
          name: 'CalendarMigrationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log(
        'Database error fetching migration status: $e',
        name: 'CalendarMigrationApi',
      );
      return Failure('Failed to fetch migration status.', e);
    } catch (e) {
      developer.log('Error fetching migration status: $e',
          name: 'CalendarMigrationApi');
      return Failure('Failed to fetch migration status.', e as Exception?);
    }
  }

  /// Get migration history
  static Future<Result<List<Map<String, dynamic>>>>
      getMigrationHistory() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('calendar_migrations')
          .select()
          .eq('user_id', userId)
          .order('created_at', ascending: false);

      return Success((response as List).cast<Map<String, dynamic>>());
    } on SocketException catch (e) {
      developer.log('Network error fetching migration history: $e',
          name: 'CalendarMigrationApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on PostgrestException catch (e) {
      developer.log(
        'Database error fetching migration history: $e',
        name: 'CalendarMigrationApi',
      );
      return Failure('Failed to fetch migration history.', e);
    } catch (e) {
      developer.log('Error fetching migration history: $e',
          name: 'CalendarMigrationApi');
      return Failure('Failed to fetch migration history.', e as Exception?);
    }
  }
}

/// Account Recovery API service
class AccountRecoveryApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Request password reset by email
  static Future<Result<void>> requestPasswordReset(String email) async {
    try {
      await _client.auth.resetPasswordForEmail(
        email,
        redirectTo: Env.passwordResetRedirectUri,
      );

      developer.log('Password reset email sent to $email',
          name: 'AccountRecoveryApi');
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error requesting password reset: $e',
          name: 'AccountRecoveryApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on AuthException catch (e) {
      developer.log('Auth error requesting password reset: $e',
          name: 'AccountRecoveryApi');
      if (e.message.contains('user not found')) {
        return Failure('No account found with this email address.', e);
      }
      return Failure('Failed to send password reset email.', e);
    } catch (e) {
      developer.log('Error requesting password reset: $e',
          name: 'AccountRecoveryApi');
      return Failure('Failed to send password reset email.', e as Exception?);
    }
  }

  /// Reset password with recovery code and new password
  static Future<Result<void>> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    try {
      await _client.auth.verifyOTP(
        email: email,
        token: token,
        type: OtpType.recovery,
      );

      // Update password
      await _client.auth.updateUser(
        UserAttributes(password: newPassword),
      );

      developer.log('Password reset successful for $email',
          name: 'AccountRecoveryApi');
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error resetting password: $e',
          name: 'AccountRecoveryApi');
      return Failure(
        'Unable to connect. Please check your internet connection.',
        e,
      );
    } on AuthException catch (e) {
      developer.log('Auth error resetting password: $e',
          name: 'AccountRecoveryApi');
      if (e.message.contains('invalid') || e.message.contains('expired')) {
        return Failure('The recovery code is invalid or has expired.', e);
      }
      return Failure('Failed to reset password.', e);
    } catch (e) {
      developer.log('Error resetting password: $e', name: 'AccountRecoveryApi');
      return Failure('Failed to reset password.', e as Exception?);
    }
  }

  /// Request phone recovery (SMS recovery not yet available)
  static Future<Result<void>> requestPhoneRecovery(String phoneNumber) async {
    try {
      developer.log(
        'Phone recovery requested. SMS recovery not yet implemented.',
        name: 'AccountRecoveryApi',
      );

      return Failure(
        'SMS recovery is not yet available. Please use email recovery instead.',
        Exception('SMS recovery unavailable'),
      );
    } catch (e) {
      developer.log('Error requesting SMS recovery: $e',
          name: 'AccountRecoveryApi');
      return Failure('Failed to send SMS recovery code.', e as Exception?);
    }
  }

  /// Verify recovery code from email
  static Future<Result<void>> verifyRecoveryCode({
    required String identifier,
    required String code,
    required bool isPhoneNumber,
  }) async {
    try {
      if (isPhoneNumber) {
        return Failure(
          'SMS verification is not yet available.',
          Exception('SMS verification unavailable'),
        );
      }

      developer.log('Email recovery code received for $identifier',
          name: 'AccountRecoveryApi');
      return const Success(null);
    } catch (e) {
      developer.log('Error verifying recovery code: $e',
          name: 'AccountRecoveryApi');
      return Failure('Failed to verify recovery code.', e as Exception?);
    }
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
        redirectTo: Env.oauthRedirectUri,
      );
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error signing in with Google: $e',
          name: 'AuthApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
        redirectTo: Env.oauthRedirectUri,
      );
      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error signing in with Apple: $e', name: 'AuthApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
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
  static Stream<AuthState> get authStateChanges =>
      _client.auth.onAuthStateChange;
}

/// Contact Invitation API service for sending SMS/Email invitations
class ContactInvitationApi {
  static SupabaseClient get _client => SupabaseService.clientOrThrow;

  /// Send a contact invitation via email or SMS
  static Future<Result<void>> sendContactInvitation({
    required String recipientName,
    required String recipientEmail,
    required String method, // 'email' or 'sms'
    String? recipientPhoneNumber,
    String? personalMessage,
    String? permission,
  }) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      // Validate method
      if (method != 'email' && method != 'sms') {
        return const Failure(
            'Invalid invitation method. Use "email" or "sms".');
      }

      // Validate required fields for each method
      if (method == 'sms' && (recipientPhoneNumber?.isEmpty ?? true)) {
        return const Failure('Phone number is required for SMS invitations.');
      }
      if (method == 'email' && (recipientEmail.isEmpty)) {
        return const Failure('Email is required for email invitations.');
      }

      // For SMS, validate phone number format
      if (method == 'sms' && recipientPhoneNumber != null) {
        if (!_isValidPhoneNumber(recipientPhoneNumber)) {
          return const Failure(
            'Invalid phone number format. Please use E.164 format (e.g., +1234567890).',
          );
        }
      }

      // Create invitation record
      final invitationData = {
        'sender_id': userId,
        'recipient_name': recipientName,
        'recipient_email': recipientEmail,
        'recipient_phone_number': recipientPhoneNumber,
        'method': method,
        'personal_message': personalMessage,
        'status': 'pending',
        'expires_at':
            DateTime.now().add(const Duration(days: 30)).toIso8601String(),
      };

      // Insert into database
      await _client.from('contact_invitations').insert(invitationData);

      // Send actual invitation based on method
      if (method == 'email') {
        // Call edge function to send email
        await _sendEmailInvitation(
          userId: userId,
          recipientName: recipientName,
          recipientEmail: recipientEmail,
          personalMessage: personalMessage,
          permission: permission,
        );
      } else if (method == 'sms') {
        // Send SMS via Twilio
        await _sendSmsInvitation(
          userId: userId,
          recipientName: recipientName,
          recipientPhoneNumber: recipientPhoneNumber!,
          personalMessage: personalMessage,
        );
      }

      return const Success(null);
    } on SocketException catch (e) {
      developer.log('Network error sending invitation: $e',
          name: 'ContactInvitationApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error sending invitation: $e',
          name: 'ContactInvitationApi');
      return Failure('Failed to send invitation.', e);
    } catch (e) {
      developer.log('Error sending invitation: $e',
          name: 'ContactInvitationApi');
      return Failure(
          'Failed to send invitation: ${e.toString()}', e as Exception?);
    }
  }

  /// Send email invitation via Supabase edge function
  static Future<void> _sendEmailInvitation({
    required String userId,
    required String recipientName,
    required String recipientEmail,
    String? personalMessage,
    String? permission,
  }) async {
    try {
      // Call edge function to send email
      await _client.functions.invoke(
        'send-contact-invitation-email',
        body: {
          'sender_id': userId,
          'recipient_name': recipientName,
          'recipient_email': recipientEmail,
          'personal_message': personalMessage,
          'permission': permission,
        },
      );
    } catch (e) {
      developer.log('Error calling send-email function: $e',
          name: 'ContactInvitationApi');
      // Don't rethrow - invitation record was created, just email sending failed
    }
  }

  /// Send SMS invitation via Twilio
  static Future<void> _sendSmsInvitation({
    required String userId,
    required String recipientName,
    required String recipientPhoneNumber,
    String? personalMessage,
  }) async {
    try {
      // Call edge function to send SMS
      await _client.functions.invoke(
        'send-contact-invitation-sms',
        body: {
          'sender_id': userId,
          'recipient_name': recipientName,
          'recipient_phone_number': recipientPhoneNumber,
          'personal_message': personalMessage,
        },
      );
    } catch (e) {
      developer.log('Error calling send-sms function: $e',
          name: 'ContactInvitationApi');
      // Don't rethrow - invitation record was created, just SMS sending failed
    }
  }

  /// Validate phone number format (E.164)
  static bool _isValidPhoneNumber(String phoneNumber) {
    final e164Regex = RegExp(r'^\+\d{1,15}$');
    return e164Regex.hasMatch(phoneNumber);
  }

  /// Get all invitations sent by user
  static Future<Result<List<dynamic>>> getSentInvitations() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final response = await _client
          .from('contact_invitations')
          .select()
          .eq('sender_id', userId)
          .order('created_at', ascending: false);

      return Success(response as List<dynamic>);
    } on SocketException catch (e) {
      developer.log('Network error fetching invitations: $e',
          name: 'ContactInvitationApi');
      return Failure(
          'Unable to connect. Please check your internet connection.', e);
    } on PostgrestException catch (e) {
      developer.log('Database error fetching invitations: $e',
          name: 'ContactInvitationApi');
      return Failure('Failed to load invitations.', e);
    } catch (e) {
      developer.log('Error fetching invitations: $e',
          name: 'ContactInvitationApi');
      return Failure('Failed to load invitations.', e as Exception?);
    }
  }
}
