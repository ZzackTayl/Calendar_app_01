part of 'notification_cubit.dart';

/// State for NotificationCubit following MyOrbit_CleanArch pattern
class NotificationState {
  final AppStateStatus status;
  final List<Notification> notifications;
  final String message;
  final int unreadCount;

  const NotificationState({
    this.status = AppStateStatus.initial,
    this.notifications = const [],
    this.message = '',
    this.unreadCount = 0,
  });

  /// Get notifications for notification center (not dismissed, showInCenter = true)
  List<Notification> get centerNotifications =>
      notifications.where((n) => !n.isDismissed && n.showInCenter).toList();

  /// Get all notifications for activity timeline
  List<Notification> get activityNotifications => notifications;

  /// Banner notifications (event reminders/updates that are still visible)
  List<Notification> get bannerNotifications {
    final bannerTypes = {
      NotificationType.eventReminder,
      NotificationType.eventCancelled,
      NotificationType.eventUpdated,
    };

    final filtered = notifications.where((notification) {
      if (!bannerTypes.contains(notification.type)) {
        return false;
      }
      if (notification.isDismissed) {
        return false;
      }
      final metadata = notification.metadata;
      final bannerHidden = metadata != null &&
          (((metadata['banner_hidden'] ?? metadata['bannerHidden']) as bool?) ==
              true);
      return !bannerHidden;
    }).toList()
      ..sort((a, b) {
        final priorityCompare = b.type.priority.compareTo(a.type.priority);
        if (priorityCompare != 0) {
          return priorityCompare;
        }
        return b.timestamp.compareTo(a.timestamp);
      });

    final limited = filtered.length > 3 ? filtered.take(3).toList() : filtered;
    return List<Notification>.unmodifiable(limited);
  }

  /// Check if there are unread notifications
  bool get hasUnread => unreadCount > 0;

  NotificationState copyWith({
    AppStateStatus? status,
    List<Notification>? notifications,
    String? message,
    int? unreadCount,
  }) {
    return NotificationState(
      status: status ?? this.status,
      notifications: notifications ?? this.notifications,
      message: message ?? this.message,
      unreadCount: unreadCount ?? this.unreadCount,
    );
  }
}
