// Calendar Cubit following MyOrbit_CleanArch pattern

import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/user_calendar.dart';
import '../../domain/repositories/calendar_repository.dart';

/// Calendar state
class CalendarState {
  final AppStateStatus status;
  final List<UserCalendar> calendars;
  final Set<String> visibleCalendarIds;
  final String message;

  const CalendarState({
    this.status = AppStateStatus.initial,
    this.calendars = const [],
    this.visibleCalendarIds = const {'primary'},
    this.message = '',
  });

  CalendarState copyWith({
    AppStateStatus? status,
    List<UserCalendar>? calendars,
    Set<String>? visibleCalendarIds,
    String? message,
  }) {
    return CalendarState(
      status: status ?? this.status,
      calendars: calendars ?? this.calendars,
      visibleCalendarIds: visibleCalendarIds ?? this.visibleCalendarIds,
      message: message ?? this.message,
    );
  }
}

/// Calendar Cubit for managing calendar state
class CalendarCubit extends Cubit<CalendarState> {
  final CalendarRepository repository;

  CalendarCubit({required this.repository}) : super(const CalendarState());

  /// Load all calendars
  Future<void> loadCalendars() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.getCalendars();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load calendars: ${failure.message}',
          name: 'CalendarCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (calendars) {
        emit(state.copyWith(
          status: AppStateStatus.success,
          calendars: calendars,
        ));
        // Also load visible calendar IDs
        _loadVisibleCalendarIds();
      },
    );
  }

  /// Load visible calendar IDs
  Future<void> _loadVisibleCalendarIds() async {
    final result = await repository.getVisibleCalendarIds();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load visible calendar IDs: ${failure.message}',
          name: 'CalendarCubit',
        );
      },
      (ids) {
        emit(state.copyWith(visibleCalendarIds: ids));
      },
    );
  }

  /// Create a new calendar
  Future<void> createCalendar(UserCalendar calendar) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.createCalendar(calendar);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (created) {
        final updated = [...state.calendars, created];
        emit(state.copyWith(
          status: AppStateStatus.success,
          calendars: updated,
          message: 'Calendar created successfully',
        ));
      },
    );
  }

  /// Update an existing calendar
  Future<void> updateCalendar(UserCalendar calendar) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.updateCalendar(calendar);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (updated) {
        final calendars = state.calendars.map((c) {
          return c.id == updated.id ? updated : c;
        }).toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          calendars: calendars,
          message: 'Calendar updated successfully',
        ));
      },
    );
  }

  /// Delete a calendar
  Future<void> deleteCalendar(String calendarId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.deleteCalendar(calendarId);
    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        final calendars =
            state.calendars.where((c) => c.id != calendarId).toList();
        emit(state.copyWith(
          status: AppStateStatus.success,
          calendars: calendars,
          message: 'Calendar deleted successfully',
        ));
      },
    );
  }

  /// Toggle calendar visibility
  Future<void> toggleCalendarVisibility(String calendarId) async {
    final newVisibleIds = Set<String>.from(state.visibleCalendarIds);
    if (newVisibleIds.contains(calendarId)) {
      newVisibleIds.remove(calendarId);
    } else {
      newVisibleIds.add(calendarId);
    }

    // Optimistically update UI
    emit(state.copyWith(visibleCalendarIds: newVisibleIds));

    // Save to backend
    final result = await repository.updateVisibleCalendarIds(newVisibleIds);
    result.fold(
      (failure) {
        developer.log(
          'Failed to update visible calendars: ${failure.message}',
          name: 'CalendarCubit',
        );
        // Revert on failure
        emit(state.copyWith(visibleCalendarIds: state.visibleCalendarIds));
      },
      (_) {
        // Success - already updated optimistically
      },
    );
  }

  /// Set visible calendar IDs
  Future<void> setVisibleCalendarIds(Set<String> calendarIds) async {
    // Optimistically update UI
    emit(state.copyWith(visibleCalendarIds: calendarIds));

    // Save to backend
    final result = await repository.updateVisibleCalendarIds(calendarIds);
    result.fold(
      (failure) {
        developer.log(
          'Failed to update visible calendars: ${failure.message}',
          name: 'CalendarCubit',
        );
        // Revert on failure
        emit(state.copyWith(visibleCalendarIds: state.visibleCalendarIds));
      },
      (_) {
        // Success - already updated optimistically
      },
    );
  }

  /// Refresh calendars
  Future<void> refresh() => loadCalendars();
}

