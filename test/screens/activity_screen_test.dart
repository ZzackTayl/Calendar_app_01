import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:myorbit_calendar/domain/notification.dart' as app_notification;
import 'package:myorbit_calendar/logic/providers/notification_providers.dart';
import 'package:myorbit_calendar/ui/screens/activity_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

class _InMemoryNotificationList extends NotificationList {
  _InMemoryNotificationList(List<app_notification.Notification> notifications)
      : _notifications = [...notifications];

  List<app_notification.Notification> _notifications;

  List<app_notification.Notification> _sorted(
    List<app_notification.Notification> source,
  ) {
    final sorted = [...source]
      ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return sorted;
  }

  void _setState(List<app_notification.Notification> next) {
    _notifications = _sorted(next);
    state = AsyncValue.data(List.unmodifiable(_notifications));
  }

  @override
  Future<List<app_notification.Notification>> build() async {
    _notifications = _sorted(_notifications);
    return List.unmodifiable(_notifications);
  }

  @override
  Future<void> addNotification(
    app_notification.Notification notification,
  ) async {
    _setState([..._notifications, notification]);
  }

  @override
  Future<void> deleteNotification(String notificationId) async {
    _setState(
      _notifications.where((n) => n.id != notificationId).toList(),
    );
  }

  @override
  Future<void> dismissNotification(String notificationId) async {
    _setState(
      _notifications
          .map(
            (n) => n.id == notificationId ? n.dismiss() : n,
          )
          .toList(),
    );
  }

  @override
  Future<void> restoreNotification(String notificationId) async {
    _setState(
      _notifications
          .map(
            (n) => n.id == notificationId ? n.restore() : n,
          )
          .toList(),
    );
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    _setState(
      _notifications
          .map((n) => n.id == notificationId ? n.markAsRead() : n)
          .toList(),
    );
  }

  @override
  Future<void> markAllAsRead() async {
    _setState(_notifications.map((n) => n.markAsRead()).toList());
  }

  @override
  Future<void> clearAll() async {
    _setState(_notifications.map((n) => n.dismiss()).toList());
  }
}

app_notification.Notification _buildNotification({
  required String id,
  required String title,
  required String message,
  required DateTime timestamp,
  app_notification.NotificationType type =
      app_notification.NotificationType.invitation,
  bool isRead = false,
  bool isDismissed = false,
  bool showInCenter = true,
}) {
  return app_notification.Notification(
    id: id,
    type: type,
    title: title,
    message: message,
    isRead: isRead,
    timestamp: timestamp,
    isDismissed: isDismissed,
    showInCenter: showInCenter,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ActivityScreen', () {
    late DateTime now;

    setUp(() {
      now = DateTime.now();
    });

    testWidgets('renders header and notifications list', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      final notifications = [
        _buildNotification(
          id: '1',
          title: 'Invitation Accepted',
          message: 'Jordan accepted your invitation!',
          timestamp: now.subtract(const Duration(hours: 2)),
        ),
        _buildNotification(
          id: '2',
          title: 'Event Updated',
          message: 'Alex updated Dinner Date details.',
          timestamp: now.subtract(const Duration(days: 1)),
          type: app_notification.NotificationType.eventUpdate,
        ),
      ];

      await tester.pumpApp(
        const ActivityScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _InMemoryNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Activity Overview'), findsOneWidget);
      expect(
        find.text('Your complete history of notifications and shared updates'),
        findsOneWidget,
      );
      expect(find.text('Invitation Accepted'), findsOneWidget);
      expect(find.text('Event Updated'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows empty state when no notifications are present',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const ActivityScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _InMemoryNotificationList(const []),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('All caught up!'), findsOneWidget);
      expect(find.text('New activity from the past week will appear here.'),
          findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows overview-only badge when notification skips center',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      final notifications = [
        _buildNotification(
          id: 'overview_only',
          title: 'Availability withdrawn',
          message:
              'Alex withdrew a shared availability block. Review changes.',
          timestamp: now.subtract(const Duration(hours: 5)),
          type: app_notification.NotificationType.cancellation,
          showInCenter: false,
        ),
      ];

      await tester.pumpApp(
        const ActivityScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _InMemoryNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Overview only'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('deleting an activity removes it and undo restores it',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      await tester.binding.setSurfaceSize(const Size(800, 1400));

      final notifications = [
        _buildNotification(
          id: '1',
          title: 'Reminder',
          message: 'Coffee with Sam starts in 1 hour.',
          timestamp: now.subtract(const Duration(hours: 3)),
          type: app_notification.NotificationType.reminder,
        ),
      ];

      await tester.pumpApp(
        const ActivityScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _InMemoryNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Reminder'), findsOneWidget);

      final deleteButton = find.byTooltip('Delete from activity history');
      expect(deleteButton, findsOneWidget);
      await tester.tap(deleteButton);
      await tester.pump();

      expect(find.text('Reminder'), findsNothing);
      expect(find.textContaining('Activity removed'), findsOneWidget);

      final container = ProviderScope.containerOf(
        tester.element(find.byType(ActivityScreen)),
        listen: false,
      );
      await container
          .read(notificationListProvider.notifier)
          .addNotification(notifications.first);
      await tester.pumpAndSettle();

      expect(find.text('Reminder'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('older section toggles visibility', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      final notifications = [
        _buildNotification(
          id: '1',
          title: 'Today Item',
          message: 'Something happened today.',
          timestamp: now,
        ),
        _buildNotification(
          id: '2',
          title: 'Earlier Item',
          message: 'Something earlier this week.',
          timestamp: now.subtract(const Duration(days: 2)),
        ),
      ];

      await tester.pumpApp(
        const ActivityScreen(),
        overrides: [
          notificationListProvider.overrideWith(
            () => _InMemoryNotificationList(notifications),
          ),
        ],
      );

      await tester.pumpAndSettle();

      final toggle = find.text('Earlier This Week');
      expect(toggle, findsOneWidget);

      await tester.tap(toggle);
      await tester.pumpAndSettle();

      expect(find.text('Earlier Item'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}
