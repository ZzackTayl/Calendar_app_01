import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/auth_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthScreen', () {
    testWidgets('GIVEN auth screen WHEN rendered THEN displays sign in form by default', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      expect(find.text('Welcome to MyOrbit'), findsOneWidget);
      expect(find.text('Sign in'), findsNWidgets(2));
      expect(find.byKey(const Key('sign_in_email_field')), findsOneWidget);
      expect(find.byKey(const Key('sign_in_password_field')), findsOneWidget);
      expect(find.text('Forgot password?'), findsOneWidget);
    });

    testWidgets('GIVEN sign in form WHEN sign up button tapped THEN switches to sign up form', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign up'));
      await tester.pumpAndSettle();

      expect(find.text('Create account'), findsOneWidget);
      expect(find.byKey(const Key('sign_up_name_field')), findsOneWidget);
      expect(find.byKey(const Key('sign_up_confirm_password_field')),
          findsOneWidget);
      expect(find.text('Forgot password?'), findsNothing);
    });

    testWidgets('GIVEN empty fields WHEN submit tapped THEN validates email and password required', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pump();

      expect(find.text('Please enter your email'), findsOneWidget);
      expect(find.text('Please enter your password'), findsOneWidget);
    });

    // WCAG 2.1 Compliance Tests
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN auth screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AuthScreen());
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 48x48 dp
          await expectLater(
            tester,
            meetsGuideline(androidTapTargetGuideline),
          );
          
          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN auth screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AuthScreen());
          await tester.pumpAndSettle();

          // Then - All tappable areas must be at least 44x44 pts
          await expectLater(
            tester,
            meetsGuideline(iOSTapTargetGuideline),
          );
          
          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN auth screen WHEN rendered THEN all form fields and buttons have labels',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AuthScreen());
          await tester.pumpAndSettle();

          // Then - All interactive elements must have semantic labels
          await expectLater(
            tester,
            meetsGuideline(labeledTapTargetGuideline),
          );
          
          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN auth screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          // When
          await tester.pumpApp(const AuthScreen());
          await tester.pumpAndSettle();

          // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
          await expectLater(
            tester,
            meetsGuideline(textContrastGuideline),
          );
          
          handle.dispose();
        },
      );
    });
  });
}
