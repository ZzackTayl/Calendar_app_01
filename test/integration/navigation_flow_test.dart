import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';
import 'package:myorbit_calendar/ui/screens/activity_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('Navigation Flow Integration Tests', () {
    testWidgets('complete navigation flow through all tabs', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Start on Dashboard
      expect(find.byType(DashboardScreen), findsOneWidget);
      expect(find.text('MyOrbit'), findsOneWidget);

      // Navigate to Calendar using key
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      expect(find.byType(CalendarScreen), findsOneWidget);

      // Navigate to Activity using key
      await tester.tap(find.byKey(const Key('nav_activity')));
      await tester.pumpAndSettle();
      expect(find.byType(ActivityScreen), findsOneWidget);
      expect(find.text('Recent Activity'), findsOneWidget);

      // Navigate back to Home using key
      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();
      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation preserves screen state', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Verify Dashboard content
      expect(find.text('MyOrbit'), findsOneWidget);

      // Navigate away and back using keys
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      
      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();

      // Dashboard content should still be there
      expect(find.text('MyOrbit'), findsOneWidget);
      expect(find.text('Events'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('badge updates are visible across navigation', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Badge should be visible on Activity tab
      expect(find.byType(Badge), findsWidgets);

      // Navigate to different tabs using key
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();

      // Badge should still be visible
      expect(find.byType(Badge), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('all screens render without errors', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      final tabKeys = [
        const Key('nav_home'),
        const Key('nav_calendar'),
        const Key('nav_activity'),
        const Key('nav_people'),
        const Key('nav_settings'),
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