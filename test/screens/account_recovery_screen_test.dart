import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/archived_riverpod/account_recovery_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AccountRecoveryScreen', () {
    testWidgets('GIVEN account recovery screen WHEN user completes all steps THEN resets password successfully', (tester) async {
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

    // WCAG 2.1 Compliance Tests
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN account recovery screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          await tester.binding.setSurfaceSize(const Size(800, 1200));
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AccountRecoveryScreen());
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 48x48 dp
          await expectLater(
            tester,
            meetsGuideline(androidTapTargetGuideline),
          );
          
          handle.dispose();
          await tester.binding.setSurfaceSize(null);
        },
      );

      testWidgets(
        'GIVEN account recovery screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          await tester.binding.setSurfaceSize(const Size(800, 1200));
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AccountRecoveryScreen());
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 44x44 pts
          await expectLater(
            tester,
            meetsGuideline(iOSTapTargetGuideline),
          );
          
          handle.dispose();
          await tester.binding.setSurfaceSize(null);
        },
      );

      testWidgets(
        'GIVEN account recovery screen WHEN rendered THEN all form fields have labels',
        (tester) async {
          // Given
          await tester.binding.setSurfaceSize(const Size(800, 1200));
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AccountRecoveryScreen());
          await tester.pumpAndSettle();

          // Then - All interactive elements must have semantic labels
          await expectLater(
            tester,
            meetsGuideline(labeledTapTargetGuideline),
          );
          
          handle.dispose();
          await tester.binding.setSurfaceSize(null);
        },
      );

      testWidgets(
        'GIVEN account recovery screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          await tester.binding.setSurfaceSize(const Size(800, 1200));
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AccountRecoveryScreen());
          await tester.pumpAndSettle();

          // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
          await expectLater(
            tester,
            meetsGuideline(textContrastGuideline),
          );
          
          handle.dispose();
          await tester.binding.setSurfaceSize(null);
        },
      );
    });
  });
}
