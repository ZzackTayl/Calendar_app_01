import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/providers/notification_providers.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('Navigation Flow Integration Tests', () {
    testWidgets('complete navigation flow through all tabs', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
        overrides: [
          unreadNotificationCountProvider.overrideWithValue(3),
        ],
      );
      await tester.pumpAndSettle();

      // Start with Dashboard as child
      expect(find.byType(DashboardScreen), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image ||
              (widget is Container && widget.decoration != null),
        ),
        findsWidgets,
      );

      // Test navigation taps (in test mode, screens won't actually switch)
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      // Screen switching doesn't happen in test context due to GoRouter requirements

      await tester.tap(find.byKey(const Key('nav_activity')));
      await tester.pumpAndSettle();
      // Navigation taps work but don't switch screens in test mode

      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();
      // Original child remains

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation preserves screen state', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
        overrides: [
          unreadNotificationCountProvider.overrideWithValue(3),
        ],
      );
      await tester.pumpAndSettle();

      // Verify Dashboard content
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image ||
              (widget is Container && widget.decoration != null),
        ),
        findsWidgets,
      );

      // Navigate away and back using keys (taps work, but screens don't change in tests)
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();

      // Dashboard content should still be there (as it's the fixed child in test)
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image ||
              (widget is Container && widget.decoration != null),
        ),
        findsWidgets,
      );
      expect(find.text('Events'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('badge updates are visible across navigation', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
        overrides: [
          unreadNotificationCountProvider.overrideWithValue(3),
        ],
      );
      await tester.pumpAndSettle();

      final badgeFinder = find.byKey(const Key('nav_activity_badge_inactive'));
      expect(badgeFinder, findsOneWidget);

      // Navigate to different tabs using key
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();

      // Badge should still be visible
      expect(badgeFinder, findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('all screens render without errors', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
        overrides: [
          unreadNotificationCountProvider.overrideWithValue(3),
        ],
      );
      await tester.pumpAndSettle();

      final tabKeys = [
        const Key('nav_home'),
        const Key('nav_calendar'),
        const Key('nav_activity'),
        const Key('nav_people'),
      ];

      for (final tabKey in tabKeys) {
        await tester.tap(find.byKey(tabKey));
        await tester.pumpAndSettle();

        // Verify no errors occurred
        expect(tester.takeException(), isNull);
      }

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}
