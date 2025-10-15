import 'dart:developer' as developer;
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../../domain/user_calendar.dart';

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

  /// Create a new event
  static Future<Result<CalendarEvent>> createEvent(CalendarEvent event) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) {
        return const Failure('User not authenticated');
      }

      final eventData =
          event.copyWith(ownerId: userId, createdAt: DateTime.now());

      final response = await _client
          .from('events')
          .insert(eventData.toJson())
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
          .update(eventData.toJson())
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
        redirectTo: 'your-app-scheme://callback',
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
