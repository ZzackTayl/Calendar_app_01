import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/notification.dart';
import '../../domain/repositories/notification_repository.dart';

/// State for NotificationCubit
class NotificationState {
  final AppStateStatus status;
  final List<Notification> notifications;
  final String message;

  const NotificationState({
    this.status = AppStateStatus.initial,
    this.notifications = const [],
    this.message = '',
  });

  NotificationState copyWith({
    AppStateStatus? status,
    List<Notification>? notifications,
    String? message,
  }) {
    return NotificationState(
      status: status ?? this.status,
      notifications: notifications ?? this.notifications,
      message: message ?? this.message,
    );
  }

  /// Get unread notifications count
  int get unreadCount {
    return notifications.where((n) => !n.isRead).length;
  }

  /// Get unread notifications
  List<Notification> get unreadNotifications {
    return notifications.where((n) => !n.isRead).toList();
  }

  /// Get visible notifications for notification center
  List<Notification> get visibleNotifications {
    const centerWindow = Duration(days: 3);
    const maxItems = 12;
    
    final windowStart = DateTime.now().subtract(centerWindow);
    final visible = notifications
        .where(
          (n) =>
              n.showInCenter &&
              !n.isDismissed &&
              n.timestamp.isAfter(windowStart),
        )
        .toList()
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

    if (visible.length > maxItems) {
      return visible.take(maxItems).toList();
    }
    return visible;
  }

  /// Get notifications by type
  List<Notification> getNotificationsByType(NotificationType type) {
    return notifications.where((n) => n.type == type).toList();
  }
}

/// Cubit for managing notifications
class NotificationCubit extends Cubit<NotificationState> {
  final NotificationRepository repository;

  NotificationCubit({required this.repository})
      : super(const NotificationState());

  /// Load all notifications
  Future<void> loadNotifications() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getNotifications();

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (notifications) => emit(state.copyWith(
        status: AppStateStatus.success,
        notifications: notifications,
        message: '',
      )),
    );
  }

  /// Add a new notification
  Future<void> addNotification(Notification notification) async {
    final result = await repository.addNotification(notification);

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (added) {
        final updated = [added, ...state.notifications];
        emit(state.copyWith(
          status: AppStateStatus.success,
          notifications: updated,
          message: 'Notification added',
        ));
      },
    );
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    // Optimistic update
    final optimistic = state.notifications
        .map((n) => n.id == notificationId ? n.markAsRead() : n)
        .toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.markAsRead(notificationId);

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: '',
      )),
    );
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    // Optimistic update
    final optimistic = state.notifications.map((n) => n.markAsRead()).toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.markAllAsRead();

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'All notifications marked as read',
      )),
    );
  }

  /// Dismiss a notification from the notification center
  Future<void> dismissNotification(String notificationId) async {
    // Optimistic update
    final optimistic = state.notifications.map((n) {
      if (n.id != notificationId) return n;
      return n.dismiss();
    }).toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.dismissNotification(notificationId);

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: '',
      )),
    );
  }

  /// Restore a dismissed notification
  Future<void> restoreNotification(String notificationId) async {
    // Optimistic update
    final optimistic = state.notifications.map((n) {
      if (n.id != notificationId) return n;
      return n.restore();
    }).toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.restoreNotification(notificationId);

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: '',
      )),
    );
  }

  /// Delete a notification permanently
  Future<void> deleteNotification(String notificationId) async {
    // Optimistic delete
    final optimistic =
        state.notifications.where((n) => n.id != notificationId).toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.deleteNotification(notificationId);

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'Notification deleted',
      )),
    );
  }

  /// Clear all notifications (dismiss all)
  Future<void> clearAll() async {
    // Optimistic update
    final optimistic = state.notifications.map((n) {
      if (!n.showInCenter) return n;
      return n.dismiss();
    }).toList();
    emit(state.copyWith(notifications: optimistic));

    final result = await repository.clearAll();

    result.fold(
      (failure) {
        // Revert on failure
        loadNotifications();
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        message: 'All notifications cleared',
      )),
    );
  }

  /// Hide banner for a notification
  Future<void> hideBanner(String notificationId) async {
    final result = await repository.hideBanner(notificationId);

    result.fold(
      (failure) => emit(state.copyWith(
        status: AppStateStatus.failure,
        message: failure.message,
      )),
      (_) {
        // Reload to get updated state
        loadNotifications();
      },
    );
  }

  /// Refresh notifications
  Future<void> refresh() => loadNotifications();
}
