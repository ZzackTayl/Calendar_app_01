import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../lib/ui/app_shell.dart';
import '../lib/ui/screens/dashboard_screen.dart';
import '../lib/ui/screens/calendar_screen.dart';
import '../lib/ui/screens/activity_screen.dart';
import '../lib/ui/screens/people_groups_screen.dart';
import '../lib/ui/screens/settings_screen.dart';

void main() {
  group('Bottom Navigation Tests', () {
    testWidgets('AppShell displays bottom navigation bar', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: AppShell(),
          ),
        ),
      );

      // Verify bottom navigation bar exists
      expect(find.byType(NavigationBar), findsOneWidget);
      
      // Verify all 5 navigation items exist using keys
      expect(find.byKey(const Key('nav_home')), findsOneWidget);
      expect(find.byKey(const Key('nav_calendar')), findsOneWidget);
      expect(find.byKey(const Key('nav_activity')), findsOneWidget);
      expect(find.byKey(const Key('nav_people')), findsOneWidget);
      expect(find.byKey(const Key('nav_settings')), findsOneWidget);
    });

    testWidgets('AppShell starts with Dashboard screen', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: AppShell(),
          ),
        ),
      );

      // Dashboard should be visible initially
      expect(find.byType(DashboardScreen), findsOneWidget);
    });

    testWidgets('Tapping navigation items switches screens', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: AppShell(),
          ),
        ),
      );

      // Initially on Dashboard
      expect(find.byType(DashboardScreen), findsOneWidget);

      // Tap Calendar using key
      await tester.tap(find.byKey(const Key('nav_calendar')));
      await tester.pumpAndSettle();
      expect(find.byType(CalendarScreen), findsOneWidget);

      // Tap Activity using key
      await tester.tap(find.byKey(const Key('nav_activity')));
      await tester.pumpAndSettle();
      expect(find.byType(ActivityScreen), findsOneWidget);

      // Tap People using key
      await tester.tap(find.byKey(const Key('nav_people')));
      await tester.pumpAndSettle();
      expect(find.byType(PeopleGroupsScreen), findsOneWidget);

      // Tap Settings using key
      await tester.tap(find.byKey(const Key('nav_settings')));
      await tester.pumpAndSettle();
      expect(find.byType(SettingsScreen), findsOneWidget);

      // Tap Home to go back to Dashboard using key
      await tester.tap(find.byKey(const Key('nav_home')));
      await tester.pumpAndSettle();
      expect(find.byType(DashboardScreen), findsOneWidget);
    });

    testWidgets('Activity tab shows notification badge', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: AppShell(),
          ),
        ),
      );

      // Find the badge widget
      expect(find.byType(Badge), findsWidgets);
    });
  });
}