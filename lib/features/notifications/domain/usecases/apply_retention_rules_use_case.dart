import '../../../../core/result.dart';
import '../../../../core/firebase_app_services.dart';
import '../repositories/notification_repository.dart';

/// Use case for applying notification retention rules.
///
/// This use case implements the 14-day retention policy:
/// - Removes notifications older than 14 days from both remote and local storage
/// - Helps maintain database size and performance
/// - Ensures users don't accumulate indefinite notification history
///
/// This should be run periodically (e.g., on app startup or daily background task)
/// to keep the notification database clean.
///
/// Example usage:
/// ```dart
/// final useCase = ApplyRetentionRulesUseCase(repository);
/// final result = await useCase.call();
/// result.when(
///   success: (removedCount) => print('Removed $removedCount old notifications'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class ApplyRetentionRulesUseCase {
  final NotificationRepository _repository;

  /// The retention period in days. Notifications older than this will be removed.
  static const int retentionDays = 14;

  const ApplyRetentionRulesUseCase(this._repository);

  /// Applies retention rules and removes old notifications.
  ///
  /// Returns:
  /// - [Success] with the count of notifications removed
  /// - [Failure] if the operation fails
  Future<Result<int>> call() async {
    // Calculate the cutoff date (14 days ago)
    final cutoffDate = DateTime.now().subtract(const Duration(days: retentionDays));

    // Get local notifications
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isFailure) {
      return Failure('Failed to load local notifications: ${localResult.errorOrNull}');
    }

    final notifications = localResult.dataOrNull!;

    // Find notifications older than retention period
    final notificationsToRemove = notifications
        .where((n) => n.timestamp.isBefore(cutoffDate))
        .toList();

    if (notificationsToRemove.isEmpty) {
      // No notifications to remove
      return const Success(0);
    }

    final idsToRemove = notificationsToRemove.map((n) => n.id).toList();
    final removedCount = idsToRemove.length;

    // Delete from remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      // Delete each notification from remote
      // Note: This could be optimized with a bulk delete endpoint if available
      for (final id in idsToRemove) {
        final remoteResult = await _repository.deleteNotificationRemote(id);

        if (remoteResult.isFailure) {
          // Log error but continue with other deletions
          // Individual failures shouldn't stop the entire cleanup process
        }
      }
    }

    // Update local cache - remove old notifications
    final updatedNotifications = notifications
        .where((n) => !idsToRemove.contains(n.id))
        .toList();

    await _repository.saveLocalNotifications(updatedNotifications);

    return Success(removedCount);
  }
}
