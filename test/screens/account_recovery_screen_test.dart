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

      // Verify first step - Enter your email
      expect(find.text('Enter your email'), findsOneWidget);
      expect(find.text('We will send a recovery link to your email address.'),
          findsOneWidget);

      // Attempt to continue without email should trigger SnackBar.
      await invokeStepperContinue();
      expect(find.text('Enter your email'), findsOneWidget);

      // Provide email identifier.
      await tester.enterText(
        find.widgetWithText(TextField, 'Email address'),
        'founder@example.com',
      );
      await tester.pump();

      await invokeStepperContinue();
      // After providing email, should move to verification step
      expect(find.text('Verify it is you'), findsOneWidget);

      await tester.enterText(
        find.widgetWithText(TextField, 'Verification code'),
        '123456',
      );
      await tester.pump();

      await invokeStepperContinue();
      // After verification code, should move to password step
      expect(find.text('Create a new password'), findsOneWidget);

      // Attempt to finish without matching passwords.
      await invokeStepperContinue();
      await tester.pump();
      expect(find.text('Create a new password'), findsOneWidget);

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
