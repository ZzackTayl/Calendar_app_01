import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

import '../../core/result.dart';
import '../../core/supabase_client.dart';
import '../../domain/notification.dart';
import '../services/api_service.dart';

part 'notification_providers.g.dart';

/// Provides the list of notifications
@riverpod
class NotificationList extends _$NotificationList {
  static const String _storageKey = 'notifications';
  static final Duration _centerVisibilityWindow = const Duration(days: 3);
  List<Notification> _sortNotifications(List<Notification> notifications) {
    final sorted = [...notifications]..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return sorted;
  }

  List<Notification> _applyCenterVisibilityRules(
    List<Notification> notifications,
  ) {
    final now = DateTime.now();
    final sorted = _sortNotifications(notifications);
    var changed = false;
    final updated = <Notification>[];

    for (final notification in sorted) {
      if (!notification.showInCenter) {
        updated.add(notification);
        continue;
      }

      final tooOld = now.difference(notification.timestamp) > _centerVisibilityWindow;

      if (tooOld && !notification.isDismissed) {
        updated.add(notification.dismiss());
        changed = true;
      } else {
        updated.add(notification);
      }
    }

    return changed ? updated : sorted;
  }

  @override
  Future<List<Notification>> build() async {
    final notifications = await _loadInitialNotifications();
    final enforced = _applyCenterVisibilityRules(notifications);
    if (!identical(enforced, notifications)) {
      await _saveNotifications(enforced);
    }
    return enforced;
  }

