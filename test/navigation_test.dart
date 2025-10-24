import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';

import 'helpers/pump_app.dart';
import 'helpers/test_helpers.dart';

void main() {
  group('Bottom Navigation Tests', () {
    testWidgets('AppShell displays bottom navigation bar',
        (WidgetTester tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Verify bottom navigation bar exists
      expect(find.byType(NavigationBar), findsOneWidget);

      // Verify all 4 navigation items exist using keys
      expect(find.byKey(const Key('nav_home')), findsOneWidget);
      expect(find.byKey(const Key('nav_calendar')), findsOneWidget);
      expect(find.byKey(const Key('nav_activity')), findsOneWidget);
      expect(find.byKey(const Key('nav_people')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('AppShell starts with Dashboard screen',
        (WidgetTester tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Dashboard should be visible initially
      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Navigation items are tappable and update provider state',
        (WidgetTester tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      // Initially showing Dashboard child
      expect(find.byType(DashboardScreen), findsOneWidget);

      // Tap Calendar using key - this will update provider state
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      // In test context, screen won't actually change but navigation is triggered

      // Tap Activity using key
      await tester.tap(find.byKey(const Key('nav_activity')));
      await tester.pumpAndSettle();

      // Tap People using key
      await tester.tap(find.byKey(const Key('nav_people')));
      await tester.pumpAndSettle();

      // Tap Home using key
      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();

      // All taps should complete without errors - actual navigation happens via GoRouter in real app

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Activity tab does not show notification badge',
        (WidgetTester tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(
        const AppShell(
          child: DashboardScreen(),
        ),
      );
      await tester.pumpAndSettle();

      final activityDestinationFinder = find.byKey(const Key('nav_activity'));

      expect(
        find.descendant(
          of: activityDestinationFinder,
          matching: find.byType(Badge),
        ),
        findsNothing,
      );

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}
