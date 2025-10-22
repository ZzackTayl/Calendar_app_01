import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/ui/screens/calendar_screen.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

Future<void> _pumpUntilSettled(WidgetTester tester,
    {int maxIterations = 20}) async {
  for (var i = 0; i < maxIterations; i++) {
    await tester.pump(const Duration(milliseconds: 100));
    if (!tester.binding.hasScheduledFrame) {
      return;
    }
  }
}

Future<void> _pumpCalendar(WidgetTester tester) async {
  await tester.pumpApp(const CalendarScreen());
  await _pumpUntilSettled(tester);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CalendarScreen typography', () {
    testWidgets(
        'GIVEN phone width WHEN calendar renders THEN month header uses responsive tokens',
        (tester) async {
      await TimezoneService.initialize();
      final view = tester.view;
      view.devicePixelRatio = 1.0;
      view.physicalSize = const Size(480, 800);
      addTearDown(() {
        view.resetPhysicalSize();
        view.resetDevicePixelRatio();
      });

      await TestHelpers.setupTestEnvironment(tester);
      await TestHelpers.setupTestEnvironment(tester);
      await _pumpCalendar(tester);

      final headerText = DateFormat('MMMM yyyy').format(DateTime.now());
      final headerFinder = find.text(headerText);
      expect(headerFinder, findsOneWidget);
      final textWidget = tester.widget<Text>(headerFinder);
      final expectedFontSize = ResponsiveTextStyles(480).heading4.fontSize!;
      expect(textWidget.style, isNotNull);
      expect(textWidget.style!.fontSize, closeTo(expectedFontSize, 0.01));
    });

    testWidgets(
        'GIVEN tablet width WHEN calendar renders THEN month header scales responsively',
        (tester) async {
      await TimezoneService.initialize();
      final view = tester.view;
      view.devicePixelRatio = 1.0;
      view.physicalSize = const Size(800, 1200);
      addTearDown(() {
        view.resetPhysicalSize();
        view.resetDevicePixelRatio();
      });

      await TestHelpers.setupTestEnvironment(tester);
      await TestHelpers.setupTestEnvironment(tester);
      await _pumpCalendar(tester);

      final headerText = DateFormat('MMMM yyyy').format(DateTime.now());
      final headerFinder = find.text(headerText);
      expect(headerFinder, findsOneWidget);
      final textWidget = tester.widget<Text>(headerFinder);
      final expectedFontSize = ResponsiveTextStyles(800).heading4.fontSize!;
      expect(textWidget.style, isNotNull);
      expect(textWidget.style!.fontSize, closeTo(expectedFontSize, 0.01));

      TestHelpers.tearDownTestEnvironment(tester);
    });
  });
}
