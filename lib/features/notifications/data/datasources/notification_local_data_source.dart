import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../../../logic/services/dev_data_service.dart';
import '../../domain/entities/notification.dart';
import '../models/notification_model.dart';

/// Local persistence for notifications using SharedPreferences.
class NotificationLocalDataSource {
  NotificationLocalDataSource({required SharedPreferences sharedPreferences})
      : _sharedPreferences = sharedPreferences;

  static const _storageKey = 'notifications';

  final SharedPreferences _sharedPreferences;

  /// Load cached notifications from SharedPreferences.
  ///
  /// Returns mock notifications when cache is empty or corrupt to keep the UX
  /// consistent with the reference implementation.
  Future<List<NotificationModel>> loadNotifications() async {
    final stored = _sharedPreferences.getStringList(_storageKey);

    if (stored == null || stored.isEmpty) {
      return _generateMockNotifications();
    }

    try {
      final notifications = stored
          .map((value) => NotificationModel.fromJson(
                jsonDecode(value) as Map<String, dynamic>,
              ))
          .toList(growable: false);

      notifications.sort(
        (a, b) => b.timestamp.compareTo(a.timestamp),
      );

      return notifications;
    } on Object {
      // Corrupt cache – fall back to mock data
      return _generateMockNotifications();
    }
  }

  /// Store notifications in SharedPreferences.
  Future<void> saveNotifications(List<NotificationModel> notifications) async {
    final payload = notifications
        .map((notification) => jsonEncode(notification.toJson()))
        .toList(growable: false);

    final success =
        await _sharedPreferences.setStringList(_storageKey, payload);

    if (!success) {
      throw Exception('Failed to persist notifications locally');
    }
  }

  /// Retrieve mocked notifications for demo/offline flows.
  Future<List<NotificationModel>> loadMockNotifications() async =>
      _generateMockNotifications();

  List<NotificationModel> _generateMockNotifications() {
    final raw = DevDataService.getMockRecentActivity();
    final notifications = raw
        .map(
          (item) => NotificationModel(
            id: item['id'] as String,
            type: item['type'] as NotificationType,
            title: item['title'] as String,
            message: (item['message'] as String?) ?? '',
            isRead: (item['read'] as bool?) ?? false,
            timestamp: item['timestamp'] as DateTime,
            metadata: const <String, dynamic>{},
          ),
        )
        .toList(growable: false);

    notifications.sort(
      (a, b) => b.timestamp.compareTo(a.timestamp),
    );

    return notifications;
  }
}
