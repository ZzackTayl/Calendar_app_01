import 'dart:convert';
import 'dart:developer' as developer;

import 'package:dartz/dartz.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/error/failures.dart';
import '../../../../core/utils/either_extensions.dart';
import '../../../../domain/notification.dart';
import '../../../../logic/services/dev_data_service.dart';
import '../../domain/repositories/notification_repository.dart';

/// Implementation of NotificationRepository
class NotificationRepositoryImpl with EitherMixin implements NotificationRepository {
  static const String _storageKey = 'notifications';
  static const Duration _centerVisibilityWindow = Duration(days: 3);
  static const Duration _activityRetentionWindow = Duration(days: 14);

  @override
  Future<Either<Failure, List<Notification>>> getNotifications() async {
    try {
      final notifications = await _loadLocalNotifications();
      final result = _enforceNotificationRules(notifications);
      await _persistLocalBackup(result.retained);
      return Right(result.retained);
    } catch (e, stackTrace) {
      developer.log(
        'Failed to get notifications',
        error: e,
        stackTrace: stackTrace,
        name: 'NotificationRepository',
      );
      return Left(Failure(message: 'Failed to load notifications: $e'));
    }
  }

  @override
  Future<Either<Failure, Notification>> addNotification(
    Notification notification,
  ) async {
    try {
      final current = await _loadLocalNotifications();
      
      // Check for duplicates
      final exists = current.any((n) => n.id == notification.id);
      if (exists) {
        return Right(notification);
      }

      final updated = [notification, ...current];
      await _saveNotifications(updated);
      return Right(notification);
    } catch (e) {
      return Left(Failure(message: 'Failed to add notification: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> markAsRead(String notificationId) async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current
          .map((n) => n.id == notificationId ? n.markAsRead() : n)
          .toList();
      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to mark as read: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> markAllAsRead() async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.map((n) => n.markAsRead()).toList();
      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to mark all as read: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> dismissNotification(String notificationId) async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.map((n) {
        if (n.id != notificationId) return n;
        
        final metadata = Map<String, dynamic>.from(n.metadata ?? {})
          ..['dismissed'] = true;
        
        return n.copyWith(isDismissed: true, metadata: metadata);
      }).toList();

      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to dismiss notification: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> restoreNotification(String notificationId) async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.map((n) {
        if (n.id != notificationId) return n;
        
        final metadata = Map<String, dynamic>.from(n.metadata ?? {});
        metadata.remove('dismissed');
        metadata.remove('banner_hidden');
        
        return n.copyWith(
          isDismissed: false,
          metadata: metadata.isEmpty ? null : metadata,
        );
      }).toList();

      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to restore notification: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> deleteNotification(String notificationId) async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.where((n) => n.id != notificationId).toList();
      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to delete notification: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> clearAll() async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.map((n) {
        if (!n.showInCenter) return n;
        return n.dismiss();
      }).toList();

      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to clear all: $e'));
    }
  }

  @override
  Future<Either<Failure, void>> hideBanner(String notificationId) async {
    try {
      final current = await _loadLocalNotifications();
      final updated = current.map((n) {
        if (n.id != notificationId) return n;
        
        final metadata = Map<String, dynamic>.from(n.metadata ?? {});
        metadata['banner_hidden'] = true;
        
        return n.copyWith(metadata: metadata);
      }).toList();

      await _saveNotifications(updated);
      return const Right(null);
    } catch (e) {
      return Left(Failure(message: 'Failed to hide banner: $e'));
    }
  }

  // Helper methods

  Future<List<Notification>> _loadLocalNotifications() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = prefs.getStringList(_storageKey) ?? [];

      if (jsonList.isEmpty) {
        return _getMockNotifications();
      }

      final notifications = jsonList
          .map((json) => Notification.fromJson(jsonDecode(json)))
          .toList();

      notifications.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      return notifications;
    } catch (e) {
      return _getMockNotifications();
    }
  }

  Future<void> _saveNotifications(List<Notification> notifications) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final jsonList = notifications
          .map((n) => jsonEncode(n.toJson()))
          .toList();
      await prefs.setStringList(_storageKey, jsonList);
    } catch (e) {
      developer.log(
        'Failed to save notifications',
        error: e,
        name: 'NotificationRepository',
      );
    }
  }

  Future<void> _persistLocalBackup(List<Notification> notifications) async {
    try {
      await _saveNotifications(notifications);
    } catch (_) {
      // Ignore local persistence errors
    }
  }

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

  List<Notification> _getMockNotifications() {
    final raw = DevDataService.getMockRecentActivity();
    return raw
        .map(
          (m) => Notification(
            id: m['id'] as String,
            type: m['type'] as NotificationType,
            title: m['title'] as String,
            message: (m['message'] as String?) ?? '',
            isRead: (m['read'] as bool?) ?? false,
            timestamp: m['timestamp'] as DateTime,
            metadata: const <String, dynamic>{},
          ),
        )
        .toList();
  }
}
