import '../../../core/result.dart';
import '../../../core/firebase_app_services.dart';
import '../../notification.dart';
import '../../repositories/notification_repository.dart';

/// Use case for adding a new notification with deduplication.
///
/// This use case handles adding notifications with critical deduplication logic:
/// - **Deduplication check**: Rejects notifications if ID already exists
/// - Adds to remote server if authenticated
/// - Adds to local cache for immediate UI feedback
///
/// Deduplication prevents duplicate notifications from being added,
/// which is critical for maintaining data integrity and user experience.
///
/// Example usage:
/// ```dart
/// final useCase = AddNotificationUseCase(repository);
/// final notification = Notification(
///   id: 'unique-id-123',
///   type: NotificationType.eventReminder,
///   title: 'Meeting in 15 minutes',
///   message: 'Team sync at 2:00 PM',
///   isRead: false,
///   timestamp: DateTime.now(),
/// );
/// final result = await useCase.call(notification);
/// result.when(
///   success: (_) => print('Notification added'),
///   failure: (message, _) => showError(message),
/// );
/// ```
class AddNotificationUseCase {
  final NotificationRepository _repository;

  const AddNotificationUseCase(this._repository);

  /// Adds a new notification with deduplication check.
  ///
  /// Parameters:
  /// - [notification]: The notification to add
  ///
  /// Returns:
  /// - [Success] with void when the notification is successfully added
  /// - [Failure] if:
  ///   - A notification with the same ID already exists (deduplication)
  ///   - The operation fails for other reasons
  Future<Result<void>> call(Notification notification) async {
    // CRITICAL: Deduplication check - reject if ID already exists
    final localResult = await _repository.getLocalNotifications();

    if (localResult.isSuccess) {
      final existingNotifications = localResult.dataOrNull!;
      final isDuplicate = existingNotifications.any((n) => n.id == notification.id);

      if (isDuplicate) {
        return Failure(
          'Cannot add notification: notification with ID ${notification.id} already exists',
        );
      }
    }

    // Add to remote if authenticated
    if (FirebaseAppServices.isConfigured &&
        FirebaseAppServices.isAuthenticated) {
      final remoteResult = await _repository.updateNotificationStateRemote(
        notification,
      );

      if (remoteResult.isFailure) {
        // Remote add failed, but we'll still add locally
        // This allows offline notification creation
      }
    }

    // Add to local cache
    if (localResult.isSuccess) {
      final existingNotifications = localResult.dataOrNull!;
      final updatedNotifications = [
        notification,
        ...existingNotifications,
      ];

      await _repository.saveLocalNotifications(updatedNotifications);
    } else {
      // No existing local notifications, create new list
      await _repository.saveLocalNotifications([notification]);
    }

    return const Success(null);
  }
}
