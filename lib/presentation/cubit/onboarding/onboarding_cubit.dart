import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/firebase_app_services.dart';
import '../../../core/services/analytics_service.dart';
import '../../../logic/services/api_service.dart';
import '../../../logic/providers/onboarding_provider.dart' show PartnerInviteMode;

class OnboardingCubit extends Cubit<OnboardingState> {
  OnboardingCubit() : super(const OnboardingState());

  static const int totalSteps = 7;
  static const int _totalSteps = totalSteps;

  void setCurrentStep(int step) {
    emit(state.copyWith(currentStep: step));
  }

  Future<void> connectGoogleCalendar() async {
    if (state.isConnecting) return;
    emit(state.copyWith(isConnecting: true));

    try {
      if (!FirebaseAppServices.isConfigured ||
          !FirebaseAppServices.isAuthenticated) {
        await Future<void>.delayed(const Duration(milliseconds: 800));
        emit(
          state.copyWith(
            isConnecting: false,
            googleConnected: true,
            snackBarMessage:
                'Connected in offline preview mode. Firebase credentials not detected.',
          ),
        );
        unawaited(
          AnalyticsService.logOnboardingCalendarConnect(
            success: false,
            calendarsDetected: 0,
          ),
        );
        await Future<void>.delayed(const Duration(milliseconds: 600));
        handleNext();
        return;
      }

      final calendarsResult = await CalendarApi.getCalendars();
      await calendarsResult.when(
        success: (calendars) async {
          emit(
            state.copyWith(
              isConnecting: false,
              googleConnected: calendars.isNotEmpty,
              snackBarMessage: calendars.isNotEmpty
                  ? 'Google Calendar connected successfully!'
                  : 'No calendars found. You can connect more later from Settings.',
            ),
          );
          unawaited(
            AnalyticsService.logOnboardingCalendarConnect(
              success: calendars.isNotEmpty,
              calendarsDetected: calendars.length,
            ),
          );
          await Future<void>.delayed(const Duration(milliseconds: 600));
          handleNext();
        },
        failure: (message, exception) async {
          emit(
            state.copyWith(
              isConnecting: false,
              googleConnected: false,
              snackBarMessage: message.isEmpty
                  ? 'Failed to connect calendars. Please try again.'
                  : message,
            ),
          );
          unawaited(
            AnalyticsService.logOnboardingCalendarConnect(
              success: false,
              calendarsDetected: 0,
            ),
          );
        },
      );
    } catch (error) {
      emit(
        state.copyWith(
          isConnecting: false,
          snackBarMessage: 'Failed to connect: $error',
        ),
      );
      unawaited(
        AnalyticsService.logOnboardingCalendarConnect(
          success: false,
          calendarsDetected: 0,
        ),
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
      emit(state.copyWith(snackBarMessage: message));
      return;
    }

    if (state.invitePartnersLater &&
        state.currentStep >= 2 &&
        state.currentStep <= 5) {
      _skipInvitesForNow();
      return;
    }

    if (state.currentStep == _totalSteps - 1) {
      unawaited(_completeOnboarding());
      return;
    }

    final nextStep = state.currentStep + 1;
    goToStep(nextStep);
  }

  void handleBack() {
    if (state.currentStep == 0) {
      emit(state.copyWith(navigationRoute: '/'));
      return;
    }

    goToStep(state.currentStep - 1);
  }

  void goToStep(int step) {
    final target = step.clamp(0, _totalSteps - 1);
    emit(state.copyWith(currentStep: target));
  }

  void _skipInvitesForNow() {
    emit(
      state.copyWith(
        invitePartnersLater: true,
        selectedPartnerIds: {},
        partnerInviteModes: {},
        snackBarMessage: 'You can invite partners anytime from People.',
      ),
    );
    unawaited(AnalyticsService.logOnboardingInvitesSkipped());
    goToStep(_totalSteps - 1);
  }

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasOnboarded', true);

    unawaited(
      AnalyticsService.logOnboardingCompleted(
        totalSteps: totalSteps,
        googleConnected: state.googleConnected,
        invitedPartnerCount: state.selectedPartnerIds.length,
        skippedInvites: state.invitePartnersLater,
      ),
    );

    emit(state.copyWith(navigationRoute: '/dashboard'));
  }

  void setInvitePartnersLater(bool value) {
    emit(state.copyWith(invitePartnersLater: value));
    if (value) {
      emit(
        state.copyWith(
          selectedPartnerIds: {},
          partnerInviteModes: {},
        ),
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
      emit(
        state.copyWith(
          selectedPartnerIds: newSet,
          partnerInviteModes: newModes,
        ),
      );
      return;
    } else {
      newSet.add(partnerId);
    }
    emit(state.copyWith(selectedPartnerIds: newSet));
  }

  void setPartnerInviteMode(String partnerId, PartnerInviteMode? mode) {
    final updatedModes =
        Map<String, PartnerInviteMode>.from(state.partnerInviteModes);
    if (mode == null) {
      updatedModes.remove(partnerId);
    } else {
      updatedModes[partnerId] = mode;
    }
    emit(state.copyWith(partnerInviteModes: updatedModes));
  }

  void setAllowContactAccess(bool value) {
    emit(state.copyWith(allowContactAccess: value));
    if (!value) {
      emit(
        state.copyWith(
          selectedPartnerIds: {},
          partnerInviteModes: {},
        ),
      );
    }
  }

  void clearSnackBarMessage() {
    emit(state.copyWith(snackBarMessage: null));
  }

  void clearNavigationRoute() {
    emit(state.copyWith(navigationRoute: null));
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
