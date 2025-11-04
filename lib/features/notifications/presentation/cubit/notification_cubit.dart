import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../domain/entities/notification.dart';
import '../../domain/usecases/get_notifications_use_case.dart';
import '../../domain/usecases/mark_notification_as_read_use_case.dart';
import '../../domain/usecases/mark_all_as_read_use_case.dart';
import '../../domain/usecases/dismiss_notification_use_case.dart';
import '../../domain/usecases/restore_notification_use_case.dart';
import '../../domain/usecases/delete_notification_use_case.dart';
import '../../domain/usecases/dismiss_all_notifications_use_case.dart';
import '../../domain/usecases/hide_banner_use_case.dart';
import '../../domain/usecases/add_notification_use_case.dart';

part 'notification_state.dart';

/// Cubit for managing notifications following MyOrbit_CleanArch pattern
class NotificationCubit extends Cubit<NotificationState> {
  NotificationCubit({
    required GetNotificationsUseCase getNotifications,
    required MarkNotificationAsReadUseCase markAsRead,
    required MarkAllAsReadUseCase markAllAsRead,
    required DismissNotificationUseCase dismissNotification,
    required RestoreNotificationUseCase restoreNotification,
    required DeleteNotificationUseCase deleteNotification,
    required DismissAllNotificationsUseCase dismissAll,
    required HideBannerUseCase hideBanner,
    required AddNotificationUseCase addNotification,
  })  : _getNotifications = getNotifications,
        _markAsRead = markAsRead,
        _markAllAsRead = markAllAsRead,
        _dismissNotification = dismissNotification,
        _restoreNotification = restoreNotification,
        _deleteNotification = deleteNotification,
        _dismissAll = dismissAll,
        _hideBanner = hideBanner,
        _addNotification = addNotification,
        super(const NotificationState());

  final GetNotificationsUseCase _getNotifications;
  final MarkNotificationAsReadUseCase _markAsRead;
  final MarkAllAsReadUseCase _markAllAsRead;
  final DismissNotificationUseCase _dismissNotification;
  final RestoreNotificationUseCase _restoreNotification;
  final DeleteNotificationUseCase _deleteNotification;
  final DismissAllNotificationsUseCase _dismissAll;
  final HideBannerUseCase _hideBanner;
  final AddNotificationUseCase _addNotification;

  /// Load all notifications
  Future<void> loadNotifications() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _getNotifications.call();

    result.when(
      success: (notifications) {
        final unreadCount = notifications.where((n) => !n.isRead).length;

        emit(state.copyWith(
          status: AppStateStatus.success,
          notifications: notifications,
          unreadCount: unreadCount,
          message: '',
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to load notifications: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Mark a notification as read
  Future<void> markAsRead(String notificationId) async {
    final result = await _markAsRead.call(notificationId);

    result.when(
      success: (_) {
        // Update local state
        final updatedNotifications = state.notifications.map((n) {
          if (n.id == notificationId) {
            return n.markAsRead();
          }
          return n;
        }).toList();

        final unreadCount = updatedNotifications.where((n) => !n.isRead).length;

        emit(state.copyWith(
          notifications: updatedNotifications,
          unreadCount: unreadCount,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to mark notification as read: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _markAllAsRead.call();

    result.when(
      success: (_) {
        // Update local state
        final updatedNotifications =
            state.notifications.map((n) => n.markAsRead()).toList();

        emit(state.copyWith(
          status: AppStateStatus.success,
          notifications: updatedNotifications,
          unreadCount: 0,
          message: 'All notifications marked as read',
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to mark all as read: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Dismiss a notification from the notification center
  Future<void> dismissNotification(String notificationId) async {
    final result = await _dismissNotification.call(notificationId);

    result.when(
      success: (_) {
        // Update local state
        final updatedNotifications = state.notifications.map((n) {
          if (n.id == notificationId) {
            return n.dismiss();
          }
          return n;
        }).toList();

        emit(state.copyWith(
          notifications: updatedNotifications,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to dismiss notification: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Restore a dismissed notification
  Future<void> restoreNotification(String notificationId) async {
    final result = await _restoreNotification.call(notificationId);

    result.when(
      success: (_) {
        // Update local state
        final updatedNotifications = state.notifications.map((n) {
          if (n.id == notificationId) {
            return n.restore();
          }
          return n;
        }).toList();

        emit(state.copyWith(
          notifications: updatedNotifications,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to restore notification: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Delete a notification permanently
  Future<void> deleteNotification(String notificationId) async {
    final result = await _deleteNotification.call(notificationId);

    result.when(
      success: (_) {
        // Remove from local state
        final updatedNotifications =
            state.notifications.where((n) => n.id != notificationId).toList();

        final unreadCount = updatedNotifications.where((n) => !n.isRead).length;

        emit(state.copyWith(
          notifications: updatedNotifications,
          unreadCount: unreadCount,
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to delete notification: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Clear all notifications (dismiss all)
  Future<void> clearAll() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _dismissAll.call();

    result.when(
      success: (_) {
        // Update local state - dismiss all that show in center
        final updatedNotifications = state.notifications.map((n) {
          if (n.showInCenter) {
            return n.dismiss();
          }
          return n;
        }).toList();

        emit(state.copyWith(
          status: AppStateStatus.success,
          notifications: updatedNotifications,
          message: 'All notifications cleared',
        ));
      },
      failure: (message, _) {
        developer.log(
          'Failed to clear all notifications: $message',
          name: 'NotificationCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: message,
        ));
      },
    );
  }

  /// Hide banner for a notification
  Future<void> hideBanner(String notificationId) async {
    final result = await _hideBanner.call(notificationId);

    result.when(
      success: (_) {
        final updatedNotifications = state.notifications.map((notification) {
          if (notification.id != notificationId) {
            return notification;
          }

          final metadata =
              Map<String, dynamic>.from(notification.metadata ?? {})
                ..['banner_hidden'] = true;

          return notification.copyWith(
            metadata: metadata.isEmpty ? null : metadata,
          );
        }).toList();

        emit(
          state.copyWith(
            notifications: updatedNotifications,
          ),
        );
      },
      failure: (message, _) {
        developer.log(
          'Failed to hide banner: $message',
          name: 'NotificationCubit',
        );
      },
    );
  }

  /// Refresh notifications (reload from repository)
  Future<void> refresh() async {
    await loadNotifications();
  }

  /// Add a notification produced by background automation.
  Future<void> addNotification(Notification notification) async {
    final result = await _addNotification.call(notification);

    result.when(
      success: (_) {
        final notifications = [...state.notifications];
        final existingIndex =
            notifications.indexWhere((item) => item.id == notification.id);

        if (existingIndex >= 0) {
          notifications[existingIndex] = notification;
        } else {
          notifications.insert(0, notification);
        }

        final unreadCount = notifications.where((n) => !n.isRead).length;

        emit(
          state.copyWith(
            notifications: notifications,
            unreadCount: unreadCount,
          ),
        );
      },
      failure: (message, error) {
        developer.log(
          'Failed to add notification: $message',
          name: 'NotificationCubit',
          error: error,
        );
      },
    );
  }
}
