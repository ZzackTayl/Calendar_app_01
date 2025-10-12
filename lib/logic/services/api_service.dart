import 'package:supabase_flutter/supabase_flutter.dart';
import '../core/supabase_client.dart';
import '../domain/event.dart';
import '../domain/contact.dart';

class SupabaseApiService {
  static SupabaseClient get _client => SupabaseService.client;

  /// Health check to test Supabase connectivity
  static Future<bool> healthCheck() async {
    try {
      final response = await _client
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
      return true;
    } catch (e) {
      print('Health check failed: $e');
      return false;
    }
  }
}

/// Calendar API methods
class CalendarApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Get all calendar events for current user
  static Future<List<CalendarEvent>> getEvents() async {
    try {
      final userId = SupabaseService.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final response = await _client
          .from('events')
          .select('*')
          .eq('owner_id', userId)
          .order('start_ts');

      return (response as List)
          .map((json) => CalendarEvent.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching events: $e');
      throw ApiException('Failed to fetch events', e);
    }
  }

  /// Create a new calendar event
  static Future<CalendarEvent> createEvent(CalendarEvent event) async {
    try {
      final response = await _client
          .from('events')
          .insert(event.toJson())
          .select()
          .single();

      return CalendarEvent.fromJson(response);
    } catch (e) {
      print('Error creating event: $e');
      throw ApiException('Failed to create event', e);
    }
  }

  /// Update an existing calendar event
  static Future<CalendarEvent> updateEvent(CalendarEvent event) async {
    try {
      final response = await _client
          .from('events')
          .update(event.toJson())
          .eq('id', event.id)
          .select()
          .single();

      return CalendarEvent.fromJson(response);
    } catch (e) {
      print('Error updating event: $e');
      throw ApiException('Failed to update event', e);
    }
  }

  /// Delete a calendar event
  static Future<bool> deleteEvent(String eventId) async {
    try {
      await _client
          .from('events')
          .delete()
          .eq('id', eventId);
      return true;
    } catch (e) {
      print('Error deleting event: $e');
      throw ApiException('Failed to delete event', e);
    }
  }
}

/// Contact API methods
class ContactApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Get all contacts for current user
  static Future<List<Contact>> getContacts() async {
    try {
      final userId = SupabaseService.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');

      final response = await _client
          .from('contacts')
          .select('*')
          .eq('owner_id', userId)
          .order('name');

      return (response as List)
          .map((json) => Contact.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching contacts: $e');
      throw ApiException('Failed to fetch contacts', e);
    }
  }

  /// Create a new contact
  static Future<Contact> createContact(Contact contact) async {
    try {
      final response = await _client
          .from('contacts')
          .insert(contact.toJson())
          .select()
          .single();

      return Contact.fromJson(response);
    } catch (e) {
      print('Error creating contact: $e');
      throw ApiException('Failed to create contact', e);
    }
  }
}

/// Authentication API methods
class AuthApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Sign in with Google
  static Future<AuthResponse> signInWithGoogle() async {
    try {
      return await _client.auth.signInWithOAuth(OAuthProvider.google);
    } catch (e) {
      print('Error signing in with Google: $e');
      throw ApiException('Failed to sign in with Google', e);
    }
  }

  /// Sign out
  static Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      print('Error signing out: $e');
      throw ApiException('Failed to sign out', e);
    }
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final String message;
  final dynamic originalException;

  ApiException(this.message, [this.originalException]);

  @override
  String toString() {
    return 'ApiException: $message';
  }
}
