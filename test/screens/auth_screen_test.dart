import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/auth_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AuthScreen', () {
    testWidgets('renders sign in form by default', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      expect(find.text('Welcome to MyOrbit'), findsOneWidget);
      expect(find.text('Sign in'), findsNWidgets(2));
      expect(find.byKey(const Key('sign_in_email_field')), findsOneWidget);
      expect(find.byKey(const Key('sign_in_password_field')), findsOneWidget);
      expect(find.text('Forgot password?'), findsOneWidget);
    });

    testWidgets('switches to sign up form', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.text('Sign up'));
      await tester.pumpAndSettle();

      expect(find.text('Create account'), findsOneWidget);
      expect(find.byKey(const Key('sign_up_name_field')), findsOneWidget);
      expect(find.byKey(const Key('sign_up_confirm_password_field')), findsOneWidget);
      expect(find.text('Forgot password?'), findsNothing);
    });

    testWidgets('validate email before submission', (tester) async {
      await tester.pumpApp(const AuthScreen());
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
      await tester.pump();

      expect(find.text('Please enter your email'), findsOneWidget);
      expect(find.text('Please enter your password'), findsOneWidget);
    });
  });
}
