import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/notification.dart' as app_notification;
import 'package:myorbit_calendar/logic/providers/notification_providers.dart';
import 'package:myorbit_calendar/ui/screens/notifications_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/pump_app.dart';

class _MockNotificationList extends NotificationList {
  _MockNotificationList(this._notifications);

  final List<app_notification.Notification> _notifications;

  @override
  Future<List<app_notification.Notification>> build() async {
    return _notifications;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('NotificationsScreen', () {
    testWidgets('displays notifications and unread badge', (tester) async {
      final now = DateTime.now();
      final notifications = [
        app_notification.Notification(
          id: '1',
          type: app_notification.NotificationType.invitation,
          title: 'Invitation Accepted',
          message: 'Jordan accepted your invitation.',
          isRead: false,
          timestamp: now.subtract(const Duration(minutes: 5)),
          metadata: const {'contactName': 'Jordan'},
        ),
        app_notification.Notification(
          id: '2',
          type: app_notification.NotificationType.eventUpdate,
          title: 'Event Updated',
          message: 'Alex updated the dinner reservation.',
          isRead: true,
          timestamp: now.subtract(const Duration(hours: 1)),
          metadata: const {'eventTitle': 'Dinner'},
        ),
      ];

      await tester.pumpApp(
        const NotificationsScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _MockNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Invitation Accepted'), findsOneWidget);
      expect(find.text('Event Updated'), findsOneWidget);
      expect(find.text('1'), findsOneWidget); // unread badge

      final clearAllButton = find.widgetWithText(TextButton, 'Clear All');
      expect(clearAllButton, findsOneWidget);
      await tester.tap(clearAllButton);
    });
  });
}
