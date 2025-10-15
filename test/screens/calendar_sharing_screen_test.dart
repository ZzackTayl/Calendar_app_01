import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/calendar_sharing_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CalendarSharingScreen', () {
    testWidgets('requires a selection and completes invite flow',
        (tester) async {
      Future<void> invokeStepperContinue() async {
        final stepper = tester.widget<Stepper>(find.byType(Stepper));
        expect(stepper.onStepContinue, isNotNull);
        stepper.onStepContinue!.call();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));
      }

      await tester.pumpApp(const CalendarSharingScreen());
      await tester.pumpAndSettle();

      expect(find.text('Choose people'), findsOneWidget);
      expect(find.text('Alex Chen'), findsWidgets);

      // Unselect all contacts to trigger validation.
      await tester.tap(find.text('Alex Chen').first);
      await tester.pump();

      await invokeStepperContinue();
      expect(
        find.text('Pick at least one person to share with.'),
        findsOneWidget,
      );

      // Re-select and advance.
      await tester.tap(find.text('Alex Chen').first);
      await tester.pump();

      await invokeStepperContinue();
      expect(find.text('Set permissions'), findsOneWidget);
      expect(find.text('Share my availability signals'), findsOneWidget);

      await invokeStepperContinue();

      expect(find.textContaining('Sharing with Alex Chen'), findsOneWidget);
      expect(find.text('Optional message'), findsOneWidget);

      await invokeStepperContinue();
    });
  });
}
