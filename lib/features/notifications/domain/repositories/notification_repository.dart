import 'package:dartz/dartz.dart';
import '../../../../core/error/failures.dart';
import '../../../../domain/notification.dart';

/// Repository interface for notification operations
abstract class NotificationRepository {
  /// Get all notifications
  Future<Either<Failure, List<Notification>>> getNotifications();

  /// Add a new notification
  Future<Either<Failure, Notification>> addNotification(Notification notification);

  /// Mark a notification as read
  Future<Either<Failure, void>> markAsRead(String notificationId);

  /// Mark all notifications as read
  Future<Either<Failure, void>> markAllAsRead();

  /// Dismiss a notification from the notification center
  Future<Either<Failure, void>> dismissNotification(String notificationId);

  /// Restore a dismissed notification
  Future<Either<Failure, void>> restoreNotification(String notificationId);

  /// Delete a notification permanently
  Future<Either<Failure, void>> deleteNotification(String notificationId);

  /// Clear all notifications (dismiss all)
  Future<Either<Failure, void>> clearAll();

  /// Hide banner for a notification
  Future<Either<Failure, void>> hideBanner(String notificationId);
}
