import 'package:equatable/equatable.dart';
import '../../../domain/notification.dart';

/// Base class for all notification-related states
abstract class NotificationState extends Equatable {
  const NotificationState();

  @override
  List<Object?> get props => [];
}

/// Initial state when the bloc is first created
///
/// This is the default state before any notifications have been loaded.
class NotificationInitial extends NotificationState {
  const NotificationInitial();
}

/// State when a notification operation is in progress
///
/// Used for initial loading operations where no previous data exists.
class NotificationLoading extends NotificationState {
  const NotificationLoading();
}

/// State when refreshing notifications while showing current data
///
/// This state allows the UI to show a refresh indicator while
/// keeping the current notifications visible, providing better UX.
///
/// Parameters:
/// - [currentNotifications]: The current list of notifications being displayed
class NotificationRefreshing extends NotificationState {
  final List<Notification> currentNotifications;

  const NotificationRefreshing(this.currentNotifications);

  @override
  List<Object?> get props => [currentNotifications];
}

/// State when notifications have been successfully loaded
///
/// This state includes pre-computed derived values for performance:
/// - [centerVisible]: Notifications visible in the notification center
///   (3-day window, max 12 items, showInCenter=true, !isDismissed)
/// - [unreadCount]: Count of unread notifications in the center
///   (showInCenter && !isRead && !isDismissed)
///
/// These computed values eliminate the need for expensive filtering
/// operations in the UI layer.
///
/// Parameters:
/// - [notifications]: Complete list of all notifications
/// - [centerVisible]: Pre-filtered list of notifications for the center UI
/// - [unreadCount]: Pre-computed count of unread notifications
class NotificationLoaded extends NotificationState {
  final List<Notification> notifications;
  final List<Notification> centerVisible;
  final int unreadCount;

  const NotificationLoaded({
    required this.notifications,
    required this.centerVisible,
    required this.unreadCount,
  });

  @override
  List<Object?> get props => [notifications, centerVisible, unreadCount];

  /// Creates a copy of this state with updated values
  ///
  /// This method automatically recomputes [centerVisible] and [unreadCount]
  /// when notifications change, ensuring derived state stays synchronized.
  NotificationLoaded copyWith({
    List<Notification>? notifications,
  }) {
    final updatedNotifications = notifications ?? this.notifications;

    // Recompute center-visible notifications
    final windowStart = DateTime.now().subtract(const Duration(days: 3));
    final visible = updatedNotifications
        .where((n) =>
            n.showInCenter &&
            !n.isDismissed &&
            n.timestamp.isAfter(windowStart))
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    final computedCenterVisible =
        visible.length > 12 ? visible.take(12).toList() : visible;

    // Recompute unread count
    final computedUnreadCount = updatedNotifications
        .where((n) => n.showInCenter && !n.isRead && !n.isDismissed)
        .length;

    return NotificationLoaded(
      notifications: updatedNotifications,
      centerVisible: computedCenterVisible,
      unreadCount: computedUnreadCount,
    );
  }

  /// Factory constructor to create NotificationLoaded with computed values
  ///
  /// This ensures all derived state is computed consistently when creating
  /// a new loaded state from raw notification data.
  factory NotificationLoaded.fromNotifications(
    List<Notification> notifications,
  ) {
    // Compute center-visible notifications (3-day window, max 12 items)
    final windowStart = DateTime.now().subtract(const Duration(days: 3));
    final visible = notifications
        .where((n) =>
            n.showInCenter &&
            !n.isDismissed &&
            n.timestamp.isAfter(windowStart))
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    final centerVisible =
        visible.length > 12 ? visible.take(12).toList() : visible;

    // Compute unread count
    final unreadCount = notifications
        .where((n) => n.showInCenter && !n.isRead && !n.isDismissed)
        .length;

    return NotificationLoaded(
      notifications: notifications,
      centerVisible: centerVisible,
      unreadCount: unreadCount,
    );
  }
}

/// State when a notification operation has completed successfully
///
/// This transient state provides user feedback after successful operations
/// like marking notifications as read, dismissing, or restoring them.
/// Typically transitions back to [NotificationLoaded] immediately.
///
/// Parameters:
/// - [message]: Success message to display to the user
/// - [notifications]: Updated list of notifications after the operation
class NotificationOperationSuccess extends NotificationState {
  final String message;
  final List<Notification> notifications;

  const NotificationOperationSuccess({
    required this.message,
    required this.notifications,
  });

  @override
  List<Object?> get props => [message, notifications];
}

/// State when an error occurs during a notification operation
///
/// This state preserves the previous notifications if available,
/// allowing the UI to continue displaying cached data while
/// showing an error message.
///
/// Parameters:
/// - [message]: Error message describing what went wrong
/// - [previousNotifications]: Optional list of notifications from before the error
class NotificationError extends NotificationState {
  final String message;
  final List<Notification>? previousNotifications;

  const NotificationError({
    required this.message,
    this.previousNotifications,
  });

  @override
  List<Object?> get props => [message, previousNotifications];
}
