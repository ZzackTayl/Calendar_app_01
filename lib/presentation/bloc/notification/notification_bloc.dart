import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/use_cases/notifications/notifications_use_cases.dart';
import 'notification_event.dart';
import 'notification_state.dart';

/// Business logic component for notification management
///
/// This BLoC handles all notification-related operations and state management,
/// following the BLoC pattern with clear separation of concerns. It coordinates
/// between the UI layer and domain layer, managing state transitions and
/// applying business rules.
///
/// Key responsibilities:
/// - Loading and refreshing notifications via use cases
/// - Managing notification state (read, dismissed, deleted)
/// - Computing derived values (unread count, center visibility)
/// - Applying retention rules before emitting loaded states
/// - Handling optimistic updates for better UX
/// - Managing error states with recovery options
///
/// This implementation uses the use case pattern for better testability
/// and separation of business logic. All operations are delegated to
/// specialized use cases.
///
/// Injected use cases:
/// - GetNotificationsUseCase
/// - MarkNotificationAsReadUseCase
/// - MarkAllAsReadUseCase
/// - DismissNotificationUseCase
/// - DismissAllNotificationsUseCase
/// - RestoreNotificationUseCase
/// - HideBannerUseCase
/// - DeleteNotificationUseCase
/// - AddNotificationUseCase
/// - ApplyRetentionRulesUseCase
class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  final GetNotificationsUseCase _getNotificationsUseCase;
  final MarkNotificationAsReadUseCase _markAsReadUseCase;
  final MarkAllAsReadUseCase _markAllAsReadUseCase;
  final DismissNotificationUseCase _dismissUseCase;
  final DismissAllNotificationsUseCase _dismissAllUseCase;
  final RestoreNotificationUseCase _restoreUseCase;
  final HideBannerUseCase _hideBannerUseCase;
  final DeleteNotificationUseCase _deleteUseCase;
  final AddNotificationUseCase _addUseCase;
  final ApplyRetentionRulesUseCase _applyRetentionUseCase;

  NotificationBloc({
    required GetNotificationsUseCase getNotificationsUseCase,
    required MarkNotificationAsReadUseCase markAsReadUseCase,
    required MarkAllAsReadUseCase markAllAsReadUseCase,
    required DismissNotificationUseCase dismissUseCase,
    required DismissAllNotificationsUseCase dismissAllUseCase,
    required RestoreNotificationUseCase restoreUseCase,
    required HideBannerUseCase hideBannerUseCase,
    required DeleteNotificationUseCase deleteUseCase,
    required AddNotificationUseCase addUseCase,
    required ApplyRetentionRulesUseCase applyRetentionUseCase,
  })  : _getNotificationsUseCase = getNotificationsUseCase,
        _markAsReadUseCase = markAsReadUseCase,
        _markAllAsReadUseCase = markAllAsReadUseCase,
        _dismissUseCase = dismissUseCase,
        _dismissAllUseCase = dismissAllUseCase,
        _restoreUseCase = restoreUseCase,
        _hideBannerUseCase = hideBannerUseCase,
        _deleteUseCase = deleteUseCase,
        _addUseCase = addUseCase,
        _applyRetentionUseCase = applyRetentionUseCase,
        super(const NotificationInitial()) {
    on<LoadNotifications>(_onLoadNotifications);
    on<RefreshNotifications>(_onRefreshNotifications);
    on<AddNotification>(_onAddNotification);
    on<MarkNotificationAsRead>(_onMarkAsRead);
    on<MarkAllNotificationsAsRead>(_onMarkAllAsRead);
    on<DismissNotification>(_onDismiss);
    on<DismissAllNotifications>(_onDismissAll);
    on<RestoreNotification>(_onRestore);
    on<HideNotificationBanner>(_onHideBanner);
    on<DeleteNotification>(_onDelete);
    on<ClearNotificationError>(_onClearError);
  }

  /// Handles loading notifications from the use case
  ///
  /// Flow:
  /// 1. Emit loading state
  /// 2. Fetch notifications via GetNotificationsUseCase
  /// 3. Apply retention rules via ApplyRetentionRulesUseCase
  /// 4. Compute derived state (centerVisible, unreadCount)
  /// 5. Emit loaded state with all data
  Future<void> _onLoadNotifications(
    LoadNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      emit(const NotificationLoading());

      final result = await _getNotificationsUseCase.call();

      result.when(
        success: (notifications) async {
          developer.log(
            'Bloc: Loaded ${notifications.length} notifications',
            name: 'NotificationBloc',
          );

          // Apply retention rules via use case
          await _applyRetentionUseCase.call();

          // Get notifications again after applying retention rules
          final updatedResult = await _getNotificationsUseCase.call();

          updatedResult.when(
            success: (processedNotifications) {
              emit(NotificationLoaded.fromNotifications(processedNotifications));
            },
            failure: (message, exception) {
              // Fallback to original notifications if retention application fails
              emit(NotificationLoaded.fromNotifications(notifications));
            },
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to load notifications: $message',
            name: 'NotificationBloc',
          );
          emit(NotificationError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error loading notifications: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const NotificationError(
        message: 'An unexpected error occurred while loading notifications',
      ));
    }
  }

  /// Handles refreshing notifications while preserving current state
  ///
  /// Similar to load but shows refreshing state with current data,
  /// providing better UX during refresh operations.
  Future<void> _onRefreshNotifications(
    RefreshNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      // If we have current notifications, show refreshing state
      if (state is NotificationLoaded) {
        emit(NotificationRefreshing(
          (state as NotificationLoaded).notifications,
        ));
      } else {
        emit(const NotificationLoading());
      }

      final result = await _getNotificationsUseCase.call();

      result.when(
        success: (notifications) async {
          developer.log(
            'Bloc: Refreshed ${notifications.length} notifications',
            name: 'NotificationBloc',
          );

          // Apply retention rules via use case
          await _applyRetentionUseCase.call();

          // Get notifications again after applying retention rules
          final updatedResult = await _getNotificationsUseCase.call();

          updatedResult.when(
            success: (processedNotifications) {
              emit(NotificationLoaded.fromNotifications(processedNotifications));
            },
            failure: (message, exception) {
              // Fallback to original notifications if retention application fails
              emit(NotificationLoaded.fromNotifications(notifications));
            },
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to refresh notifications: $message',
            name: 'NotificationBloc',
          );
          emit(NotificationError(message: message));
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Unexpected error refreshing notifications: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
      emit(const NotificationError(
        message: 'An unexpected error occurred while refreshing notifications',
      ));
    }
  }

  /// Handles adding a new notification to the system
  ///
  /// Uses AddNotificationUseCase which handles deduplication logic
  /// to prevent duplicate notifications from being created.
  Future<void> _onAddNotification(
    AddNotification event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      // Add notification via use case (handles deduplication internally)
      final result = await _addUseCase.call(event.notification);

      result.when(
        success: (_) async {
          developer.log(
            'Bloc: Added notification ${event.notification.id}',
            name: 'NotificationBloc',
          );

          // Get updated notifications after adding
          final updatedResult = await _getNotificationsUseCase.call();

          updatedResult.when(
            success: (notifications) {
              emit(NotificationLoaded.fromNotifications(notifications));
            },
            failure: (message, exception) {
              developer.log(
                'Bloc: Failed to load updated notifications after add: $message',
                name: 'NotificationBloc',
              );
              // Don't emit error, just log it
            },
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to add notification: $message',
            name: 'NotificationBloc',
          );
          // Don't emit error for add failures (likely duplicate), just log them
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error adding notification: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
      // Don't emit error for add failures, just log them
    }
  }

  /// Handles marking a single notification as read
  ///
  /// Uses optimistic update pattern:
  /// 1. Update local state immediately via UI
  /// 2. Use case handles sync with remote and local storage
  Future<void> _onMarkAsRead(
    MarkNotificationAsRead event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Update local state optimistically for immediate UI feedback
      final updatedNotifications = notifications.map((n) {
        return n.id == event.notificationId ? n.markAsRead() : n;
      }).toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Marked notification ${event.notificationId} as read',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles remote and local storage)
      final result = await _markAsReadUseCase.call(event.notificationId);

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced read state',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync read state: $message',
            name: 'NotificationBloc',
          );
          // Keep local change even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error marking notification as read: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles marking all notifications as read
  ///
  /// Uses optimistic update with MarkAllAsReadUseCase
  Future<void> _onMarkAllAsRead(
    MarkAllNotificationsAsRead event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Update all notifications to read optimistically
      final updatedNotifications = notifications.map((n) => n.markAsRead()).toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Marked all notifications as read',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles remote and local storage)
      final result = await _markAllAsReadUseCase.call();

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced all read states',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync all read states: $message',
            name: 'NotificationBloc',
          );
          // Keep local changes even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error marking all notifications as read: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles dismissing a single notification
  ///
  /// Dismissing hides the notification from the center but keeps
  /// it in history. Can be reversed with restore.
  ///
  /// Uses DismissNotificationUseCase
  Future<void> _onDismiss(
    DismissNotification event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Update local state optimistically for immediate UI feedback
      final updatedNotifications = notifications.map((n) {
        return n.id == event.notificationId ? n.dismiss() : n;
      }).toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Dismissed notification ${event.notificationId}',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles remote and local storage)
      final result = await _dismissUseCase.call(event.notificationId);

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced dismiss',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync dismiss: $message',
            name: 'NotificationBloc',
          );
          // Keep local change even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error dismissing notification: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles dismissing all notifications
  ///
  /// Uses DismissAllNotificationsUseCase
  Future<void> _onDismissAll(
    DismissAllNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Dismiss all notifications that are shown in center (optimistic update)
      final updatedNotifications = notifications.map((n) {
        return n.showInCenter ? n.dismiss() : n;
      }).toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Dismissed all notifications',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles bulk remote and local storage)
      final result = await _dismissAllUseCase.call();

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced bulk dismiss',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync bulk dismiss: $message',
            name: 'NotificationBloc',
          );
          // Keep local changes even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error dismissing all notifications: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles restoring a dismissed notification
  ///
  /// Uses RestoreNotificationUseCase
  Future<void> _onRestore(
    RestoreNotification event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Update local state optimistically for immediate UI feedback
      final updatedNotifications = notifications.map((n) {
        return n.id == event.notificationId ? n.restore() : n;
      }).toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Restored notification ${event.notificationId}',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles remote and local storage)
      final result = await _restoreUseCase.call(event.notificationId);

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced restore',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync restore: $message',
            name: 'NotificationBloc',
          );
          // Keep local change even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error restoring notification: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles hiding a notification banner
  ///
  /// This operation updates the notification's metadata to mark
  /// the banner as hidden, which persists to storage.
  ///
  /// Uses HideNotificationBannerUseCase
  Future<void> _onHideBanner(
    HideNotificationBanner event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      developer.log(
        'Bloc: Hide banner for notification ${event.notificationId}',
        name: 'NotificationBloc',
      );

      // Hide banner via use case (updates metadata and syncs)
      final result = await _hideBannerUseCase.call(event.notificationId);

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully hid banner',
            name: 'NotificationBloc',
          );

          // Reload notifications to reflect metadata change
          if (state is NotificationLoaded) {
            _getNotificationsUseCase.call().then((updatedResult) {
              updatedResult.when(
                success: (notifications) {
                  if (!emit.isDone) {
                    emit(NotificationLoaded.fromNotifications(notifications));
                  }
                },
                failure: (message, exception) {
                  // Log but don't emit error for banner hide refresh failure
                  developer.log(
                    'Bloc: Failed to reload after banner hide: $message',
                    name: 'NotificationBloc',
                  );
                },
              );
            });
          }
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to hide banner: $message',
            name: 'NotificationBloc',
          );
          // Don't emit error state for banner hide failures
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error hiding banner: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles permanently deleting a notification
  ///
  /// This is a hard delete that removes the notification from both
  /// the notification center and history.
  ///
  /// Uses DeleteNotificationUseCase
  Future<void> _onDelete(
    DeleteNotification event,
    Emitter<NotificationState> emit,
  ) async {
    if (state is! NotificationLoaded) return;

    try {
      final currentState = state as NotificationLoaded;
      final notifications = currentState.notifications;

      // Remove from local state optimistically for immediate UI feedback
      final updatedNotifications = notifications
          .where((n) => n.id != event.notificationId)
          .toList();

      emit(currentState.copyWith(notifications: updatedNotifications));

      developer.log(
        'Bloc: Deleted notification ${event.notificationId}',
        name: 'NotificationBloc',
      );

      // Sync via use case (handles remote and local storage)
      final result = await _deleteUseCase.call(event.notificationId);

      result.when(
        success: (_) {
          developer.log(
            'Bloc: Successfully synced delete',
            name: 'NotificationBloc',
          );
        },
        failure: (message, exception) {
          developer.log(
            'Bloc: Failed to sync delete: $message',
            name: 'NotificationBloc',
          );
          // Keep local change even if sync fails (optimistic update)
        },
      );
    } catch (e, stackTrace) {
      developer.log(
        'Bloc: Error deleting notification: $e',
        name: 'NotificationBloc',
        error: e,
        stackTrace: stackTrace,
      );
    }
  }

  /// Handles clearing error states
  ///
  /// Attempts to restore the previous valid state if available,
  /// otherwise returns to initial state.
  void _onClearError(
    ClearNotificationError event,
    Emitter<NotificationState> emit,
  ) {
    if (state is NotificationError) {
      final errorState = state as NotificationError;
      if (errorState.previousNotifications != null) {
        emit(NotificationLoaded.fromNotifications(
          errorState.previousNotifications!,
        ));
      } else {
        emit(const NotificationInitial());
      }
    }
  }
}
