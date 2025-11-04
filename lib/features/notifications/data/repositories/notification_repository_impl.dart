import 'dart:developer' as developer;

import '../../../../core/result.dart';
import '../../domain/entities/notification.dart';
import '../../domain/repositories/notification_repository.dart';
import '../datasources/notification_local_data_source.dart';
import '../datasources/notification_remote_data_source.dart';
import '../models/notification_model.dart';

/// Implementation of NotificationRepository
class NotificationRepositoryImpl implements NotificationRepository {
  NotificationRepositoryImpl({
    required NotificationRemoteDataSource remoteDataSource,
    required NotificationLocalDataSource localDataSource,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource;

  final NotificationRemoteDataSource _remoteDataSource;
  final NotificationLocalDataSource _localDataSource;

  static const Duration _centerVisibilityWindow = Duration(days: 3);
  static const Duration _activityRetentionWindow = Duration(days: 14);

  @override
  Future<Result<List<Notification>>> getNotifications() async {
    final remoteResult = await _remoteDataSource.fetchNotifications();

    return remoteResult.when(
      success: (notifications) async {
        final enforced = _enforceNotificationRules(notifications);
        await _persistLocalNotifications(enforced.retained);
        return Success<List<Notification>>(
          List<Notification>.unmodifiable(enforced.retained),
        );
      },
      failure: (message, exception) async {
        developer.log(
          'Failed to fetch remote notifications: $message',
          name: 'NotificationRepositoryImpl',
          error: exception,
        );

        try {
          final local = await _localDataSource.loadNotifications();
          if (local.isNotEmpty) {
            return Success(List<Notification>.unmodifiable(local));
          }
        } catch (error, stackTrace) {
          developer.log(
            'Failed to load cached notifications: $error',
            name: 'NotificationRepositoryImpl',
            error: error,
            stackTrace: stackTrace,
          );
        }

        final mock = await _localDataSource.loadMockNotifications();
        return Success(List<Notification>.unmodifiable(mock));
      },
    );
  }

  @override
  Future<Result<List<Notification>>> getLocalNotifications() async {
    try {
      final notifications = await _localDataSource.loadNotifications();
      return Success(List<Notification>.unmodifiable(notifications));
    } catch (error, stackTrace) {
      developer.log(
        'Failed to load local notifications: $error',
        name: 'NotificationRepositoryImpl',
        error: error,
        stackTrace: stackTrace,
      );
      final exception = error is Exception ? error : Exception('$error');
      return Failure('Failed to load local notifications.', exception);
    }
  }

  @override
  Future<Result<List<Notification>>> getMockNotifications() async {
    try {
      final mock = await _localDataSource.loadMockNotifications();
      return Success(List<Notification>.unmodifiable(mock));
    } catch (error, stackTrace) {
      developer.log(
        'Failed to load mock notifications: $error',
        name: 'NotificationRepositoryImpl',
        error: error,
        stackTrace: stackTrace,
      );
      final exception = error is Exception ? error : Exception('$error');
      return Failure('Failed to load mock notifications.', exception);
    }
  }

  @override
  Future<void> saveLocalNotifications(List<Notification> notifications) async {
    try {
      final sorted = _sortNotifications(notifications);
      final models =
          sorted.map(NotificationModel.fromEntity).toList(growable: false);
      await _localDataSource.saveNotifications(models);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to persist notifications locally: $error',
        name: 'NotificationRepositoryImpl',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }

  @override
  Future<Result<Notification>> addNotification(
    Notification notification,
  ) async {
    try {
      final current = await _localDataSource.loadNotifications();

      final exists = current.any((n) => n.id == notification.id);
      if (exists) {
        return Success(notification);
      }

      final updated = [
        NotificationModel.fromEntity(notification),
        ...current,
      ];
      await _localDataSource.saveNotifications(updated);
      return Success(notification);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to add notification: $error',
        name: 'NotificationRepositoryImpl',
        error: error,
        stackTrace: stackTrace,
      );
      final exception = error is Exception ? error : Exception('$error');
      return Failure('Failed to add notification.', exception);
    }
  }

  @override
  Future<Result<void>> markAsReadRemote(String notificationId) async {
    return _remoteDataSource.markAsRead(notificationId);
  }

  @override
  Future<Result<void>> markAllAsReadRemote() async {
    return _remoteDataSource.markAllAsRead();
  }

  @override
  Future<Result<void>> updateNotificationStateRemote(
    Notification notification,
  ) async {
    return _remoteDataSource.updateNotificationState(
      notification: NotificationModel.fromEntity(notification),
    );
  }

  @override
  Future<Result<void>> bulkDismissRemote(List<String> notificationIds) async {
    return _remoteDataSource.bulkDismiss(notificationIds);
  }

  @override
  Future<Result<void>> deleteNotificationRemote(String notificationId) async {
    return _remoteDataSource.deleteNotification(notificationId);
  }

  // Helper methods

  ({List<Notification> retained, List<Notification> removed})
      _enforceNotificationRules(List<Notification> notifications) {
    final enforced = _applyCenterVisibilityRules(notifications);
    return _applyRetentionRules(enforced);
  }

  List<Notification> _applyCenterVisibilityRules(
    List<Notification> notifications,
  ) {
    final now = DateTime.now();
    final sorted = _sortNotifications(notifications);
    final updated = <Notification>[];

    for (final notification in sorted) {
      if (!notification.showInCenter) {
        updated.add(notification);
        continue;
      }

      final tooOld =
          now.difference(notification.timestamp) > _centerVisibilityWindow;

      if (tooOld && !notification.isDismissed) {
        updated.add(notification.dismiss());
      } else {
        updated.add(notification);
      }
    }

    return updated;
  }

  ({List<Notification> retained, List<Notification> removed})
      _applyRetentionRules(List<Notification> notifications) {
    final cutoffDate = DateTime.now().subtract(_activityRetentionWindow);
    final retained = <Notification>[];
    final removed = <Notification>[];

    for (final notification in notifications) {
      if (notification.timestamp.isBefore(cutoffDate)) {
        removed.add(notification);
      } else {
        retained.add(notification);
      }
    }

    return (retained: retained, removed: removed);
  }

  List<Notification> _sortNotifications(List<Notification> notifications) {
    final sorted = [...notifications]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return sorted;
  }

  Future<void> _persistLocalNotifications(
    List<Notification> notifications,
  ) async {
    try {
      final models = notifications
          .map(NotificationModel.fromEntity)
          .toList(growable: false);
      await _localDataSource.saveNotifications(models);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to persist notifications locally: $error',
        name: 'NotificationRepositoryImpl',
        error: error,
        stackTrace: stackTrace,
      );
    }
  }
}
