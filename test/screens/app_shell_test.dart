import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/app_shell.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('AppShell', () {
    setUp(() async {
      // Set up test environment
    });

    testWidgets('renders with bottom navigation bar', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(NavigationBar), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has 4 navigation destinations', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(NavigationDestination), findsNWidgets(4));

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays correct navigation labels', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      // Use keys to find navigation items to avoid ambiguity
      expect(find.byKey(const Key('nav_home')), findsOneWidget);
      expect(find.byKey(const Key('nav_calendar')), findsOneWidget);
      expect(find.byKey(const Key('nav_activity')), findsOneWidget);
      expect(find.byKey(const Key('nav_people')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays navigation icons', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      // Navigation bar should contain icons
      expect(find.byType(Icon), findsWidgets);
      // Should have at least 4 navigation items
      expect(find.byType(NavigationDestination), findsNWidgets(4));

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('starts on Dashboard screen', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      expect(find.byType(DashboardScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation items are tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      // Test that navigation items can be tapped without errors
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      // In test environment, actual navigation doesn't happen but the tap is handled

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows badge on Activity tab', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      // Badge should be present on Activity tab
      expect(find.byType(Badge), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('badge displays unread count', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
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

    testWidgets('navigation bar has proper styling', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const AppShell(
        child: DashboardScreen(),
      ));
      await tester.pumpAndSettle();

      final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));

      expect(navBar.backgroundColor,
          equals(Theme.of(tester.element(find.byType(NavigationBar))).colorScheme.surface));
      expect(navBar.height, equals(70));
      expect(
        navBar.labelBehavior,
        equals(NavigationDestinationLabelBehavior.alwaysShow),
      );

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('navigation bar has shadow', (tester) async {
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
  });
}
