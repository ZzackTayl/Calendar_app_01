import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../../../core/firebase_app_services.dart';
import '../../../../logic/services/api_service.dart';

part 'calendar_sharing_state.dart';

/// Cubit for managing calendar sharing following MyOrbit_CleanArch pattern
///
/// Note: This cubit currently uses the legacy CalendarSharingApi service
/// until a proper repository is created in the clean architecture migration.
class CalendarSharingCubit extends Cubit<CalendarSharingState> {
  CalendarSharingCubit() : super(const CalendarSharingState());

  /// Send calendar share invites to contacts
  Future<void> sendShareInvites({
    required List<String> contactIds,
    required String permission,
    required bool canViewDetails,
    required bool canEditEvents,
    required bool shareAvailability,
    String? message,
  }) async {
    // Validation
    if (!FirebaseAppServices.isConfigured ||
        !FirebaseAppServices.isAuthenticated) {
      emit(state.copyWith(
        status: AppStateStatus.failure,
        message: 'Please sign in before sharing your calendar.',
      ));
      return;
    }

    if (contactIds.isEmpty) {
      emit(state.copyWith(
        status: AppStateStatus.failure,
        message: 'Select at least one contact to share with.',
      ));
      return;
    }

    emit(state.copyWith(status: AppStateStatus.loading));

    // Call the API service
    final result = await CalendarSharingApi.sendCalendarShareInvites(
      contactIds: contactIds,
      permission: permission,
      canViewDetails: canViewDetails,
      canEditEvents: canEditEvents,
      shareAvailability: shareAvailability,
      message: message,
    );

    result.when(
      success: (_) {
        developer.log(
          'Calendar share invites sent to ${contactIds.length} contacts',
          name: 'CalendarSharingCubit',
        );

        // Add to pending invites
        final updatedPending = [
          ...state.pendingInvites,
          ...contactIds,
        ];

        emit(state.copyWith(
          status: AppStateStatus.success,
          message: 'Share invites sent successfully',
          pendingInvites: updatedPending,
        ));
      },
      failure: (errorMessage, exception) {
        developer.log(
          'Failed to send calendar share invites: $errorMessage',
          name: 'CalendarSharingCubit',
          error: exception,
        );

        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: errorMessage,
        ));
      },
    );
  }

  /// Load shared calendars for the current user
  Future<void> loadSharedCalendars() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    // TODO: Implement when CalendarSharingRepository is created
    // For now, just set success with empty list
    emit(state.copyWith(
      status: AppStateStatus.success,
      sharedCalendarIds: [],
      message: '',
    ));
  }

  /// Reset state
  void reset() {
    emit(const CalendarSharingState());
  }
}
