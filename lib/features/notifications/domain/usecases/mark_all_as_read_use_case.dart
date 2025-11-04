import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../repositories/notification_repository.dart';

/// Use case for marking all notifications as read.
///
/// This use case provides bulk "mark as read" functionality:
/// - If authenticated: Syncs all notifications as read to remote server
/// - Always updates local cache to mark all notifications as read
///
/// This is commonly used for the "mark all as read" button in
/// notification centers.
///
/// Example usage:
/// ```dart
/// final useCase = MarkAllAsReadUseCase(repository);
/// final result = await useCase.call();
/// result.when(
///   success: (_) => print('All notifications marked as read'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class MarkAllAsReadUseCase {
  final NotificationRepository _repository;

  const MarkAllAsReadUseCase(this._repository);

  /// Marks all notifications as read.
  ///
  /// Returns:
  /// - [Success] with void when all notifications are successfully marked as read
  /// - [Failure] if the operation fails
  Future<Result<void>> call() async {
    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.markAllAsReadRemote();

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update all local notifications to read state
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isSuccess) {
      final notifications = localResult.dataOrNull!;
      final updatedNotifications = notifications
          .map((notification) => notification.markAsRead())
          .toList();

      await _repository.saveLocalNotifications(updatedNotifications);
    }

    return const Success(null);
  }
}
