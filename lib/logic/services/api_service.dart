import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase_client.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';

/// Real Supabase API service for MyOrbit
class CalendarApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Get all events for the current user
  static Future<List<CalendarEvent>> getEvents() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return [];
      
      final response = await _client
          .from('events')
          .select()
          .eq('owner_id', userId)
          .order('start', ascending: true);
      
      return (response as List)
          .map((json) => CalendarEvent.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching events: $e');
      return []; // Return empty list instead of throwing
    }
  }

  /// Create a new event
  static Future<CalendarEvent> createEvent(CalendarEvent event) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      final eventData = event.copyWith(ownerId: userId, createdAt: DateTime.now());
      
      final response = await _client
          .from('events')
          .insert(eventData.toJson())
          .select()
          .single();
      
      return CalendarEvent.fromJson(response);
    } catch (e) {
      print('Error creating event: $e');
      rethrow;
    }
  }

  /// Update an existing event
  static Future<CalendarEvent> updateEvent(CalendarEvent event) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      final eventData = event.copyWith(updatedAt: DateTime.now());
      
      final response = await _client
          .from('events')
          .update(eventData.toJson())
          .eq('id', event.id)
          .eq('owner_id', userId) // Ensure user can only update their own events
          .select()
          .single();
      
      return CalendarEvent.fromJson(response);
    } catch (e) {
      print('Error updating event: $e');
      rethrow;
    }
  }

  /// Delete an event
  static Future<void> deleteEvent(String eventId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      await _client
          .from('events')
          .delete()
          .eq('id', eventId)
          .eq('owner_id', userId); // Ensure user can only delete their own events
    } catch (e) {
      print('Error deleting event: $e');
      rethrow;
    }
  }

  /// Get events for a specific date range
  static Future<List<CalendarEvent>> getEventsForDateRange(
    DateTime startDate,
    DateTime endDate,
  ) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return [];
      
      final response = await _client
          .from('events')
          .select()
          .eq('owner_id', userId)
          .gte('start', startDate.toIso8601String())
          .lte('end', endDate.toIso8601String())
          .order('start', ascending: true);
      
      return (response as List)
          .map((json) => CalendarEvent.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching events for date range: $e');
      return [];
    }
  }
}

/// Contact API service
class ContactApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Get all contacts for the current user
  static Future<List<Contact>> getContacts() async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) return [];
      
      final response = await _client
          .from('contacts')
          .select()
          .eq('owner_id', userId)
          .order('name', ascending: true);
      
      return (response as List)
          .map((json) => Contact.fromJson(json))
          .toList();
    } catch (e) {
      print('Error fetching contacts: $e');
      return [];
    }
  }

  /// Create a new contact
  static Future<Contact> createContact(Contact contact) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      final contactData = contact.copyWith(ownerId: userId, createdAt: DateTime.now());
      
      final response = await _client
          .from('contacts')
          .insert(contactData.toJson())
          .select()
          .single();
      
      return Contact.fromJson(response);
    } catch (e) {
      print('Error creating contact: $e');
      rethrow;
    }
  }

  /// Update an existing contact
  static Future<Contact> updateContact(Contact contact) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      final contactData = contact.copyWith(updatedAt: DateTime.now());
      
      final response = await _client
          .from('contacts')
          .update(contactData.toJson())
          .eq('id', contact.id)
          .eq('owner_id', userId)
          .select()
          .single();
      
      return Contact.fromJson(response);
    } catch (e) {
      print('Error updating contact: $e');
      rethrow;
    }
  }

  /// Delete a contact
  static Future<void> deleteContact(String contactId) async {
    try {
      final userId = _client.auth.currentUser?.id;
      if (userId == null) throw Exception('User not authenticated');
      
      await _client
          .from('contacts')
          .delete()
          .eq('id', contactId)
          .eq('owner_id', userId);
    } catch (e) {
      print('Error deleting contact: $e');
      rethrow;
    }
  }
}

/// Authentication API service
class AuthApi {
  static SupabaseClient get _client => SupabaseService.client;

  /// Sign in with Google OAuth
  static Future<bool> signInWithGoogle() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.google,
        redirectTo: 'your-app-scheme://callback', // Configure this for your app
      );
      return true;
    } catch (e) {
      print('Error signing in with Google: $e');
      return false;
    }
  }

  /// Sign in with Apple OAuth
  static Future<bool> signInWithApple() async {
    try {
      await _client.auth.signInWithOAuth(
        OAuthProvider.apple,
        redirectTo: 'your-app-scheme://callback',
      );
      return true;
    } catch (e) {
      print('Error signing in with Apple: $e');
      return false;
    }
  }

  /// Sign in with email and password
  static Future<AuthResponse> signInWithEmail(
    String email,
    String password,
  ) async {
    try {
      return await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
    } catch (e) {
      print('Error signing in with email: $e');
      rethrow;
    }
  }

  /// Sign up with email and password
  static Future<AuthResponse> signUpWithEmail(
    String email,
    String password,
  ) async {
    try {
      return await _client.auth.signUp(
        email: email,
        password: password,
      );
    } catch (e) {
      print('Error signing up with email: $e');
      rethrow;
    }
  }

  /// Sign out
  static Future<void> signOut() async {
    try {
      await _client.auth.signOut();
    } catch (e) {
      print('Error signing out: $e');
      rethrow;
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