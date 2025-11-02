import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../core/enums/app_state_status.dart';
import '../../../../logic/services/api_service.dart';

/// State for CalendarSharingCubit
class CalendarSharingState {
  final AppStateStatus status;
  final String message;
  final bool isLoading;

  const CalendarSharingState({
    this.status = AppStateStatus.initial,
    this.message = '',
    this.isLoading = false,
  });

  CalendarSharingState copyWith({
    AppStateStatus? status,
    String? message,
    bool? isLoading,
  }) {
    return CalendarSharingState(
      status: status ?? this.status,
      message: message ?? this.message,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

/// Cubit for managing calendar sharing
class CalendarSharingCubit extends Cubit<CalendarSharingState> {
  CalendarSharingCubit() : super(const CalendarSharingState());

  /// Send share invites to contacts
  Future<void> sendShareInvites({
    required List<String> contactIds,
    required String permission,
    required bool canViewDetails,
    required bool canEditEvents,
    required bool shareAvailability,
    String? message,
  }) async {
    emit(state.copyWith(
      status: AppStateStatus.loading,
      isLoading: true,
    ));

    final result = await CalendarSharingApi.sendCalendarShareInvites(
      contactIds: contactIds,
      permission: permission,
      canViewDetails: canViewDetails,
      canEditEvents: canEditEvents,
      shareAvailability: shareAvailability,
      message: message,
    );

    result.when(
      success: (_) => emit(state.copyWith(
        status: AppStateStatus.success,
        isLoading: false,
        message: 'Calendar shared successfully',
      )),
      failure: (message, _) => emit(state.copyWith(
        status: AppStateStatus.failure,
        isLoading: false,
        message: message,
      )),
    );
  }

  /// Reset state
  void reset() {
    emit(const CalendarSharingState());
  }
}
