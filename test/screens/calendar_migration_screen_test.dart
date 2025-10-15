import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/calendar_migration_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CalendarMigrationScreen', () {
    testWidgets('configures migration options and starts import',
        (tester) async {
      Future<void> invokeStepperContinue() async {
        final stepper = tester.widget<Stepper>(find.byType(Stepper));
        expect(stepper.onStepContinue, isNotNull);
        stepper.onStepContinue!.call();
        await tester.pumpAndSettle();
      }

      await tester.pumpApp(const CalendarMigrationScreen());
      await tester.pumpAndSettle();

      expect(find.text('Choose a source'), findsOneWidget);
      expect(find.text('Calendar provider'), findsOneWidget);

      await invokeStepperContinue();
      expect(find.text('Match calendars'), findsOneWidget);

      // Toggle some options.
      await tester.tap(find.text('Include events from the past 12 months'));
      await tester.pump();
      await tester.tap(find.text('Import shared calendars'));
      await tester.pump();

      await invokeStepperContinue();
      expect(find.text('Review changes'), findsOneWidget);
      expect(find.textContaining('Summary'), findsOneWidget);

      await invokeStepperContinue();
    });
  });
}
