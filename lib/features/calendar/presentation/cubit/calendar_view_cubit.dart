import 'dart:math' as math;

import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../domain/enums.dart';

/// State for CalendarViewCubit - manages UI state for calendar screen
class CalendarViewState {
  final DateTime selectedDate;
  final DateTime focusedDate;
  final CalendarView viewMode;
  final String? selectedConnectionFilter;

  const CalendarViewState({
    required this.selectedDate,
    required this.focusedDate,
    this.viewMode = CalendarView.month,
    this.selectedConnectionFilter,
  });

  CalendarViewState copyWith({
    DateTime? selectedDate,
    DateTime? focusedDate,
    CalendarView? viewMode,
    String? selectedConnectionFilter,
  }) {
    return CalendarViewState(
      selectedDate: selectedDate ?? this.selectedDate,
      focusedDate: focusedDate ?? this.focusedDate,
      viewMode: viewMode ?? this.viewMode,
      selectedConnectionFilter: selectedConnectionFilter ?? this.selectedConnectionFilter,
    );
  }

  /// Create initial state with today's date
  factory CalendarViewState.initial() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return CalendarViewState(
      selectedDate: today,
      focusedDate: today,
      viewMode: CalendarView.month,
    );
  }
}

/// Cubit for managing calendar view UI state
class CalendarViewCubit extends Cubit<CalendarViewState> {
  CalendarViewCubit() : super(CalendarViewState.initial());

  /// Set selected date
  void setSelectedDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    emit(state.copyWith(selectedDate: normalized));
  }

  /// Set focused date (for navigation)
  void setFocusedDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    emit(state.copyWith(focusedDate: normalized));
  }

  /// Set both selected and focused date
  void setDate(DateTime date) {
    final normalized = DateTime(date.year, date.month, date.day);
    emit(state.copyWith(
      selectedDate: normalized,
      focusedDate: normalized,
    ));
  }

  /// Reset to today
  void resetToToday() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    emit(state.copyWith(
      selectedDate: today,
      focusedDate: today,
    ));
  }

  /// Set calendar view mode
  void setViewMode(CalendarView mode) {
    emit(state.copyWith(viewMode: mode));
  }

  /// Navigate forward in current view
  void navigateForward() {
    final current = state.focusedDate;
    DateTime newFocused;
    DateTime newSelected;

    switch (state.viewMode) {
      case CalendarView.month:
        newFocused = DateTime(current.year, current.month + 1, 1);
        newSelected = DateTime(current.year, current.month + 1, 
            math.min(state.selectedDate.day, _daysInMonth(current.year, current.month + 1)));
        break;
      case CalendarView.week:
        newFocused = current.add(const Duration(days: 7));
        newSelected = state.selectedDate.add(const Duration(days: 7));
        break;
      case CalendarView.day:
        newFocused = current.add(const Duration(days: 1));
        newSelected = state.selectedDate.add(const Duration(days: 1));
        break;
    }

    emit(state.copyWith(
      focusedDate: newFocused,
      selectedDate: newSelected,
    ));
  }

  /// Navigate backward in current view
  void navigateBackward() {
    final current = state.focusedDate;
    DateTime newFocused;
    DateTime newSelected;

    switch (state.viewMode) {
      case CalendarView.month:
        newFocused = DateTime(current.year, current.month - 1, 1);
        newSelected = DateTime(current.year, current.month - 1,
            math.min(state.selectedDate.day, _daysInMonth(current.year, current.month - 1)));
        break;
      case CalendarView.week:
        newFocused = current.subtract(const Duration(days: 7));
        newSelected = state.selectedDate.subtract(const Duration(days: 7));
        break;
      case CalendarView.day:
        newFocused = current.subtract(const Duration(days: 1));
        newSelected = state.selectedDate.subtract(const Duration(days: 1));
        break;
    }

    emit(state.copyWith(
      focusedDate: newFocused,
      selectedDate: newSelected,
    ));
  }

  /// Set connection filter
  void setConnectionFilter(String? filterId) {
    emit(state.copyWith(selectedConnectionFilter: filterId));
  }

  /// Helper to get days in month
  int _daysInMonth(int year, int month) {
    if (month == 12) {
      return DateTime(year + 1, 1, 0).day;
    }
    return DateTime(year, month + 1, 0).day;
  }
}
