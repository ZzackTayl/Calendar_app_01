import '../../../../core/result.dart';
import '../../../../logic/services/api_service.dart';
import '../models/notification_model.dart';

/// Remote data source backed by Supabase notifications tables.
class NotificationRemoteDataSource {
  Future<Result<List<NotificationModel>>> fetchNotifications() async {
    final result = await NotificationApi.getNotifications();

    return result.when(
      success: (items) => Success(
        items.map(NotificationModel.fromEntity).toList(growable: false),
      ),
      failure: (message, exception) => Failure(message, exception),
    );
  }

  Future<Result<void>> markAsRead(String id) => NotificationApi.markAsRead(id);

  Future<Result<void>> markAllAsRead() => NotificationApi.markAllAsRead();

  Future<Result<void>> updateNotificationState({
    required NotificationModel notification,
  }) {
    return NotificationApi.updateNotificationState(
      notification.id,
      metadata: notification.metadata,
      isDismissed: notification.isDismissed,
      showInCenter: notification.showInCenter,
    );
  }

  Future<Result<void>> bulkDismiss(List<String> ids) =>
      NotificationApi.bulkDismissNotifications(ids);

  Future<Result<void>> deleteNotification(String id) =>
      NotificationApi.deleteNotification(id);
}
