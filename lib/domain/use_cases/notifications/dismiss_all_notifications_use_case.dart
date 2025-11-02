import '../../../core/result.dart';
import '../../../core/firebase_app_services.dart';
import '../../repositories/notification_repository.dart';

/// Use case for dismissing all notifications that are shown in the notification center.
///
/// This bulk operation dismisses all notifications where showInCenter=true,
/// effectively clearing the notification center while preserving all
/// notifications in history.
///
/// This use case:
/// - Only dismisses notifications with showInCenter=true
/// - Syncs bulk dismiss to remote if authenticated
/// - Updates local cache for immediate UI feedback
///
/// Example usage:
/// ```dart
/// final useCase = DismissAllNotificationsUseCase(repository);
/// final result = await useCase.call();
/// result.when(
///   success: (_) => print('All notifications dismissed'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class DismissAllNotificationsUseCase {
  final NotificationRepository _repository;

  const DismissAllNotificationsUseCase(this._repository);

  /// Dismisses all notifications that are shown in the notification center.
  ///
  /// Returns:
  /// - [Success] with void when all applicable notifications are dismissed
  /// - [Failure] if the operation fails
  Future<Result<void>> call() async {
    // Get local notifications
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isFailure) {
      return Failure('Failed to load local notifications: ${localResult.errorOrNull}');
    }

    final notifications = localResult.dataOrNull!;

    // Find all notifications that should be dismissed (showInCenter=true)
    final notificationsToDismiss = notifications
        .where((n) => n.showInCenter && !n.isDismissed)
        .toList();

    if (notificationsToDismiss.isEmpty) {
      // Nothing to dismiss
      return const Success(null);
    }

    final idsTodismiss = notificationsToDismiss.map((n) => n.id).toList();

    // Sync to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.bulkDismissRemote(idsTodismiss);

      if (remoteResult.isFailure) {
        // Remote sync failed, but we'll still update local
        // This allows offline functionality
      }
    }

    // Update local cache - dismiss all notifications with showInCenter=true
    final updatedNotifications = notifications.map((notification) {
      if (notification.showInCenter && !notification.isDismissed) {
        return notification.dismiss();
      }
      return notification;
    }).toList();

    await _repository.saveLocalNotifications(updatedNotifications);

    return const Success(null);
  }
}
