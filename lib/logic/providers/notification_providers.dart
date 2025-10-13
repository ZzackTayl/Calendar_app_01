import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../../domain/notification.dart';

part 'notification_providers.g.dart';

/// Provides the list of notifications
@riverpod
class NotificationList extends _$NotificationList {
  static const String _storageKey = 'notifications';

  @override
  Future<List<Notification>> build() async {
    return await _loadNotifications();
  }

  /// Load notifications from local storage
  Future<List<Notification>> _loadNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = prefs.getStringList(_storageKey) ?? [];
      
      final notifications = jsonList
          .map((json) => Notification.fromJson(jsonDecode(json)))
          .toList();
      
      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      
      // Auto-cleanup old notifications (older than 7 days)
      final cutoffDate = DateTime.now().subtract(const Duration(days: 7));
      final filteredNotifications = notifications
          .where((notification) => notification.timestamp.isAfter(cutoffDate))
          .toList();
      
      // If we filtered out some notifications, save the updated list
      if (filteredNotifications.length != notifications.length) {
        await _saveNotifications(filteredNotifications);
      }
      
      return filteredNotifications;
    } catch (e) {
      // If there's an error loading, start with mock data
      return _getMockNotifications();
    }
  }

  /// Save notifications to local storage
  Future<void> _saveNotifications(List<Notification> notifications) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = notifications
          .map((notification) => jsonEncode(notification.toJson()))
          .toList();
      await prefs.setStringList(_storageKey, jsonList);
    } catch (e) {
      // Handle storage errors gracefully
    }
  }

  /// Add a new notification
  Future<void> addNotification(Notification notification) async {
    final currentNotifications = await future;
    final updatedNotifications = [notification, ...currentNotifications];
    
    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    final currentNotifications = await future;
    final updatedNotifications = currentNotifications
        .map((notification) => notification.id == notificationId
            ? notification.markAsRead()
            : notification)
        .toList();
    
    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    final currentNotifications = await future;
    final updatedNotifications = currentNotifications
        .map((notification) => notification.markAsRead())
        .toList();
    
    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Clear all notifications
  Future<void> clearAll() async {
    await _saveNotifications([]);
    state = const AsyncValue.data([]);
  }

  /// Delete a specific notification
  Future<void> deleteNotification(String notificationId) async {
    final currentNotifications = await future;
    final updatedNotifications = currentNotifications
        .where((notification) => notification.id != notificationId)
        .toList();
    
    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Generate mock notifications for development
  List<Notification> _getMockNotifications() {
    final now = DateTime.now();
    
    return [
      Notification(
        id: '1',
        type: NotificationType.invitation,
        title: 'Invitation Accepted',
        message: 'Jordan accepted your invitation! Their permissions are now active.',
        isRead: false,
        timestamp: now.subtract(const Duration(hours: 2)),
        actionId: 'contact_jordan_123',
        metadata: {'contactName': 'Jordan Lee'},
      ),
      Notification(
        id: '2',
        type: NotificationType.eventUpdate,
        title: 'Event Updated',
        message: 'Alex changed the location for "Dinner Date" tomorrow at 7:00 PM.',
        isRead: false,
        timestamp: now.subtract(const Duration(hours: 4)),
        actionId: 'event_dinner_456',
        metadata: {'eventTitle': 'Dinner Date', 'contactName': 'Alex Rivera'},
      ),
      Notification(
        id: '3',
        type: NotificationType.reminder,
        title: 'Upcoming Event',
        message: 'You have "Coffee Meeting" with Sam in 1 hour.',
        isRead: true,
        timestamp: now.subtract(const Duration(hours: 6)),
        actionId: 'event_coffee_789',
        metadata: {'eventTitle': 'Coffee Meeting', 'contactName': 'Sam Taylor'},
      ),
      Notification(
        id: '4',
        type: NotificationType.cancellation,
        title: 'Event Cancelled',
        message: 'Riley cancelled "Weekend Trip" scheduled for this Saturday.',
        isRead: true,
        timestamp: now.subtract(const Duration(days: 1)),
        actionId: 'event_trip_101',
        metadata: {'eventTitle': 'Weekend Trip', 'contactName': 'Riley Chen'},
      ),
      Notification(
        id: '5',
        type: NotificationType.general,
        title: 'Privacy Update',
        message: 'Your privacy settings have been updated successfully.',
        isRead: true,
        timestamp: now.subtract(const Duration(days: 2)),
      ),
    ];
  }
}

/// Provides the count of unread notifications
@riverpod
int unreadNotificationCount(Ref ref) {
  final notificationsAsync = ref.watch(notificationListProvider);
  
  return notificationsAsync.when(
    data: (notifications) => notifications.where((n) => !n.isRead).length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provides only unread notifications
@riverpod
List<Notification> unreadNotifications(Ref ref) {
  final notificationsAsync = ref.watch(notificationListProvider);
  
  return notificationsAsync.when(
    data: (notifications) => notifications.where((n) => !n.isRead).toList(),
    loading: () => [],
    error: (_, __) => [],
  );
}

/// Provides notifications filtered by type
@riverpod
List<Notification> notificationsByType(
  Ref ref,
  NotificationType type,
) {
  final notificationsAsync = ref.watch(notificationListProvider);
  
  return notificationsAsync.when(
    data: (notifications) => 
        notifications.where((n) => n.type == type).toList(),
    loading: () => [],
    error: (_, __) => [],
  );
}
