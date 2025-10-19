import 'package:flutter_test/flutter_test.dart';

import 'package:myorbit_calendar/domain/notification.dart' as app_notification;

void main() {
  group('Notification.fromJson', () {
    test('maps legacy invitation type to eventInvite', () {
      final notification = app_notification.Notification.fromJson({
        'id': 'notif-1',
        'type': 'invitation',
        'title': 'Legacy Invite',
        'message': 'You have been invited.',
        'is_read': false,
        'timestamp': DateTime.now().toIso8601String(),
      });

      expect(notification.type, app_notification.NotificationType.eventInvite);
    });

    test('maps legacy cancellation type to eventCancelled', () {
      final notification = app_notification.Notification.fromJson({
        'id': 'notif-2',
        'type': 'cancellation',
        'title': 'Event Cancelled',
        'message': 'Dinner is off.',
        'is_read': true,
        'timestamp': DateTime.now().toIso8601String(),
      });

      expect(
          notification.type, app_notification.NotificationType.eventCancelled);
    });
  });
}
