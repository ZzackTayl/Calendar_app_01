import 'package:equatable/equatable.dart';
import '../../../domain/notification.dart';

/// Base class for all notification-related events
abstract class NotificationEvent extends Equatable {
  const NotificationEvent();

  @override
  List<Object?> get props => [];
}

/// Event to load all notifications from the repository
///
/// This event triggers the initial fetch of notifications, applying
/// retention rules and computing derived state like unread count and
/// center visibility.
class LoadNotifications extends NotificationEvent {
  const LoadNotifications();
}

/// Event to refresh the notification list
///
/// Similar to [LoadNotifications] but preserves the current state
/// while loading, providing a better user experience during refresh.
class RefreshNotifications extends NotificationEvent {
  const RefreshNotifications();
}

/// Event to add a new notification to the system
///
/// This event includes built-in deduplication logic in the use case
/// to prevent duplicate notifications from being created.
///
/// Parameters:
/// - [notification]: The notification to add to the system
class AddNotification extends NotificationEvent {
  final Notification notification;

  const AddNotification(this.notification);

  @override
  List<Object?> get props => [notification];
}

/// Event to mark a single notification as read
///
/// Updates both local state and remote storage to persist the
/// read status across sessions and devices.
///
/// Parameters:
/// - [notificationId]: The unique identifier of the notification to mark as read
class MarkNotificationAsRead extends NotificationEvent {
  final String notificationId;

  const MarkNotificationAsRead(this.notificationId);

  @override
  List<Object?> get props => [notificationId];
}

/// Event to mark all notifications as read
///
/// Bulk operation that marks all notifications as read in both
/// local state and remote storage. Useful for clearing the
/// notification center with a single action.
class MarkAllNotificationsAsRead extends NotificationEvent {
  const MarkAllNotificationsAsRead();
}

/// Event to dismiss a notification from the center
///
/// Dismissing removes the notification from the notification center
/// but keeps it in the history/overview timeline. This is a soft
/// delete that can be reversed.
///
/// Parameters:
/// - [notificationId]: The unique identifier of the notification to dismiss
class DismissNotification extends NotificationEvent {
  final String notificationId;

  const DismissNotification(this.notificationId);

  @override
  List<Object?> get props => [notificationId];
}

/// Event to dismiss all notifications from the center
///
/// Bulk operation that dismisses all notifications at once.
/// Dismissed notifications remain in history but are hidden
/// from the notification center.
class DismissAllNotifications extends NotificationEvent {
  const DismissAllNotifications();
}

/// Event to restore a previously dismissed notification
///
/// Restores a dismissed notification back to the notification center,
/// making it visible again while preserving its read/unread status.
///
/// Parameters:
/// - [notificationId]: The unique identifier of the notification to restore
class RestoreNotification extends NotificationEvent {
  final String notificationId;

  const RestoreNotification(this.notificationId);

  @override
  List<Object?> get props => [notificationId];
}

/// Event to hide a notification banner without dismissing
///
/// Hides the banner/toast notification without marking it as dismissed.
/// This is useful for temporary UI dismissal while keeping the
/// notification visible in the notification center.
///
/// Parameters:
/// - [notificationId]: The unique identifier of the notification banner to hide
class HideNotificationBanner extends NotificationEvent {
  final String notificationId;

  const HideNotificationBanner(this.notificationId);

  @override
  List<Object?> get props => [notificationId];
}

/// Event to permanently delete a notification
///
/// This is a hard delete that removes the notification from both
/// the notification center and history. This action is typically
/// irreversible and should be used with caution.
///
/// Parameters:
/// - [notificationId]: The unique identifier of the notification to delete
class DeleteNotification extends NotificationEvent {
  final String notificationId;

  const DeleteNotification(this.notificationId);

  @override
  List<Object?> get props => [notificationId];
}

/// Event to clear any error states
///
/// Clears error messages and attempts to restore the previous
/// valid state if available. This allows users to dismiss error
/// messages and continue using the app.
class ClearNotificationError extends NotificationEvent {
  const ClearNotificationError();
}
