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
      await tester.pumpAndSettle();

      expect(find.text('No notifications yet'), findsOneWidget);
    });

    testWidgets('dismiss button hides notification without deleting others',
        (tester) async {
      final now = DateTime.now();
      final notifications = [
        app_notification.Notification(
          id: '1',
          type: app_notification.NotificationType.invitation,
          title: 'Invitation Accepted',
          message: 'Jordan accepted your invitation.',
          isRead: false,
          timestamp: now.subtract(const Duration(minutes: 5)),
        ),
        app_notification.Notification(
          id: '2',
          type: app_notification.NotificationType.eventUpdate,
          title: 'Event Updated',
          message: 'Alex updated the dinner reservation.',
          isRead: true,
          timestamp: now.subtract(const Duration(hours: 1)),
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

      final dismissButtons = find.byTooltip('Dismiss notification');
      expect(dismissButtons, findsNWidgets(2));

      await tester.tap(dismissButtons.first);
      await tester.pump();

      expect(find.text('Invitation Accepted'), findsNothing);
      expect(find.text('Event Updated'), findsOneWidget);
      expect(find.textContaining('dismissed'), findsOneWidget);
    });

    testWidgets('limits to 12 notifications with overflow in accordion',
        (tester) async {
      final now = DateTime.now();
      final notifications = List.generate(13, (index) {
        return app_notification.Notification(
          id: 'notif-$index',
          type: app_notification.NotificationType.invitation,
          title: 'Notification $index',
          message: 'Message $index',
          isRead: false,
          timestamp: now.subtract(Duration(hours: index)),
        );
      });

      await tester.pumpApp(
        const NotificationsScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _MockNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      // Latest six should be visible immediately.
      for (var i = 0; i < 6; i++) {
        final finder = find.text('Notification $i');
        await tester.scrollUntilVisible(finder, 200);
        expect(finder, findsOneWidget);
      }

      // Six older notifications should be tucked away.
      final accordionHeader = find.text('Earlier Notifications');
      expect(accordionHeader, findsOneWidget);
      await tester.tap(accordionHeader);
      await tester.pumpAndSettle();

      for (var i = 6; i < 12; i++) {
        final finder = find.text('Notification $i');
        await tester.scrollUntilVisible(finder, 200);
        expect(finder, findsOneWidget);
      }

      // The 13th notification should be trimmed from the notification center.
      expect(find.text('Notification 12'), findsNothing);
    });
  });
}
