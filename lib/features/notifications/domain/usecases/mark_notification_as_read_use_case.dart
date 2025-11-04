import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../repositories/notification_repository.dart';

/// Use case for marking a single notification as read.
///
/// This use case handles marking notifications as read with intelligent
/// sync behavior:
/// - If authenticated: Syncs read state to remote server first
/// - Always updates local cache to ensure immediate UI feedback
///
/// This ensures read state is preserved across devices when possible,
/// while still providing responsive local updates.
///
/// Example usage:
/// ```dart
/// final useCase = MarkNotificationAsReadUseCase(repository);
/// final result = await useCase.call('notification-id-123');
/// result.when(
///   success: (_) => print('Notification marked as read'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class MarkNotificationAsReadUseCase {
  final NotificationRepository _repository;

  const MarkNotificationAsReadUseCase(this._repository);

  /// Marks the specified notification as read.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to mark as read
  ///
  /// Returns:
  /// - [Success] with void when the notification is successfully marked as read
  /// - [Failure] if the operation fails on both remote and local
  Future<Result<void>> call(String notificationId) async {
    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.markAsReadRemote(notificationId);

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update local cache
    // We need to get current notifications, update the specific one, and save back
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isSuccess) {
      final notifications = localResult.dataOrNull!;
      final updatedNotifications = notifications.map((notification) {
        if (notification.id == notificationId) {
          return notification.markAsRead();
        }
        return notification;
      }).toList();

      await _repository.saveLocalNotifications(updatedNotifications);
    }

    return const Success(null);
  }
}
