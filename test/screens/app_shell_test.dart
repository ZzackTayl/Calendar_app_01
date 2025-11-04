import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/features/notifications/domain/entities/notification.dart'
    as domain_notification;
import 'package:myorbit_calendar/features/notifications/domain/repositories/notification_repository.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/add_notification_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/delete_notification_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/dismiss_all_notifications_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/dismiss_notification_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/get_notifications_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/hide_banner_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/mark_all_as_read_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/mark_notification_as_read_use_case.dart';
import 'package:myorbit_calendar/features/notifications/domain/usecases/restore_notification_use_case.dart';
import 'package:myorbit_calendar/features/notifications/presentation/cubit/notification_cubit.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/features/my_orbit/presentation/pages/dashboard_page.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('AppShell', () {
    late NotificationCubit notificationCubit;

    setUp(() async {
      final repository = _TestNotificationRepository([
        domain_notification.Notification(
          id: 'test-notification',
          type: domain_notification.NotificationType.eventReminder,
          title: 'Upcoming Event',
          message: 'Event starts soon',
          isRead: false,
          timestamp: DateTime.now(),
          metadata: const {'event_id': 'event-1'},
        ),
      ]);

      notificationCubit = NotificationCubit(
        getNotifications: GetNotificationsUseCase(repository),
        markAsRead: MarkNotificationAsReadUseCase(repository),
        markAllAsRead: MarkAllAsReadUseCase(repository),
        dismissNotification: DismissNotificationUseCase(repository),
        restoreNotification: RestoreNotificationUseCase(repository),
        deleteNotification: DeleteNotificationUseCase(repository),
        dismissAll: DismissAllNotificationsUseCase(repository),
        hideBanner: HideBannerUseCase(repository),
        addNotification: AddNotificationUseCase(repository),
      );

      await notificationCubit.loadNotifications();
    });

    tearDown(() {
      notificationCubit.close();
    });

    testWidgets(
        'GIVEN app shell WHEN rendered THEN displays bottom navigation bar',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(NavigationBar), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN app shell WHEN rendered THEN has 4 navigation destinations',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(NavigationDestination), findsNWidgets(4));

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN app shell WHEN rendered THEN displays correct navigation labels',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Use keys to find navigation items to avoid ambiguity
      expect(find.byKey(const Key('nav_home')), findsOneWidget);
      expect(find.byKey(const Key('nav_calendar')), findsOneWidget);
      expect(find.byKey(const Key('nav_activity')), findsOneWidget);
      expect(find.byKey(const Key('nav_people')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN app shell WHEN rendered THEN displays navigation icons',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Navigation bar should contain icons
      expect(find.byType(Icon), findsWidgets);
      // Should have at least 4 navigation items
      expect(find.byType(NavigationDestination), findsNWidgets(4));

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN app shell WHEN first loaded THEN starts on Dashboard screen',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN navigation items WHEN tapped THEN responds without errors',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Test that navigation items can be tapped without errors
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      // In test environment, actual navigation doesn't happen but the tap is handled

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN app shell WHEN rendered THEN shows badge on Activity tab',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final badgeFinder = find.byKey(const Key('nav_activity_badge_inactive'));
      expect(badgeFinder, findsOneWidget);
      final badge = tester.widget<Badge>(badgeFinder);
      expect(badge.label, isNotNull);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN notifications WHEN unread present THEN badge displays unread count',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final badge = tester.widget<Badge>(
        find.byKey(const Key('nav_activity_badge_inactive')),
      );
      expect(badge.label, isNotNull);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN navigation bar WHEN rendered THEN has proper styling and height',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        BlocProvider<NotificationCubit>.value(
          value: notificationCubit,
          child: const AppShell(
            child: DashboardScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));

      expect(
          navBar.backgroundColor,
          equals(Theme.of(tester.element(find.byType(NavigationBar)))
              .colorScheme
              .surface));
      expect(navBar.height, equals(70));
      expect(
        navBar.labelBehavior,
        equals(NavigationDestinationLabelBehavior.alwaysShow),
      );

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN navigation bar WHEN rendered THEN has shadow decoration',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      // Navigation bar should be wrapped in a Container with shadow
      final container = tester.widget<Container>(
        find
            .ancestor(
              of: find.byType(NavigationBar),
              matching: find.byType(Container),
            )
            .first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.boxShadow, isNotNull);
      expect(decoration.boxShadow!.isNotEmpty, isTrue);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    // WCAG 2.1 Compliance Tests
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN app shell WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          handle = tester.ensureSemantics();

          // When
          await tester.pumpApp(const AppShell(
            child: DashboardScreen(),
          ));
          await tester.pumpAndSettle();
          // Then - All tappable areas must be at least 48x48 dp
          await expectLater(
            tester,
            meetsGuideline(androidTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN app shell WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          handle = tester.ensureSemantics();

          // When
          await tester.pumpApp(const AppShell(
            child: DashboardScreen(),
          ));
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 44x44 pts
          await expectLater(
            tester,
            meetsGuideline(iOSTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN app shell WHEN rendered THEN all navigation items have labels',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          handle = tester.ensureSemantics();

          // When
          await tester.pumpApp(const AppShell(
            child: DashboardScreen(),
          ));
          await tester.pumpAndSettle();

          // Then - All interactive elements must have semantic labels
          expect(find.bySemanticsLabel('Home tab, 1 of 4'), findsOneWidget);
          expect(find.bySemanticsLabel('Calendar tab, 2 of 4'), findsOneWidget);
          expect(find.bySemanticsLabel('Activity tab, 3 of 4'), findsOneWidget);
          expect(find.bySemanticsLabel('My Orbit tab, 4 of 4'), findsOneWidget);

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN app shell WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          handle = tester.ensureSemantics();

          // When
          await tester.pumpApp(const AppShell(
            child: DashboardScreen(),
          ));
          await tester.pumpAndSettle();

          // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
          await expectLater(
            tester,
            meetsGuideline(textContrastGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );
    });
  });
}

class _TestNotificationRepository implements NotificationRepository {
  _TestNotificationRepository(List<domain_notification.Notification> seed)
      : _notifications = List<domain_notification.Notification>.from(seed);

  final List<domain_notification.Notification> _notifications;

  @override
  Future<Result<domain_notification.Notification>> addNotification(
    domain_notification.Notification notification,
  ) async {
    if (_notifications.every((item) => item.id != notification.id)) {
      _notifications.insert(0, notification);
    }
    return Success(notification);
  }

  @override
  Future<Result<void>> bulkDismissRemote(List<String> notificationIds) async {
    return const Success(null);
  }

  @override
  Future<Result<void>> deleteNotificationRemote(String notificationId) async {
    _notifications.removeWhere((item) => item.id == notificationId);
    return const Success(null);
  }

  @override
  Future<Result<List<domain_notification.Notification>>>
      getLocalNotifications() async {
    return Success(
        List<domain_notification.Notification>.unmodifiable(_notifications));
  }

  @override
  Future<Result<List<domain_notification.Notification>>>
      getMockNotifications() async {
    return Success(
        List<domain_notification.Notification>.unmodifiable(_notifications));
  }

  @override
  Future<Result<List<domain_notification.Notification>>>
      getNotifications() async {
    return Success(
        List<domain_notification.Notification>.unmodifiable(_notifications));
  }

  @override
  Future<Result<void>> markAllAsReadRemote() async {
    return const Success(null);
  }

  @override
  Future<Result<void>> markAsReadRemote(String notificationId) async {
    final index =
        _notifications.indexWhere((item) => item.id == notificationId);
    if (index >= 0) {
      final updated = _notifications[index].markAsRead();
      _notifications[index] = updated;
    }
    return const Success(null);
  }

  @override
  Future<void> saveLocalNotifications(
    List<domain_notification.Notification> notifications,
  ) async {
    _notifications
      ..clear()
      ..addAll(notifications);
  }

  @override
  Future<Result<void>> updateNotificationStateRemote(
    domain_notification.Notification notification,
  ) async {
    final index =
        _notifications.indexWhere((item) => item.id == notification.id);
    if (index >= 0) {
      _notifications[index] = notification;
    }
    return const Success(null);
  }
}
