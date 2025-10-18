import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

Future<void> _pumpUntilSettled(WidgetTester tester, {int maxIterations = 20}) async {
  for (var i = 0; i < maxIterations; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (!tester.binding.hasScheduledFrame) {
      return;
    }
  }
}

void main() {
  group('CalendarScreen', () {
    setUp(() async {
      // Set up test environment
    });

    testWidgets('renders calendar screen', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      expect(find.byType(CalendarScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has proper gradient background', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(Scaffold),
              matching: find.byType(Container),
            )
            .first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.gradient, isA<LinearGradient>());

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has proper layout structure', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Calendar uses scroll view with column layout
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byType(Column), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays calendar header', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Calendar should have a header with month/year
      expect(find.byType(Text), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has navigation controls', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have navigation buttons (prev/next)
      expect(find.byType(IconButton), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has view toggle buttons with keys', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have view toggle buttons with unique keys
      expect(find.byKey(const Key('view_month')), findsOneWidget);
      expect(find.byKey(const Key('view_week')), findsOneWidget);
      expect(find.byKey(const Key('view_day')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('can tap view toggle buttons', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Tap week view button
      await tester.tap(find.byKey(const Key('view_week')));
      await _pumpUntilSettled(tester);

      // Tap day view button
      await tester.tap(find.byKey(const Key('view_day')));
      await _pumpUntilSettled(tester);

      // Tap month view button
      await tester.tap(find.byKey(const Key('view_month')));
      await _pumpUntilSettled(tester);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has next month button with key', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have next month button with unique key
      expect(find.byKey(const Key('next_month')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('can tap next month button', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Tap next month button
      await tester.tap(find.byKey(const Key('next_month')));
      await _pumpUntilSettled(tester);

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}