  Future<List<Notification>> _loadInitialNotifications() async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return _loadNotifications();
    }

    final result = await NotificationApi.getNotifications();
    return await result.when(
      success: (remote) async {
        if (remote.isEmpty) {
          return _loadNotifications();
        }
        final enforced = _applyCenterVisibilityRules(remote);
        await _persistLocalBackup(enforced);
        return enforced;
      },
      failure: (_, __) async => _loadNotifications(),
    );
  }

  Future<void> _persistLocalBackup(List<Notification> notifications) async {
    try {
      await _saveNotifications(notifications);
    } catch (_) {
      // Ignore local persistence errors; remote data takes precedence.
    }
  }

  /// Load notifications from local storage
  Future<List<Notification>> _loadNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = prefs.getStringList(_storageKey) ?? [];

      final notifications =
          jsonList.map((json) => Notification.fromJson(jsonDecode(json))).toList();

      // Sort by timestamp (newest first)
      notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));

      return notifications;
    } catch (e) {
      // If there's an error loading, start with mock data
      return _getMockNotifications();
    }
  }

  /// Save notifications to local storage
  Future<void> _saveNotifications(List<Notification> notifications) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList =
          notifications.map((notification) => jsonEncode(notification.toJson())).toList();
      await prefs.setStringList(_storageKey, jsonList);
    } catch (e) {
      // Handle storage errors gracefully
    }
  }

  /// Add a new notification (with deduplication safety check)
  Future<void> addNotification(Notification notification) async {
    // User-triggered additions currently remain local only.
    final currentNotifications = await future;
    
    // Safety check: don't add if identical notification already exists
    final alreadyExists = currentNotifications.any(
      (n) => n.id == notification.id,
    );
    
    if (alreadyExists) {
      return; // Skip adding duplicate
    }
    
    final updatedNotifications = _applyCenterVisibilityRules([
      notification,
      ...currentNotifications,
    ]);

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    final currentNotifications = await future;

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await NotificationApi.markAsRead(notificationId);
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    final updatedNotifications = _applyCenterVisibilityRules(currentNotifications
        .map((notification) =>
            notification.id == notificationId ? notification.markAsRead() : notification)
        .toList());

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    final currentNotifications = await future;

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await NotificationApi.markAllAsRead();
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    final updatedNotifications = _applyCenterVisibilityRules(
      currentNotifications.map((notification) => notification.markAsRead()).toList(),
    );

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Dismiss a notification from the notification center without deleting history
  Future<void> dismissNotification(String notificationId) async {
    final currentNotifications = await future;
    final updatedNotifications = _applyCenterVisibilityRules(
      currentNotifications.map((notification) {
        if (notification.id != notificationId) {
          return notification;
        }

        final metadata = Map<String, dynamic>.from(notification.metadata ?? {})
          ..['dismissed'] = true;

        return notification.copyWith(
          isDismissed: true,
          metadata: metadata,
        );
      }).toList(),
    );

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final notification =
          updatedNotifications.firstWhere((element) => element.id == notificationId);
      final result = await NotificationApi.updateNotificationState(
        notification.id,
        metadata: notification.metadata ?? const <String, dynamic>{},
        isDismissed: true,
      );
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Dismiss all notifications from the notification center without
  /// removing them from history.
  Future<void> clearAll() async {
    final currentNotifications = await future;
    final updatedNotifications = _applyCenterVisibilityRules(
      currentNotifications.map((notification) {
        if (!notification.showInCenter) {
          return notification;
        }
        return notification.dismiss();
      }).toList(),
    );

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final toDismiss = currentNotifications
          .where((notification) => notification.showInCenter)
          .map((notification) => notification.id)
          .toList(growable: false);
      final result = await NotificationApi.bulkDismissNotifications(toDismiss);
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Restore a notification back into the notification center
  Future<void> restoreNotification(String notificationId) async {
    final currentNotifications = await future;
    final updatedNotifications = _applyCenterVisibilityRules(
      currentNotifications.map((notification) {
        if (notification.id != notificationId) {
          return notification;
        }
        final metadata = Map<String, dynamic>.from(notification.metadata ?? {});
        metadata.remove('dismissed');
        return notification.copyWith(
          isDismissed: false,
          metadata: metadata.isEmpty ? null : metadata,
        );
      }).toList(),
    );

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final notification =
          updatedNotifications.firstWhere((element) => element.id == notificationId);
      final result = await NotificationApi.updateNotificationState(
        notification.id,
        metadata: notification.metadata ?? const <String, dynamic>{},
        isDismissed: false,
      );
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    await _saveNotifications(updatedNotifications);
    state = AsyncValue.data(updatedNotifications);
  }

  /// Delete a specific notification
  Future<void> deleteNotification(String notificationId) async {
    final currentNotifications = await future;

    if (SupabaseService.isConfigured && SupabaseService.isAuthenticated) {
      final result = await NotificationApi.deleteNotification(notificationId);
      if (result is Failure<void>) {
        final message = result.message;
        throw Exception(message);
      }
    }

    final updatedNotifications = _applyCenterVisibilityRules(
        currentNotifications.where((notification) => notification.id != notificationId).toList());

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
      Notification(
        id: '6',
        type: NotificationType.cancellation,
        title: 'Availability withdrawn',
        message: 'Jordan withdrew a shared availability block. Check activity for details.',
        isRead: true,
        timestamp: now.subtract(const Duration(days: 4, hours: 3)),
        metadata: const {'reason': 'availability_cancelled'},
        showInCenter: false,
      ),
    ];
  }
}

/// Provides the count of unread notifications
@riverpod
int unreadNotificationCount(Ref ref) {
  final notificationsAsync = ref.watch(notificationListProvider);

  return notificationsAsync.when(
    data: (notifications) =>
        notifications.where((n) => n.showInCenter && !n.isRead && !n.isDismissed).length,
    loading: () => 0,
    error: (_, __) => 0,
  );
}

/// Provides only unread notifications
@riverpod
List<Notification> unreadNotifications(Ref ref) {
  final notificationsAsync = ref.watch(notificationListProvider);

  return notificationsAsync.when(
    data: (notifications) =>
        notifications.where((n) => n.showInCenter && !n.isRead && !n.isDismissed).toList(),
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
        notifications.where((n) => n.showInCenter && n.type == type && !n.isDismissed).toList(),
    loading: () => [],
    error: (_, __) => [],
  );
}
