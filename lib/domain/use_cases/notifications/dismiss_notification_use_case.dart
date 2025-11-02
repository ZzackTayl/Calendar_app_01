import '../../../core/result.dart';
import '../../../core/firebase_app_services.dart';
import '../../repositories/notification_repository.dart';

/// Use case for dismissing a single notification.
///
/// Dismissing a notification hides it from the notification center
/// while keeping it in the notification history. The notification's
/// isDismissed flag is set to true.
///
/// This use case:
/// - Syncs dismiss state to remote if authenticated
/// - Updates local cache with isDismissed=true
/// - Preserves the notification for history/audit purposes
///
/// Example usage:
/// ```dart
/// final useCase = DismissNotificationUseCase(repository);
/// final result = await useCase.call('notification-id-123');
/// result.when(
///   success: (_) => print('Notification dismissed'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class DismissNotificationUseCase {
  final NotificationRepository _repository;

  const DismissNotificationUseCase(this._repository);

  /// Dismisses the specified notification.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to dismiss
  ///
  /// Returns:
  /// - [Success] with void when the notification is successfully dismissed
  /// - [Failure] if the operation fails
  Future<Result<void>> call(String notificationId) async {
    // Get the notification to update
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isFailure) {
      return Failure('Failed to load local notifications: ${localResult.errorOrNull}');
    }

    final notifications = localResult.dataOrNull!;
    final notification = notifications.where((n) => n.id == notificationId).firstOrNull;

    if (notification == null) {
      return Failure('Notification with id $notificationId not found');
    }

    // Create dismissed version
    final dismissedNotification = notification.dismiss();

    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.updateNotificationStateRemote(
        dismissedNotification,
      );

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update local cache
    final updatedNotifications = notifications.map((n) {
      if (n.id == notificationId) {
        return dismissedNotification;
      }
      return n;
    }).toList();

    await _repository.saveLocalNotifications(updatedNotifications);

    return const Success(null);
  }
}
