import '../../../../core/result.dart';
import '../entities/notification.dart';

/// Repository interface for notification operations
abstract class NotificationRepository {
  /// Get all notifications (remote)
  Future<Result<List<Notification>>> getNotifications();

  /// Get notifications from local cache
  Future<Result<List<Notification>>> getLocalNotifications();

  /// Get mock notifications (fallback for offline mode)
  Future<Result<List<Notification>>> getMockNotifications();

  /// Save notifications to local cache
  Future<void> saveLocalNotifications(List<Notification> notifications);

  /// Add a new notification
  Future<Result<Notification>> addNotification(Notification notification);

  /// Mark a notification as read (remote)
  Future<Result<void>> markAsReadRemote(String notificationId);

  /// Mark all notifications as read (remote)
  Future<Result<void>> markAllAsReadRemote();

  /// Update notification state (generic remote update)
  Future<Result<void>> updateNotificationStateRemote(Notification notification);

  /// Dismiss notifications in bulk (remote)
  Future<Result<void>> bulkDismissRemote(List<String> notificationIds);

  /// Delete a notification permanently (remote)
  Future<Result<void>> deleteNotificationRemote(String notificationId);
}
