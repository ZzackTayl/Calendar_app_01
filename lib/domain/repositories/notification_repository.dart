import '../../core/result.dart';
import '../notification.dart';

/// Repository interface for notification data operations.
///
/// This repository follows clean architecture principles and provides
/// methods for querying and managing notifications from both remote
/// and local data sources.
///
/// All methods return a [Result] type to handle success and failure
/// cases without throwing exceptions for expected failures.
abstract class NotificationRepository {
  // ========================================
  // Query Methods
  // ========================================

  /// Retrieves all notifications from the remote data source.
  ///
  /// This method fetches notifications from the backend API and
  /// includes all notification types (read, unread, dismissed).
  ///
  /// Returns:
  /// - [Success] with a list of [Notification] objects on successful fetch
  /// - [Failure] if the network request fails or if there's a server error
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.getNotifications();
  /// result.when(
  ///   success: (notifications) => print('Fetched ${notifications.length} notifications'),
  ///   failure: (message, exception) => print('Error: $message'),
  /// );
  /// ```
  Future<Result<List<Notification>>> getNotifications();

  /// Retrieves notifications from the local cache/database.
  ///
  /// This method provides offline access to previously cached notifications.
  /// Useful for displaying notifications when network is unavailable or
  /// for faster initial load times.
  ///
  /// Returns:
  /// - [Success] with a list of cached [Notification] objects
  /// - [Failure] if local storage access fails
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.getLocalNotifications();
  /// result.when(
  ///   success: (notifications) => showNotifications(notifications),
  ///   failure: (message, _) => showError(message),
  /// );
  /// ```
  Future<Result<List<Notification>>> getLocalNotifications();

  /// Retrieves mock notifications for testing and development.
  ///
  /// This method returns sample notification data without making
  /// network requests. Useful for UI development, testing, and
  /// offline demos.
  ///
  /// Returns:
  /// - [Success] with a list of mock [Notification] objects
  /// - [Failure] should rarely occur, but may happen if mock data
  ///   generation fails
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.getMockNotifications();
  /// result.when(
  ///   success: (notifications) => displayInDemo(notifications),
  ///   failure: (message, _) => print('Mock generation failed: $message'),
  /// );
  /// ```
  Future<Result<List<Notification>>> getMockNotifications();

  // ========================================
  // Remote Command Methods
  // ========================================

  /// Marks a single notification as read on the remote server.
  ///
  /// This operation persists the read state to the backend, ensuring
  /// the notification remains marked as read across all devices.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to mark as read
  ///
  /// Returns:
  /// - [Success] with void on successful update
  /// - [Failure] if the network request fails, notification doesn't exist,
  ///   or if there's a server error
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.markAsReadRemote('notif_123');
  /// result.when(
  ///   success: (_) => print('Notification marked as read'),
  ///   failure: (message, _) => showError('Failed to mark as read: $message'),
  /// );
  /// ```
  Future<Result<void>> markAsReadRemote(String notificationId);

  /// Marks all notifications as read on the remote server.
  ///
  /// This bulk operation sets the read state for all notifications
  /// belonging to the current user. Useful for "mark all as read"
  /// functionality in the notification center.
  ///
  /// Returns:
  /// - [Success] with void when all notifications are successfully marked as read
  /// - [Failure] if the network request fails or if there's a server error
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.markAllAsReadRemote();
  /// result.when(
  ///   success: (_) => showSuccess('All notifications marked as read'),
  ///   failure: (message, _) => showError('Failed: $message'),
  /// );
  /// ```
  Future<Result<void>> markAllAsReadRemote();

  /// Updates the state of a notification on the remote server.
  ///
  /// This method allows updating arbitrary notification properties
  /// (read status, dismissed status, etc.) on the backend.
  ///
  /// Parameters:
  /// - [notification]: The notification object with updated state
  ///
  /// Returns:
  /// - [Success] with the updated [Notification] object from the server
  /// - [Failure] if the network request fails, notification doesn't exist,
  ///   validation fails, or if there's a server error
  ///
  /// Example:
  /// ```dart
  /// final updatedNotification = notification.copyWith(isDismissed: true);
  /// final result = await repository.updateNotificationStateRemote(updatedNotification);
  /// result.when(
  ///   success: (notification) => print('Updated: ${notification.id}'),
  ///   failure: (message, _) => showError('Update failed: $message'),
  /// );
  /// ```
  Future<Result<Notification>> updateNotificationStateRemote(
    Notification notification,
  );

  /// Dismisses multiple notifications in a single bulk operation on the remote server.
  ///
  /// This method efficiently dismisses multiple notifications at once,
  /// reducing the number of network requests needed. Dismissed notifications
  /// are hidden from the notification center but remain in history.
  ///
  /// Parameters:
  /// - [notificationIds]: List of notification IDs to dismiss
  ///
  /// Returns:
  /// - [Success] with void when all notifications are successfully dismissed
  /// - [Failure] if the network request fails, any notification doesn't exist,
  ///   or if there's a server error
  ///
  /// Note: If some notifications fail to dismiss, the entire operation may
  /// fail or partially succeed depending on the backend implementation.
  ///
  /// Example:
  /// ```dart
  /// final ids = ['notif_1', 'notif_2', 'notif_3'];
  /// final result = await repository.bulkDismissRemote(ids);
  /// result.when(
  ///   success: (_) => showSuccess('${ids.length} notifications dismissed'),
  ///   failure: (message, _) => showError('Bulk dismiss failed: $message'),
  /// );
  /// ```
  Future<Result<void>> bulkDismissRemote(List<String> notificationIds);

  /// Permanently deletes a notification from the remote server.
  ///
  /// This operation removes the notification from both the notification
  /// center and history. This action is typically irreversible.
  ///
  /// Parameters:
  /// - [notificationId]: The unique identifier of the notification to delete
  ///
  /// Returns:
  /// - [Success] with void on successful deletion
  /// - [Failure] if the network request fails, notification doesn't exist,
  ///   or if there's a server error
  ///
  /// Warning: This permanently removes the notification. Consider using
  /// dismiss functionality instead if you want to preserve notification history.
  ///
  /// Example:
  /// ```dart
  /// final result = await repository.deleteNotificationRemote('notif_123');
  /// result.when(
  ///   success: (_) => print('Notification deleted permanently'),
  ///   failure: (message, _) => showError('Delete failed: $message'),
  /// );
  /// ```
  Future<Result<void>> deleteNotificationRemote(String notificationId);

  // ========================================
  // Local Command Methods
  // ========================================

  /// Saves notifications to local cache/database for offline access.
  ///
  /// This method persists notifications to local storage, enabling
  /// offline functionality and faster subsequent loads. Typically called
  /// after successfully fetching notifications from the remote server.
  ///
  /// Parameters:
  /// - [notifications]: List of notifications to cache locally
  ///
  /// Returns:
  /// - [Success] with void when notifications are successfully saved
  /// - [Failure] if local storage access fails or if there's insufficient space
  ///
  /// Example:
  /// ```dart
  /// final remoteResult = await repository.getNotifications();
  /// if (remoteResult.isSuccess) {
  ///   final notifications = remoteResult.dataOrNull!;
  ///   final saveResult = await repository.saveLocalNotifications(notifications);
  ///   saveResult.when(
  ///     success: (_) => print('Cached ${notifications.length} notifications'),
  ///     failure: (message, _) => print('Cache failed: $message'),
  ///   );
  /// }
  /// ```
  Future<Result<void>> saveLocalNotifications(List<Notification> notifications);
}
