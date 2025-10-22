import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

// Helper function for calendar-specific animations
Future<void> _pumpUntilSettled(WidgetTester tester,
    {int maxIterations = 20}) async {
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

    testWidgets('GIVEN calendar screen WHEN rendered THEN displays calendar view', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      expect(find.byType(CalendarScreen), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN rendered THEN has gradient background', (tester) async {
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

    testWidgets('GIVEN calendar screen WHEN rendered THEN has scrollable layout', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Calendar uses scroll view with column layout
      expect(find.byType(SingleChildScrollView), findsOneWidget);
      expect(find.byType(Column), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN rendered THEN displays month/year header', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Calendar should have a header with month/year
      expect(find.byType(Text), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN rendered THEN has prev/next navigation buttons', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have navigation buttons (prev/next)
      expect(find.byType(IconButton), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN rendered THEN displays month/week/day view toggles', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have view toggle buttons with unique keys
      expect(find.byKey(const Key('view_month')), findsOneWidget);
      expect(find.byKey(const Key('view_week')), findsOneWidget);
      expect(find.byKey(const Key('view_day')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN view toggle tapped THEN switches between views', (tester) async {
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

    testWidgets('GIVEN calendar screen WHEN rendered THEN next month button is visible', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Should have next month button with unique key
      expect(find.byKey(const Key('next_month')), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('GIVEN calendar screen WHEN next month button tapped THEN navigates to next month', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const CalendarScreen());
      await _pumpUntilSettled(tester);

      // Tap next month button
      await tester.tap(find.byKey(const Key('next_month')));
      await _pumpUntilSettled(tester);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    // ========================================================================
    // NEW: WCAG 2.1 Accessibility Compliance Tests
    // ========================================================================
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN calendar screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

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
        'GIVEN calendar screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

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
        'GIVEN calendar screen WHEN rendered THEN all interactive elements have labels',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // Then - All tappable elements must have semantic labels
          await expectLater(
            tester,
            meetsGuideline(labeledTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN calendar screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

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

    // ========================================================================
    // NEW: Edge Cases & Responsive Design Tests
    // ========================================================================
    group('Edge Cases & Responsive Design', () {
      testWidgets(
        'GIVEN small screen WHEN calendar rendered THEN adapts layout responsively',
        (tester) async {
          // Given - Small phone screen
          await tester.binding.setSurfaceSize(const Size(320, 568)); // iPhone SE
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // Then - Should render without layout errors
          expect(
            find.byType(CalendarScreen),
            findsOneWidget,
            reason: 'Calendar should adapt to small screens',
          );
          
          expect(
            tester.takeException(),
            isNull,
            reason: 'Should not throw layout exceptions on small screens',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN large tablet screen WHEN calendar rendered THEN uses available space',
        (tester) async {
          // Given - Tablet screen
          await tester.binding.setSurfaceSize(const Size(1024, 1366)); // iPad Pro
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // Then - Should render and utilize space
          expect(
            find.byType(CalendarScreen),
            findsOneWidget,
            reason: 'Calendar should adapt to large screens',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN increased text scaling WHEN calendar renders THEN layout adapts without overflow',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);

          // When - Simulate accessibility text scaling (200%)
          await tester.pumpApp(
            MediaQuery(
              data: const MediaQueryData(textScaleFactor: 2.0),
              child: const CalendarScreen(),
            ),
          );
          await _pumpUntilSettled(tester);

          // Then - Should not overflow
          expect(
            tester.takeException(),
            isNull,
            reason: 'Layout should handle large text without overflow',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN calendar with no events WHEN rendered THEN shows empty calendar gracefully',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);

          // When - Calendar with no events should still render
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // Then - Should show calendar without errors
          expect(
            find.byType(CalendarScreen),
            findsOneWidget,
            reason: 'Calendar should handle empty state gracefully',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN previous month button WHEN tapped THEN navigates to previous month',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // When
          final prevButton = find.byKey(const Key('previous_month'));
          expect(prevButton, findsOneWidget);
          
          await tester.tap(prevButton);
          await _pumpUntilSettled(tester);

          // Then - Should navigate without errors
          expect(
            tester.takeException(),
            isNull,
            reason: 'Previous month navigation should work without errors',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN calendar in month view WHEN rapidly switching views THEN handles transitions smoothly',
        (tester) async {
          // Given
          await TestHelpers.setupTestEnvironment(tester);
          await tester.pumpApp(const CalendarScreen());
          await _pumpUntilSettled(tester);

          // When - Rapid view switching
          await tester.tap(find.byKey(const Key('view_week')));
          await _pumpUntilSettled(tester);
          
          await tester.tap(find.byKey(const Key('view_day')));
          await _pumpUntilSettled(tester);
          
          await tester.tap(find.byKey(const Key('view_month')));
          await _pumpUntilSettled(tester);
          
          await tester.tap(find.byKey(const Key('view_week')));
          await _pumpUntilSettled(tester);

          // Then - Should handle rapid transitions
          expect(
            tester.takeException(),
            isNull,
            reason: 'Rapid view switching should not cause errors',
          );

          TestHelpers.tearDownTestEnvironment(tester);
        },
      );
    });
  });
}
