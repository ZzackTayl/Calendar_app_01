import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/logic/providers/onboarding_provider.dart';
import 'package:myorbit_calendar/ui/screens/onboarding_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/pump_app.dart';

class _MockOnboardingNotifier extends OnboardingNotifier {
  _MockOnboardingNotifier(this._initialState);

  final OnboardingState _initialState;

  @override
  OnboardingState build() => _initialState;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  SharedPreferences.setMockInitialValues({});

  group('OnboardingScreen', () {
    testWidgets('shows welcome step and connect button', (tester) async {
      final initialState = const OnboardingState(
        currentStep: 0,
        googleConnected: false,
      );

      await tester.pumpApp(
        const OnboardingScreen(),
        overrides: [
          onboardingProvider.overrideWith(
            () => _MockOnboardingNotifier(initialState),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Welcome to MyOrbit'), findsOneWidget);
      expect(
        find.text('Your consent-aware calendar for complex social networks'),
        findsOneWidget,
      );
      expect(find.text('Connect Google Calendar'), findsOneWidget);
      expect(find.text('Skip'), findsOneWidget);
    });

    testWidgets('shows success banner when Google is connected',
        (tester) async {
      final initialState = const OnboardingState(
        currentStep: 0,
        googleConnected: true,
      );

      await tester.pumpApp(
        const OnboardingScreen(),
        overrides: [
          onboardingProvider.overrideWith(
            () => _MockOnboardingNotifier(initialState),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Google Calendar connected successfully!'),
        findsOneWidget,
      );
      expect(find.text('Continue'), findsOneWidget);
    });
  });
}
