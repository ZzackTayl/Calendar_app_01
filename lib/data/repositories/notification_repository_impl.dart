import 'dart:async';
import 'dart:developer' as developer;
import 'dart:io';

import '../../core/firebase_app_services.dart';
import '../../core/result.dart';
import '../../domain/notification.dart';
import '../../domain/repositories/notification_repository.dart';
import '../datasources/local/notification_local_data_source.dart';
import '../datasources/remote/notification_remote_data_source.dart';

class NotificationRepositoryImpl implements NotificationRepository {
  NotificationRepositoryImpl({
    required NotificationRemoteDataSource remoteDataSource,
    required NotificationLocalDataSource localDataSource,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource;

  final NotificationRemoteDataSource _remoteDataSource;
  final NotificationLocalDataSource _localDataSource;

  bool get _remoteAvailable =>
      FirebaseAppServices.isConfigured && FirebaseAppServices.isAuthenticated;

  @override
  Future<Result<List<Notification>>> getNotifications() async {
    developer.log('Fetching notifications', name: 'NotificationRepositoryImpl');

    if (!_remoteAvailable) {
      return await _loadLocalOrMock();
    }

    try {
      final remote = await _remoteDataSource.getNotifications();
      if (remote.isNotEmpty) {
        _saveToLocalInBackground(remote);
        return Success(remote);
      }
      return await _loadLocalOrMock();
    } on SocketException catch (e) {
      developer.log('Network error fetching notifications: $e', name: 'NotificationRepositoryImpl');
      return await _loadLocalOrMock();
    } catch (e, stack) {
      developer.log('Unexpected error fetching notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<List<Notification>>> getLocalNotifications() async {
    try {
      final local = await _localDataSource.getLocalNotifications();
      return Success(local);
    } catch (e, stack) {
      developer.log('Error loading local notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<List<Notification>>> getMockNotifications() async {
    try {
      final mock = await _localDataSource.getMockNotifications();
      return Success(mock);
    } catch (e, stack) {
      developer.log('Error generating mock notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<void>> markAsReadRemote(String notificationId) async {
    if (!_remoteAvailable) {
      return const Failure('Cannot mark as read: Not authenticated');
    }

    try {
      await _remoteDataSource.markAsRead(notificationId);
      return const Success(null);
    } catch (e, stack) {
      developer.log('Error marking notification as read: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<void>> markAllAsReadRemote() async {
    if (!_remoteAvailable) {
      return const Failure('Cannot mark notifications as read: Not authenticated');
    }

    try {
      await _remoteDataSource.markAllAsRead();
      return const Success(null);
    } catch (e, stack) {
      developer.log('Error marking notifications as read: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<Notification>> updateNotificationStateRemote(Notification notification) async {
    if (!_remoteAvailable) {
      return const Failure('Cannot update notification: Not authenticated');
    }

    try {
      await _remoteDataSource.updateNotificationState(notification);
      return Success(notification);
    } catch (e, stack) {
      developer.log('Error updating notification state: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<void>> bulkDismissRemote(List<String> notificationIds) async {
    if (notificationIds.isEmpty) {
      return const Success(null);
    }
    if (!_remoteAvailable) {
      return const Failure('Cannot dismiss notifications: Not authenticated');
    }

    try {
      await _remoteDataSource.bulkDismiss(notificationIds);
      return const Success(null);
    } catch (e, stack) {
      developer.log('Error bulk dismissing notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<void>> deleteNotificationRemote(String notificationId) async {
    if (!_remoteAvailable) {
      return const Failure('Cannot delete notification: Not authenticated');
    }

    try {
      await _remoteDataSource.deleteNotification(notificationId);
      return const Success(null);
    } catch (e, stack) {
      developer.log('Error deleting notification: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  @override
  Future<Result<void>> saveLocalNotifications(List<Notification> notifications) async {
    try {
      await _localDataSource.saveLocalNotifications(notifications);
      return const Success(null);
    } catch (e, stack) {
      developer.log('Error saving local notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  Future<Result<List<Notification>>> _loadLocalOrMock() async {
    try {
      final local = await _localDataSource.getLocalNotifications();
      if (local.isNotEmpty) {
        return Success(local);
      }
      final mock = await _localDataSource.getMockNotifications();
      return Success(mock);
    } catch (e, stack) {
      developer.log('Error loading local/mock notifications: $e', name: 'NotificationRepositoryImpl', error: e, stackTrace: stack);
      return Failure(_messageForError(e), e is Exception ? e : null);
    }
  }

  void _saveToLocalInBackground(List<Notification> notifications) {
    _localDataSource.saveLocalNotifications(notifications).then((_) {
      developer.log('Persisted notifications to local cache', name: 'NotificationRepositoryImpl');
    }).catchError((error, stack) {
      developer.log('Failed to persist notifications locally: $error', name: 'NotificationRepositoryImpl', error: error, stackTrace: stack);
    });
  }

  String _messageForError(Object error) {
    if (error is SocketException) {
      return 'Unable to connect. Please check your internet connection.';
    }
    if (error is TimeoutException) {
      return 'Request timed out. Please try again.';
    }
    return 'Failed to load notifications.';
  }
}
