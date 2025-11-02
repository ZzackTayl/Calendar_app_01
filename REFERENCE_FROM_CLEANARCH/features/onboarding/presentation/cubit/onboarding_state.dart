part of 'cubit.dart';

abstract class OnboardingState {
  final OnboardingStep currentStep;
  final int currentPageIndex;

  const OnboardingState({required this.currentStep, this.currentPageIndex = 0});
}

class OnboardingInitial extends OnboardingState {
  const OnboardingInitial()
    : super(currentStep: OnboardingStep.welcome, currentPageIndex: 0);
}

class OnboardingInProgress extends OnboardingState {
  final CalendarSyncModel? calendarSync;
  final bool contactsImported;

  const OnboardingInProgress({
    required super.currentStep,
    required super.currentPageIndex,
    this.calendarSync,
    this.contactsImported = false,
  });

  OnboardingInProgress copyWith({
    OnboardingStep? currentStep,
    int? currentPageIndex,
    CalendarSyncModel? calendarSync,
    bool? contactsImported,
  }) {
    return OnboardingInProgress(
      currentStep: currentStep ?? this.currentStep,
      currentPageIndex: currentPageIndex ?? this.currentPageIndex,
      calendarSync: calendarSync ?? this.calendarSync,
      contactsImported: contactsImported ?? this.contactsImported,
    );
  }
}

class OnboardingCompleted extends OnboardingState {
  final OnboardingData data;

  const OnboardingCompleted({required this.data})
    : super(currentStep: OnboardingStep.complete, currentPageIndex: 0);
}

class OnboardingError extends OnboardingState {
  final String message;

  const OnboardingError({
    required this.message,
    required super.currentStep,
    required super.currentPageIndex,
  });
}
