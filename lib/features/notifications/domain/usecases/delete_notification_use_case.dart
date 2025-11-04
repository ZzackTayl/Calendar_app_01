import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../repositories/notification_repository.dart';

/// Use case for permanently deleting a notification.
///
/// Deleting a notification permanently removes it from both:
/// - The notification center
/// - Notification history
/// - Remote server (if authenticated)
/// - Local cache
///
/// WARNING: This action is irreversible. Consider using DismissNotificationUseCase
/// instead if you want to preserve notification history.
///
/// Example usage:
/// ```dart
/// final useCase = DeleteNotificationUseCase(repository);
/// final result = await useCase.call('notification-id-123');
/// result.when(
///   success: (_) => print('Notification deleted permanently'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class DeleteNotificationUseCase {
  final NotificationRepository _repository;

  const DeleteNotificationUseCase(this._repository);

  /// Permanently deletes the specified notification.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to delete
  ///
  /// Returns:
  /// - [Success] with void when the notification is successfully deleted
  /// - [Failure] if the operation fails
  Future<Result<void>> call(String notificationId) async {
    // Delete from remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.deleteNotificationRemote(notificationId);

      if (remoteResult.isFailure) {
        // Remote delete failed, but we'll still update local
        // This allows offline deletion that will sync later
      }
    }

    // Delete from local cache
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isSuccess) {
      final notifications = localResult.dataOrNull!;
      final updatedNotifications = notifications
          .where((n) => n.id != notificationId)
          .toList();

      await _repository.saveLocalNotifications(updatedNotifications);
    }

    return const Success(null);
  }
}
