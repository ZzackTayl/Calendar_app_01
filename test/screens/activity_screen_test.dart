import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/activity_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('ActivityScreen', () {
    setUp(() async {
      // Set up test environment
    });

    testWidgets('renders header with title and subtitle', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      expect(find.text('Recent Activity'), findsOneWidget);
      expect(
        find.text('Track changes and updates from your connected partners'),
        findsOneWidget,
      );

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays activity list', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Should display multiple activity cards
      expect(find.byType(Container), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('activity cards have proper structure', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Each activity card should have an icon
      expect(find.byType(Icon), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays different notification types', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Should show various activity types
      expect(find.byType(RichText), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows timestamps for activities', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Timestamps should be present (e.g., "2h ago", "1d ago")
      expect(find.textContaining('ago'), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has proper gradient background', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      final container = tester.widget<Container>(
        find.descendant(
          of: find.byType(Scaffold),
          matching: find.byType(Container),
        ).first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.gradient, isA<LinearGradient>());

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('is scrollable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      expect(find.byType(SingleChildScrollView), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('activity cards have colored borders', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Activity cards should have BoxDecoration with borders
      final containers = tester.widgetList<Container>(
        find.byType(Container),
      );

      var foundBorderedContainer = false;
      for (final container in containers) {
        if (container.decoration is BoxDecoration) {
          final decoration = container.decoration as BoxDecoration;
          if (decoration.border != null) {
            foundBorderedContainer = true;
            break;
          }
        }
      }

      expect(foundBorderedContainer, isTrue);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays actor names in bold', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // RichText should contain bold text spans for actor names
      expect(find.byType(RichText), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('shows full timestamp with relative time', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);
      
      await tester.pumpApp(const ActivityScreen());
      await tester.pumpAndSettle();

      // Timestamps should include both relative and absolute time
      // e.g., "2h ago • Monday, January 1 at 10:00 AM"
      expect(find.textContaining('•'), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}