import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/supabase_client.dart';
import '../services/api_service.dart';

part 'onboarding_provider.g.dart';

@riverpod
class OnboardingNotifier extends _$OnboardingNotifier {
  @override
  OnboardingState build() {
    return const OnboardingState();
  }

  static const int totalSteps = 7;
  static const int _totalSteps = totalSteps;

  void setCurrentStep(int step) {
    state = state.copyWith(currentStep: step);
  }

  Future<void> connectGoogleCalendar() async {
    if (state.isConnecting) return;
    state = state.copyWith(isConnecting: true);

    try {
      if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
        await Future.delayed(const Duration(milliseconds: 800));
        state = state.copyWith(
          isConnecting: false,
          googleConnected: true,
          snackBarMessage:
              'Connected in offline preview mode. Supabase credentials not detected.',
        );
        await Future.delayed(const Duration(milliseconds: 600));
        handleNext();
        return;
      }

      final calendarsResult = await CalendarApi.getCalendars();
      await calendarsResult.when(
        success: (calendars) async {
          state = state.copyWith(
            isConnecting: false,
            googleConnected: calendars.isNotEmpty,
            snackBarMessage: calendars.isNotEmpty
                ? 'Google Calendar connected successfully!'
                : 'No calendars found. You can connect more later from Settings.',
          );
          await Future.delayed(const Duration(milliseconds: 600));
          handleNext();
        },
        failure: (message, exception) async {
          state = state.copyWith(
            isConnecting: false,
            googleConnected: false,
            snackBarMessage: message.isEmpty
                ? 'Failed to connect calendars. Please try again.'
                : message,
          );
        },
      );
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
      case 4:
        return state.invitePartnersLater || state.selectedPartnerIds.isNotEmpty;
      case 5:
        if (state.invitePartnersLater || state.selectedPartnerIds.isEmpty) {
          return true;
        }
        return state.selectedPartnerIds
            .every((id) => state.partnerInviteModes.containsKey(id));
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

    if (state.invitePartnersLater &&
        state.currentStep >= 2 &&
        state.currentStep <= 5) {
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
      partnerInviteModes: {},
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
      state = state.copyWith(
        selectedPartnerIds: {},
        partnerInviteModes: {},
      );
    }
  }

  void togglePartnerSelection(String partnerId) {
    final newSet = Set<String>.from(state.selectedPartnerIds);
    if (newSet.contains(partnerId)) {
      newSet.remove(partnerId);
      final newModes =
          Map<String, PartnerInviteMode>.from(state.partnerInviteModes)
            ..remove(partnerId);
      state = state.copyWith(
        selectedPartnerIds: newSet,
        partnerInviteModes: newModes,
      );
      return;
    } else {
      newSet.add(partnerId);
    }
    state = state.copyWith(selectedPartnerIds: newSet);
  }

  void setPartnerInviteMode(String partnerId, PartnerInviteMode? mode) {
    final updatedModes =
        Map<String, PartnerInviteMode>.from(state.partnerInviteModes);
    if (mode == null) {
      updatedModes.remove(partnerId);
    } else {
      updatedModes[partnerId] = mode;
    }
    state = state.copyWith(partnerInviteModes: updatedModes);
  }

  void setAllowContactAccess(bool value) {
    state = state.copyWith(allowContactAccess: value);
    if (!value) {
      state = state.copyWith(
        selectedPartnerIds: {},
        partnerInviteModes: {},
      );
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
    this.partnerInviteModes = const {},
    this.snackBarMessage,
    this.navigationRoute,
  });

  final int currentStep;
  final bool isConnecting;
  final bool googleConnected;
  final bool invitePartnersLater;
  final bool allowContactAccess;
  final Set<String> selectedPartnerIds;
  final Map<String, PartnerInviteMode> partnerInviteModes;
  final String? snackBarMessage;
  final String? navigationRoute;

  OnboardingState copyWith({
    int? currentStep,
    bool? isConnecting,
    bool? googleConnected,
    bool? invitePartnersLater,
    bool? allowContactAccess,
    Set<String>? selectedPartnerIds,
    Map<String, PartnerInviteMode>? partnerInviteModes,
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
      partnerInviteModes: partnerInviteModes ?? this.partnerInviteModes,
      snackBarMessage: snackBarMessage,
      navigationRoute: navigationRoute,
    );
  }
}

enum PartnerInviteMode { referenceContact, appInvitation }
