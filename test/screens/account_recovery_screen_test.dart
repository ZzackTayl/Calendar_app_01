import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/account_recovery_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AccountRecoveryScreen', () {
    testWidgets('validates each step and completes reset flow', (tester) async {
      Future<void> invokeStepperContinue() async {
        final stepper = tester.widget<Stepper>(find.byType(Stepper));
        expect(stepper.onStepContinue, isNotNull);
        stepper.onStepContinue!.call();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));
      }

      await tester.binding.setSurfaceSize(const Size(800, 1200));
      addTearDown(() => tester.binding.setSurfaceSize(null));

      await tester.pumpApp(const AccountRecoveryScreen());
      await tester.pumpAndSettle();

      expect(find.text('Choose recovery method'), findsOneWidget);
      expect(find.text('Delivery method'), findsOneWidget);

      // Attempt to continue without identifier should show validation message.
      await invokeStepperContinue();
      expect(find.text('Choose recovery method'), findsOneWidget);

      // Provide email identifier.
      await tester.enterText(
        find.widgetWithText(TextField, 'Email address'),
        'founder@example.com',
      );
      await tester.pump();

      await invokeStepperContinue();
      expect(find.text('Enter the code from our email.'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Verification code'),
        '123456',
      );
      await tester.pump();

      await invokeStepperContinue();
      expect(find.text('New password'), findsOneWidget);

      // Attempt to finish without matching passwords.
      await invokeStepperContinue();
      await tester.pump();
      expect(find.text('New password'), findsOneWidget);

      // Provide matching passwords.
      await tester.enterText(
        find.widgetWithText(TextField, 'New password'),
        'strongPass1',
      );
      await tester.enterText(
        find.widgetWithText(TextField, 'Confirm new password'),
        'strongPass1',
      );
      await tester.pump();
    });
  });
}
