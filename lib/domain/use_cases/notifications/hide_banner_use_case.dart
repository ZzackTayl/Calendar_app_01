import '../../../core/result.dart';
import '../../../core/firebase_app_services.dart';
import '../../repositories/notification_repository.dart';

/// Use case for hiding a notification's banner display.
///
/// Hiding a banner allows users to dismiss the in-app banner notification
/// while keeping the notification visible in the notification center.
/// This is useful for non-urgent notifications that users want to acknowledge
/// without fully dismissing.
///
/// This use case:
/// - Sets metadata['banner_hidden']=true
/// - Syncs to remote if authenticated
/// - Updates local cache immediately
///
/// Example usage:
/// ```dart
/// final useCase = HideBannerUseCase(repository);
/// final result = await useCase.call('notification-id-123');
/// result.when(
///   success: (_) => print('Banner hidden'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class HideBannerUseCase {
  final NotificationRepository _repository;

  const HideBannerUseCase(this._repository);

  /// Hides the banner for the specified notification.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification whose banner to hide
  ///
  /// Returns:
  /// - [Success] with void when the banner is successfully hidden
  /// - [Failure] if the operation fails or notification not found
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

    // Create updated metadata with banner_hidden flag
    final updatedMetadata = notification.metadata != null
        ? Map<String, dynamic>.from(notification.metadata!)
        : <String, dynamic>{};

    updatedMetadata['banner_hidden'] = true;

    final updatedNotification = notification.copyWith(
      metadata: updatedMetadata,
    );

    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.updateNotificationStateRemote(
        updatedNotification,
      );

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update local cache
    final updatedNotifications = notifications.map((n) {
      if (n.id == notificationId) {
        return updatedNotification;
      }
      return n;
    }).toList();

    await _repository.saveLocalNotifications(updatedNotifications);

    return const Success(null);
  }
}
