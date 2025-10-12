import 'package:serverpod_client/serverpod_client.dart';
import '../generated/client.dart' as serverpod_client;
import '../generated/calendar.dart';
import '../generated/user.dart';

class ApiService {
  static ApiService? _instance;
  late serverpod_client.Client _client;

  // Singleton pattern
  static ApiService get instance {
    _instance ??= ApiService._internal();
    return _instance!;
  }

  ApiService._internal();

  /// Initialize the Serverpod client
  Future<void> initialize() async {
    _client = serverpod_client.Client(
      'http://localhost:8080/',
      authenticationKeyManager: FlutterAuthenticationKeyManager(),
    );
  }

  /// Get the client instance
  serverpod_client.Client get client => _client;

  /// Close the connection
  void close() {
    _client.close();
  }

  /// Health check to test server connectivity
  Future<bool> healthCheck() async {
    try {
      return await _client.health.check();
    } catch (e) {
      print('Health check failed: $e');
      return false;
    }
  }
}

/// Calendar API methods
class CalendarApi {
  static final _apiService = ApiService.instance;

  /// Get all calendar events
  static Future<List<Calendar>> getEvents() async {
    try {
      return await _apiService.client.calendar.getAll();
    } catch (e) {
      print('Error fetching events: $e');
      throw ApiException('Failed to fetch events', e);
    }
  }

  /// Create a new calendar event
  static Future<Calendar> createEvent(Calendar event) async {
    try {
      return await _apiService.client.calendar.create(event);
    } catch (e) {
      print('Error creating event: $e');
      throw ApiException('Failed to create event', e);
    }
  }

  /// Update an existing calendar event
  static Future<Calendar> updateEvent(Calendar event) async {
    try {
      return await _apiService.client.calendar.update(event);
    } catch (e) {
      print('Error updating event: $e');
      throw ApiException('Failed to update event', e);
    }
  }

  /// Delete a calendar event
  static Future<bool> deleteEvent(int eventId) async {
    try {
      return await _apiService.client.calendar.delete(eventId);
    } catch (e) {
      print('Error deleting event: $e');
      throw ApiException('Failed to delete event', e);
    }
  }
}

/// User API methods
class UserApi {
  static final _apiService = ApiService.instance;

  /// Register a new user
  static Future<User> register(String name, String email) async {
    try {
      final user = User(
        name: name,
        email: email,
        createdAt: DateTime.now(),
      );
      
      return await _apiService.client.user.create(user);
    } catch (e) {
      print('Error registering user: $e');
      throw ApiException('Failed to register user', e);
    }
  }

  /// Get user by ID
  static Future<User?> getUser(int userId) async {
    try {
      return await _apiService.client.user.getById(userId);
    } catch (e) {
      print('Error fetching user: $e');
      throw ApiException('Failed to fetch user', e);
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

/// Helper class for authentication key management
class FlutterAuthenticationKeyManager implements AuthenticationKeyManager {
  @override
  Future<String?> get() async {
    // TODO: Implement secure storage of authentication tokens
    // For now, return null (no authentication)
    return null;
  }

  @override
  Future<void> put(String key) async {
    // TODO: Implement secure storage of authentication tokens
    // For now, do nothing
  }

  @override
  Future<void> remove() async {
    // TODO: Implement removal of authentication tokens
    // For now, do nothing
  }

  @override
  Future<String?> getHeaderValue() async {
    // TODO: Implement header value generation from stored token
    // For now, return null (no authentication)
    return null;
  }

  @override
  Future<String?> toHeaderValue(String? key) async {
    // TODO: Implement conversion of key to header value
    // For now, return the key as-is
    return key;
  }
}
