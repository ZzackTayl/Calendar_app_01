// Calendar Cubit following MyOrbit_CleanArch pattern

import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:myorbit_calendar/core/enums/app_state_status.dart';
import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/create_calendar.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/delete_calendar.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/get_calendars.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/get_visible_calendar_ids.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/update_calendar.dart';
import 'package:myorbit_calendar/features/calendar/domain/usecases/update_visible_calendar_ids.dart';

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
  CalendarCubit({
    required GetCalendars getCalendars,
    required GetVisibleCalendarIds getVisibleCalendarIds,
    required CreateCalendar createCalendar,
    required UpdateCalendar updateCalendar,
    required DeleteCalendar deleteCalendar,
    required UpdateVisibleCalendarIds updateVisibleCalendarIds,
  })  : _getCalendars = getCalendars,
        _getVisibleCalendarIds = getVisibleCalendarIds,
        _createCalendar = createCalendar,
        _updateCalendar = updateCalendar,
        _deleteCalendar = deleteCalendar,
        _updateVisibleCalendarIds = updateVisibleCalendarIds,
        super(const CalendarState());

  final GetCalendars _getCalendars;
  final GetVisibleCalendarIds _getVisibleCalendarIds;
  final CreateCalendar _createCalendar;
  final UpdateCalendar _updateCalendar;
  final DeleteCalendar _deleteCalendar;
  final UpdateVisibleCalendarIds _updateVisibleCalendarIds;

  /// Load all calendars
  Future<void> loadCalendars() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _getCalendars();
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
    final result = await _getVisibleCalendarIds();
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

    final result = await _createCalendar(calendar);
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

    final result = await _updateCalendar(calendar);
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

    final result = await _deleteCalendar(calendarId);
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
    final result = await _updateVisibleCalendarIds(newVisibleIds);
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
    final result = await _updateVisibleCalendarIds(calendarIds);
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
