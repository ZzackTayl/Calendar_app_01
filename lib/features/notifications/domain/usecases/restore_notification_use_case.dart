import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../repositories/notification_repository.dart';

/// Use case for restoring a dismissed notification back to the notification center.
///
/// Restoring a notification:
/// - Sets isDismissed=false to show it in the notification center again
/// - Removes metadata keys related to dismissal (e.g., 'banner_hidden')
/// - Syncs the restore action to remote if authenticated
///
/// This allows users to undo accidental dismissals or bring back
/// important notifications that were previously dismissed.
///
/// Example usage:
/// ```dart
/// final useCase = RestoreNotificationUseCase(repository);
/// final result = await useCase.call('notification-id-123');
/// result.when(
///   success: (_) => print('Notification restored'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class RestoreNotificationUseCase {
  final NotificationRepository _repository;

  const RestoreNotificationUseCase(this._repository);

  /// Restores the specified notification to the notification center.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to restore
  ///
  /// Returns:
  /// - [Success] with void when the notification is successfully restored
  /// - [Failure] if the operation fails or notification not found
  Future<Result<void>> call(String notificationId) async {
    // Get the notification to restore
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isFailure) {
      return Failure('Failed to load local notifications: ${localResult.errorOrNull}');
    }

    final notifications = localResult.dataOrNull!;
    final notification = notifications.where((n) => n.id == notificationId).firstOrNull;

    if (notification == null) {
      return Failure('Notification with id $notificationId not found');
    }

    // Create restored version:
    // 1. Set isDismissed=false
    // 2. Remove metadata keys related to dismissal
    final cleanedMetadata = notification.metadata != null
        ? Map<String, dynamic>.from(notification.metadata!)
        : <String, dynamic>{};

    // Remove dismissal-related metadata keys
    cleanedMetadata.remove('banner_hidden');
    cleanedMetadata.remove('dismissed_at');
    cleanedMetadata.remove('dismissed_by');

    final restoredNotification = notification.restore().copyWith(
      metadata: cleanedMetadata.isEmpty ? null : cleanedMetadata,
    );

    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.updateNotificationStateRemote(
        restoredNotification,
      );

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update local cache
    final updatedNotifications = notifications.map((n) {
      if (n.id == notificationId) {
        return restoredNotification;
      }
      return n;
    }).toList();

    await _repository.saveLocalNotifications(updatedNotifications);

    return const Success(null);
  }
}
