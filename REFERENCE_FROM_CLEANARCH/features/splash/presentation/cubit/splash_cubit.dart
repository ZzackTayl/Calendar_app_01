part of 'cubit.dart';

class SplashCubit extends Cubit<SplashState> {
  final SharedPreferences? _prefs;

  SplashCubit({SharedPreferences? prefs})
    : _prefs = prefs,
      super(SplashInitial());

  Future<void> startSplash() async {
    emit(SplashLoading());

    // Initialize app components
    await initializeApp();

    // Minimum splash display time
    await Future.delayed(const Duration(seconds: 2));

    // Check if onboarding is completed
    final hasCompletedOnboarding =
        _prefs?.getBool('onboarding_completed') ?? false;

    emit(SplashCompleted(shouldShowOnboarding: !hasCompletedOnboarding));
  }

  // Add any initialization logic here
  Future<void> initializeApp() async {
    // Check authentication status
    final isLoggedIn = _prefs?.getBool('isLoggedIn') ?? false;

    // Load user preferences
    // Initialize services
    // Setup analytics
    await Future.delayed(const Duration(milliseconds: 500));
  }
}
