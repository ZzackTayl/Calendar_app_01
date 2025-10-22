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
    testWidgets('GIVEN onboarding screen WHEN first time user THEN shows welcome step with connect button', (tester) async {
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

    testWidgets('GIVEN Google connected WHEN onboarding loads THEN shows success banner',
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

    // WCAG 2.1 Compliance Tests
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN onboarding screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          final initialState = const OnboardingState(
            currentStep: 0,
            googleConnected: false,
          );

          // When
          await tester.pumpApp(
            const OnboardingScreen(),
            overrides: [
              onboardingProvider.overrideWith(
                () => _MockOnboardingNotifier(initialState),
              ),
            ],
          );
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
        'GIVEN onboarding screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          final initialState = const OnboardingState(
            currentStep: 0,
            googleConnected: false,
          );

          // When
          await tester.pumpApp(
            const OnboardingScreen(),
            overrides: [
              onboardingProvider.overrideWith(
                () => _MockOnboardingNotifier(initialState),
              ),
            ],
          );
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
        'GIVEN onboarding screen WHEN rendered THEN all interactive elements have labels',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          final initialState = const OnboardingState(
            currentStep: 0,
            googleConnected: false,
          );

          // When
          await tester.pumpApp(
            const OnboardingScreen(),
            overrides: [
              onboardingProvider.overrideWith(
                () => _MockOnboardingNotifier(initialState),
              ),
            ],
          );
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
        'GIVEN onboarding screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          
          final initialState = const OnboardingState(
            currentStep: 0,
            googleConnected: false,
          );

          // When
          await tester.pumpApp(
            const OnboardingScreen(),
            overrides: [
              onboardingProvider.overrideWith(
                () => _MockOnboardingNotifier(initialState),
              ),
            ],
          );
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
