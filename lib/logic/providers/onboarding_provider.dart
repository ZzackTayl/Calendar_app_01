
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'onboarding_provider.g.dart';

@riverpod
class OnboardingNotifier extends _$OnboardingNotifier {
  @override
  OnboardingState build() {
    return const OnboardingState();
  }

  static const int _totalSteps = 8;

  void setCurrentStep(int step) {
    state = state.copyWith(currentStep: step);
  }

  Future<void> connectGoogleCalendar() async {
    if (state.isConnecting) return;
    state = state.copyWith(isConnecting: true);

    try {
      await Future.delayed(const Duration(milliseconds: 1500));

      state = state.copyWith(
        isConnecting: false,
        googleConnected: true,
        snackBarMessage: 'Google Calendar connected! Setting up your profile...',
      );

      await Future.delayed(const Duration(seconds: 1));
      handleNext();
    } catch (e) {
      state = state.copyWith(
        isConnecting: false,
        snackBarMessage: 'Failed to connect: $e',
      );
    }
  }

  bool get canProceed {
    switch (state.currentStep) {
      case 0:
        return state.googleConnected;
      case 5:
        return state.invitePartnersLater || state.selectedPartnerIds.isNotEmpty;
      default:
        return true;
    }
  }

  void handleNext() {
    if (!canProceed) {
      final message = state.currentStep == 0
          ? 'Please connect your Google Calendar to continue.'
          : 'Select at least one partner or choose to skip for now.';
      state = state.copyWith(snackBarMessage: message);
      return;
    }

    if (state.currentStep == 3 && state.invitePartnersLater) {
      _skipInvitesForNow();
      return;
    }

    if (state.currentStep == 4 && state.invitePartnersLater) {
      _skipInvitesForNow();
      return;
    }

    if (state.currentStep == _totalSteps - 1) {
      _completeOnboarding();
      return;
    }

    final nextStep = state.currentStep + 1;
    goToStep(nextStep);
  }

  void handleBack() {
    if (state.currentStep == 0) {
      state = state.copyWith(navigationRoute: '/');
      return;
    }

    goToStep(state.currentStep - 1);
  }

  void goToStep(int step) {
    final target = step.clamp(0, _totalSteps - 1);
    state = state.copyWith(currentStep: target);
  }

  void _skipInvitesForNow() {
    state = state.copyWith(
      invitePartnersLater: true,
      selectedPartnerIds: {},
      snackBarMessage: 'You can invite partners anytime from People.',
    );
    goToStep(_totalSteps - 1);
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasOnboarded', true);

    state = state.copyWith(navigationRoute: '/dashboard');
  }

  void setInvitePartnersLater(bool value) {
    state = state.copyWith(invitePartnersLater: value);
    if (value) {
      state = state.copyWith(selectedPartnerIds: {});
    }
  }

  void togglePartnerSelection(String partnerId) {
    final newSet = Set<String>.from(state.selectedPartnerIds);
    if (newSet.contains(partnerId)) {
      newSet.remove(partnerId);
    } else {
      newSet.add(partnerId);
    }
    state = state.copyWith(selectedPartnerIds: newSet);
  }

  void setInviteMethod(InviteMethod method) {
    state = state.copyWith(inviteMethod: method);
  }

  void setAllowContactAccess(bool value) {
    state = state.copyWith(allowContactAccess: value);
    if (!value) {
      state = state.copyWith(selectedPartnerIds: {});
    }
  }

  void clearSnackBarMessage() {
    state = state.copyWith(snackBarMessage: null);
  }

  void clearNavigationRoute() {
    state = state.copyWith(navigationRoute: null);
  }
}

class OnboardingState {
  const OnboardingState({
    this.currentStep = 0,
    this.isConnecting = false,
    this.googleConnected = false,
    this.invitePartnersLater = false,
    this.allowContactAccess = true,
    this.selectedPartnerIds = const {},
    this.inviteMethod = InviteMethod.shareLink,
    this.snackBarMessage,
    this.navigationRoute,
  });

  final int currentStep;
  final bool isConnecting;
  final bool googleConnected;
  final bool invitePartnersLater;
  final bool allowContactAccess;
  final Set<String> selectedPartnerIds;
  final InviteMethod inviteMethod;
  final String? snackBarMessage;
  final String? navigationRoute;

  OnboardingState copyWith({
    int? currentStep,
    bool? isConnecting,
    bool? googleConnected,
    bool? invitePartnersLater,
    bool? allowContactAccess,
    Set<String>? selectedPartnerIds,
    InviteMethod? inviteMethod,
    String? snackBarMessage,
    String? navigationRoute,
  }) {
    return OnboardingState(
      currentStep: currentStep ?? this.currentStep,
      isConnecting: isConnecting ?? this.isConnecting,
      googleConnected: googleConnected ?? this.googleConnected,
      invitePartnersLater: invitePartnersLater ?? this.invitePartnersLater,
      allowContactAccess: allowContactAccess ?? this.allowContactAccess,
      selectedPartnerIds: selectedPartnerIds ?? this.selectedPartnerIds,
      inviteMethod: inviteMethod ?? this.inviteMethod,
      snackBarMessage: snackBarMessage,
      navigationRoute: navigationRoute,
    );
  }
}

enum InviteMethod { shareLink, email, sms }
