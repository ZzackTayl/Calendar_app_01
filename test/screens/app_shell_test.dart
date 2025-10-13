import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';
import 'package:myorbit_calendar/ui/screens/activity_screen.dart';
import 'package:myorbit_calendar/ui/screens/people_groups_screen.dart';
import 'package:myorbit_calendar/ui/screens/settings_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('AppShell', () {
    setUp(() async {
      // Set up test environment
    });

    testWidgets('renders with bottom navigation bar', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      expect(find.byType(NavigationBar), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has 5 navigation destinations', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      expect(find.byType(NavigationDestination), findsNWidgets(5));

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays correct navigation labels', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Use keys to find navigation items to avoid ambiguity
      expect(find.byKey(const Key('nav_home')), findsOneWidget);
      expect(find.byKey(const Key('nav_calendar')), findsOneWidget);
      expect(find.byKey(const Key('nav_activity')), findsOneWidget);
      expect(find.byKey(const Key('nav_people')), findsOneWidget);
      expect(find.byKey(const Key('nav_settings')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays correct navigation icons', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Icons may appear in both selected and unselected states
      expect(find.byIcon(Icons.home_outlined), findsWidgets);
      expect(find.byIcon(Icons.calendar_month_outlined), findsWidgets);
      expect(find.byIcon(Icons.notifications_outlined), findsWidgets);
      expect(find.byIcon(Icons.people_outlined), findsWidgets);
      expect(find.byIcon(Icons.settings_outlined), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('starts on Dashboard screen', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigates to Calendar screen when tapped', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();

      expect(find.byType(CalendarScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigates to Activity screen when tapped', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('nav_activity')));
      await tester.pumpAndSettle();

      expect(find.byType(ActivityScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigates to People screen when tapped', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('nav_people')));
      await tester.pumpAndSettle();

      expect(find.byType(PeopleGroupsScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigates to Settings screen when tapped', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('nav_settings')));
      await tester.pumpAndSettle();

      expect(find.byType(SettingsScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('preserves state when switching tabs', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Start on Dashboard
      expect(find.byType(DashboardScreen), findsOneWidget);

      // Navigate to Calendar
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      expect(find.byType(CalendarScreen), findsOneWidget);

      // Navigate back to Dashboard
      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();
      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows badge on Activity tab', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Badge should be present on Activity tab
      expect(find.byType(Badge), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('badge displays unread count', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Find badges
      final badges = tester.widgetList<Badge>(find.byType(Badge));
      
      // At least one badge should have a label
      var foundLabeledBadge = false;
      for (final badge in badges) {
        if (badge.label != null) {
          foundLabeledBadge = true;
          break;
        }
      }

      expect(foundLabeledBadge, isTrue);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('uses IndexedStack for screen management', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      expect(find.byType(IndexedStack), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation bar has proper styling', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
      
      expect(navBar.backgroundColor, equals(Colors.white));
      expect(navBar.height, equals(70));
      expect(
        navBar.labelBehavior,
        equals(NavigationDestinationLabelBehavior.alwaysShow),
      );

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation bar has shadow', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Navigation bar should be wrapped in a Container with shadow
      final container = tester.widget<Container>(
        find.ancestor(
          of: find.byType(NavigationBar),
          matching: find.byType(Container),
        ).first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.boxShadow, isNotNull);
      expect(decoration.boxShadow!.isNotEmpty, isTrue);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('selected icon changes when tab is active', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const AppShell());
      await tester.pumpAndSettle();

      // Initially on Home, should show filled home icon
      expect(find.byIcon(Icons.home), findsOneWidget);

      // Navigate to Calendar
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();

      // Should show filled calendar icon
      expect(find.byIcon(Icons.calendar_month), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}