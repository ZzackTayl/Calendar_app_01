// Calendar selection Cubit for UI state

import 'package:flutter_bloc/flutter_bloc.dart';

/// Simple cubit for managing selected date in calendar UI
class CalendarSelectionCubit extends Cubit<DateTime> {
  CalendarSelectionCubit() : super(DateTime.now());

  void selectDate(DateTime date) {
    emit(date);
  }

  void selectToday() {
    emit(DateTime.now());
  }

  void selectNextDay() {
    emit(state.add(const Duration(days: 1)));
  }

  void selectPreviousDay() {
    emit(state.subtract(const Duration(days: 1)));
  }
}

