part of 'calendar_sharing_cubit.dart';

/// State for CalendarSharingCubit following MyOrbit_CleanArch pattern
class CalendarSharingState {
  final AppStateStatus status;
  final String message;
  final List<String> sharedCalendarIds;
  final List<String> pendingInvites;

  const CalendarSharingState({
    this.status = AppStateStatus.initial,
    this.message = '',
    this.sharedCalendarIds = const [],
    this.pendingInvites = const [],
  });

  CalendarSharingState copyWith({
    AppStateStatus? status,
    String? message,
    List<String>? sharedCalendarIds,
    List<String>? pendingInvites,
  }) {
    return CalendarSharingState(
      status: status ?? this.status,
      message: message ?? this.message,
      sharedCalendarIds: sharedCalendarIds ?? this.sharedCalendarIds,
      pendingInvites: pendingInvites ?? this.pendingInvites,
    );
  }
}
