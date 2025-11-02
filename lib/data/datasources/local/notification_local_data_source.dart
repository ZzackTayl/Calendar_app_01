import 'dart:convert';
import 'dart:developer' as developer;

import 'package:shared_preferences/shared_preferences.dart';

import '../../../logic/services/dev_data_service.dart';
import '../../../domain/notification.dart';

/// Local data source for notifications using SharedPreferences and mock data.
///
/// This data source handles local storage of notifications using SharedPreferences
/// for caching, and provides access to mock notification data from DevDataService.
///
/// Storage format: JSON array serialized as a string with key 'notifications'
class NotificationLocalDataSource {
  static const String _storageKey = 'notifications';

  final SharedPreferences _prefs;

  NotificationLocalDataSource(this._prefs);

  /// Retrieves notifications from local storage (SharedPreferences).
  ///
  /// Returns an empty list if no notifications are cached or if deserialization fails.
  /// Notifications are sorted by timestamp in descending order (newest first).
  ///
  /// Throws:
  /// - [Exception] if SharedPreferences access fails
  Future<List<Notification>> getLocalNotifications() async {
    try {
      final jsonString = _prefs.getString(_storageKey);

      if (jsonString == null || jsonString.isEmpty) {
        developer.log('No cached notifications found', name: 'NotificationLocalDataSource');
        return [];
      }

      final jsonList = json.decode(jsonString) as List<dynamic>;
      final notifications = jsonList
          .map((json) => Notification.fromJson(json as Map<String, dynamic>))
          .toList();

      // Sort by timestamp descending (newest first)
      notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));

      developer.log('Retrieved ${notifications.length} cached notifications', name: 'NotificationLocalDataSource');
      return notifications;
    } catch (e, stack) {
      developer.log(
        'Error reading local notifications: $e',
        name: 'NotificationLocalDataSource',
        error: e,
        stackTrace: stack,
      );
      throw Exception('Failed to read local notifications: $e');
    }
  }

  /// Saves notifications to local storage (SharedPreferences).
  ///
  /// This method serializes the notification list to JSON and stores it.
  /// Any existing cached notifications are completely replaced.
  ///
  /// Parameters:
  /// - [notifications]: List of notifications to cache
  ///
  /// Throws:
  /// - [Exception] if SharedPreferences write fails or serialization fails
  Future<void> saveLocalNotifications(List<Notification> notifications) async {
    try {
      final jsonList = notifications.map((n) => n.toJson()).toList();
      final jsonString = json.encode(jsonList);

      final success = await _prefs.setString(_storageKey, jsonString);

      if (!success) {
        throw Exception('Failed to save to SharedPreferences');
      }

      developer.log('Saved ${notifications.length} notifications to local cache', name: 'NotificationLocalDataSource');
    } catch (e, stack) {
      developer.log(
        'Error saving local notifications: $e',
        name: 'NotificationLocalDataSource',
        error: e,
        stackTrace: stack,
      );
      throw Exception('Failed to save local notifications: $e');
    }
  }

  /// Retrieves mock notifications from DevDataService for development/testing.
  ///
  /// This method exactly matches the current implementation from notification_providers.dart
  /// (lines 424-439). Mock data is generated relative to the current time to stay fresh.
  ///
  /// Returns a list of mock Notification objects based on recent activity data.
  ///
  /// Throws:
  /// - [Exception] if mock data generation fails
  Future<List<Notification>> getMockNotifications() async {
    try {
      developer.log('Generating mock notifications', name: 'NotificationLocalDataSource');

      // Get mock activity data from DevDataService
      final raw = DevDataService.getMockRecentActivity();

      // Transform to Notification objects exactly as in notification_providers.dart
      final notifications = raw.map((m) => Notification(
        id: m['id'] as String,
        type: m['type'] as NotificationType,
        title: m['title'] as String,
        message: (m['message'] as String?) ?? '',
        isRead: (m['read'] as bool?) ?? false,
        timestamp: m['timestamp'] as DateTime,
        metadata: const <String, dynamic>{},
      )).toList();

      developer.log('Generated ${notifications.length} mock notifications', name: 'NotificationLocalDataSource');
      return notifications;
    } catch (e, stack) {
      developer.log(
        'Error generating mock notifications: $e',
        name: 'NotificationLocalDataSource',
        error: e,
        stackTrace: stack,
      );
      throw Exception('Failed to generate mock notifications: $e');
    }
  }
}
