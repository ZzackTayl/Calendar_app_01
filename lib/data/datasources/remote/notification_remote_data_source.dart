import 'dart:developer' as developer;

import '../../../domain/notification.dart';
import '../../../logic/services/api_service.dart';

/// Remote data source for notifications backed by Firestore.
///
/// Methods throw exceptions to allow repositories to decide how to handle them.
class NotificationRemoteDataSource {
  Future<List<Notification>> getNotifications() async {
    developer.log('Fetching notifications from remote', name: 'NotificationRemoteDataSource');

    final result = await NotificationApi.getNotifications();
    return result.when(
      success: (notifications) {
        developer.log('Fetched ${notifications.length} notifications', name: 'NotificationRemoteDataSource');
        return notifications;
      },
      failure: (message, exception) {
        developer.log('Failed to fetch notifications: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }

  Future<void> markAsRead(String id) async {
    developer.log('Marking notification as read: $id', name: 'NotificationRemoteDataSource');
    final result = await NotificationApi.markAsRead(id);
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log('Failed to mark notification as read: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }

  Future<void> markAllAsRead() async {
    developer.log('Marking all notifications as read', name: 'NotificationRemoteDataSource');
    final result = await NotificationApi.markAllAsRead();
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log('Failed to mark all notifications as read: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }

  Future<void> updateNotificationState(Notification notification) async {
    developer.log('Updating notification state: ${notification.id}', name: 'NotificationRemoteDataSource');
    final result = await NotificationApi.updateNotificationState(
      notification.id,
      metadata: notification.metadata,
      isDismissed: notification.isDismissed,
      showInCenter: notification.showInCenter,
    );
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log('Failed to update notification state: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }

  Future<void> bulkDismiss(List<String> ids) async {
    developer.log('Bulk dismissing ${ids.length} notifications', name: 'NotificationRemoteDataSource');
    final result = await NotificationApi.bulkDismissNotifications(ids);
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log('Failed to bulk dismiss notifications: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }

  Future<void> deleteNotification(String id) async {
    developer.log('Deleting notification: $id', name: 'NotificationRemoteDataSource');
    final result = await NotificationApi.deleteNotification(id);
    result.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log('Failed to delete notification: $message', name: 'NotificationRemoteDataSource', error: exception);
        if (exception != null) throw exception;
        throw Exception(message);
      },
    );
  }
}
