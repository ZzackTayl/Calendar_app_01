part of 'cubit.dart';

class OnboardingCubit extends Cubit<OnboardingState> {
  final SharedPreferences _prefs;

  static const String _onboardingKey = 'onboarding_completed';
  static const String _onboardingDataKey = 'onboarding_data';

  OnboardingCubit({required SharedPreferences prefs})
    : _prefs = prefs,
      super(const OnboardingInitial());

  /// Check if user has completed onboarding
  Future<bool> hasCompletedOnboarding() async {
    return _prefs.getBool(_onboardingKey) ?? false;
  }

  /// Start onboarding flow
  void startOnboarding() {
    emit(
      const OnboardingInProgress(
        currentStep: OnboardingStep.welcome,
        currentPageIndex: 0,
      ),
    );
  }

  /// Navigate to next page
  void nextPage() {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    final nextIndex = currentState.currentPageIndex + 1;
    final nextStep = _getStepForIndex(nextIndex);

    emit(
      currentState.copyWith(currentPageIndex: nextIndex, currentStep: nextStep),
    );
  }

  /// Navigate to previous page
  void previousPage() {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;
    if (currentState.currentPageIndex == 0) return;

    final prevIndex = currentState.currentPageIndex - 1;
    final prevStep = _getStepForIndex(prevIndex);

    emit(
      currentState.copyWith(currentPageIndex: prevIndex, currentStep: prevStep),
    );
  }

  /// Skip to specific step
  void skipToStep(OnboardingStep step) {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    final index = _getIndexForStep(step);
    emit(currentState.copyWith(currentStep: step, currentPageIndex: index));
  }

  /// Connect calendar (Google/Apple)
  Future<void> connectCalendar(CalendarProvider provider) async {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    try {
      // For now, simulate connection
      await Future.delayed(const Duration(seconds: 1));

      final calendarSync = CalendarSyncModel(
        provider: provider,
        isConnected: true,
        accountEmail: provider == CalendarProvider.google
            ? 'user@gmail.com'
            : 'user@icloud.com',
      );

      emit(currentState.copyWith(calendarSync: calendarSync));
    } catch (e) {
      emit(
        OnboardingError(
          message: 'Failed to connect calendar: ${e.toString()}',
          currentStep: currentState.currentStep,
          currentPageIndex: currentState.currentPageIndex,
        ),
      );
    }
  }

  /// Skip calendar sync
  void skipCalendarSync() {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    emit(
      currentState.copyWith(
        calendarSync: const CalendarSyncModel(provider: CalendarProvider.none),
      ),
    );
  }

  /// Import contacts
  Future<void> importContacts() async {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    try {
      await Future.delayed(const Duration(seconds: 1));

      emit(currentState.copyWith(contactsImported: true));
    } catch (e) {
      emit(
        OnboardingError(
          message: 'Failed to import contacts: ${e.toString()}',
          currentStep: currentState.currentStep,
          currentPageIndex: currentState.currentPageIndex,
        ),
      );
    }
  }

  /// Skip contacts import
  void skipContactsImport() {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    emit(currentState.copyWith(contactsImported: false));
  }

  /// Complete onboarding
  Future<void> completeOnboarding() async {
    final currentState = state;
    if (currentState is! OnboardingInProgress) return;

    try {
      final data = OnboardingData(
        calendarSync: currentState.calendarSync,
        contactsImported: currentState.contactsImported,
        completedAt: DateTime.now(),
      );

      // Save to local storage
      await _prefs.setBool(_onboardingKey, true);
      await _prefs.setString(_onboardingDataKey, data.toJson().toString());

      emit(OnboardingCompleted(data: data));
    } catch (e) {
      emit(
        OnboardingError(
          message: 'Failed to complete onboarding: ${e.toString()}',
          currentStep: currentState.currentStep,
          currentPageIndex: currentState.currentPageIndex,
        ),
      );
    }
  }

  // Helper methods
  OnboardingStep _getStepForIndex(int index) {
    switch (index) {
      case 0:
        return OnboardingStep.welcome;
      case 1:
        return OnboardingStep.calendarSync;
      case 2:
        return OnboardingStep.permissionsIntro;
      case 3:
        return OnboardingStep.contactsImport;
      default:
        return OnboardingStep.complete;
    }
  }

  int _getIndexForStep(OnboardingStep step) {
    switch (step) {
      case OnboardingStep.welcome:
        return 0;
      case OnboardingStep.calendarSync:
        return 1;
      case OnboardingStep.permissionsIntro:
        return 2;
      case OnboardingStep.contactsImport:
        return 3;
      case OnboardingStep.complete:
        return 4;
    }
  }
}
