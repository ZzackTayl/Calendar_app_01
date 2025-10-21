import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../core/timezone_service.dart';
import 'settings_providers.dart';

part 'ui_state_providers.g.dart';

/// Enum for calendar view modes
enum CalendarView { month, week, day }

DateTime _todayFromSettings(AsyncValue<SettingsState> settingsAsync) {
  DateTime fallback() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  return settingsAsync.maybeWhen(
    data: (settings) {
      try {
        final nowInZone = TimezoneService.nowIn(settings.timeZone);
        return DateTime(nowInZone.year, nowInZone.month, nowInZone.day);
      } catch (_) {
        return fallback();
      }
    },
    orElse: fallback,
  );
}

/// Provider for the currently selected date in the calendar
///
/// This is used across calendar views to maintain the selected date state.
/// Defaults to the current date.
@riverpod
class SelectedDate extends _$SelectedDate {
  @override
  DateTime build() {
    final settingsAsync = ref.watch(settingsControllerProvider);
    return _todayFromSettings(settingsAsync);
  }

  /// Update the selected date
  void setDate(DateTime date) {
    state = date;
  }

  /// Reset to today's date
  void resetToToday() {
    final settingsAsync = ref.read(settingsControllerProvider);
    state = _todayFromSettings(settingsAsync);
  }
}

/// Provider for the focused date in the calendar (for month navigation)
///
/// This tracks which month/week/day is currently being viewed,
/// which may be different from the selected date.
@riverpod
class FocusedDate extends _$FocusedDate {
  @override
  DateTime build() {
    final settingsAsync = ref.watch(settingsControllerProvider);
    return _todayFromSettings(settingsAsync);
  }

  /// Update the focused date
  void setDate(DateTime date) {
    state = date;
  }

  /// Navigate to next month
  void nextMonth() {
    state = DateTime(state.year, state.month + 1, 1);
  }

  /// Navigate to previous month
  void previousMonth() {
    state = DateTime(state.year, state.month - 1, 1);
  }

  /// Navigate to next week
  void nextWeek() {
    state = state.add(const Duration(days: 7));
  }

  /// Navigate to previous week
  void previousWeek() {
    state = state.subtract(const Duration(days: 7));
  }

  /// Navigate to next day
  void nextDay() {
    state = state.add(const Duration(days: 1));
  }

  /// Navigate to previous day
  void previousDay() {
    state = state.subtract(const Duration(days: 1));
  }

  /// Reset to today
  void resetToToday() {
    final settingsAsync = ref.read(settingsControllerProvider);
    state = _todayFromSettings(settingsAsync);
  }
}

/// Provider for the current calendar view mode (month/week/day)
///
/// Controls which calendar view is currently displayed.
/// Defaults to month view.
@riverpod
class CalendarViewMode extends _$CalendarViewMode {
  @override
  CalendarView build() {
    return CalendarView.month;
  }

  /// Set the calendar view mode
  void setView(CalendarView view) {
    state = view;
  }

  /// Toggle between views
  void toggleView() {
    state = switch (state) {
      CalendarView.month => CalendarView.week,
      CalendarView.week => CalendarView.day,
      CalendarView.day => CalendarView.month,
    };
  }
}

/// Provider for the current bottom navigation tab index
///
/// Manages which tab is currently selected in the app shell.
/// Tabs: 0=Home, 1=Calendar, 2=Activity, 3=People
@riverpod
class CurrentTab extends _$CurrentTab {
  @override
  int build() {
    return 0; // Default to Home tab
  }

  /// Set the current tab
  void setTab(int index) {
    if (index >= 0 && index <= 3) {
      state = index;
    }
  }

  /// Navigate to Home tab
  void goToHome() => state = 0;

  /// Navigate to Calendar tab
  void goToCalendar() => state = 1;

  /// Navigate to Activity tab
  void goToActivity() => state = 2;

  /// Navigate to People tab
  void goToPeople() => state = 3;
}

/// Provider for unread notification count
///
/// Tracks the number of unread notifications for the activity badge.
/// This should be updated when notifications are read or new ones arrive.
@riverpod
class NotificationBadgeCount extends _$NotificationBadgeCount {
  @override
  int build() {
    // In a real app, this would fetch from a service or database
    // For now, return 0 as default
    return 0;
  }

  /// Set the notification count
  void setCount(int count) {
    state = count >= 0 ? count : 0;
  }

  /// Increment the count
  void increment() {
    state = state + 1;
  }

  /// Decrement the count
  void decrement() {
    if (state > 0) {
      state = state - 1;
    }
  }

  /// Clear all notifications
  void clear() {
    state = 0;
  }

  /// Mark notifications as read
  void markAsRead(int count) {
    state = (state - count).clamp(0, double.infinity).toInt();
  }
}

/// Provider for onboarding step tracking
///
/// Tracks the current step in the onboarding flow.
/// Steps: 0=Welcome, 1=Syncing, 2=Setup, 3=Complete
@riverpod
class OnboardingStep extends _$OnboardingStep {
  @override
  int build() {
    return 0; // Start at welcome step
  }

  /// Set the current step
  void setStep(int step) {
    if (step >= 0 && step <= 3) {
      state = step;
    }
  }

  /// Move to next step
  void nextStep() {
    if (state < 3) {
      state = state + 1;
    }
  }

  /// Move to previous step
  void previousStep() {
    if (state > 0) {
      state = state - 1;
    }
  }

  /// Check if on last step
  bool get isLastStep => state == 3;

  /// Check if on first step
  bool get isFirstStep => state == 0;

  /// Reset to first step
  void reset() {
    state = 0;
  }
}

/// Provider for Google Calendar connection status
///
/// Tracks whether the user has connected their Google Calendar.
@riverpod
class GoogleConnectionStatus extends _$GoogleConnectionStatus {
  @override
  bool build() {
    return false; // Not connected by default
  }

  /// Set connection status
  void setConnected(bool connected) {
    state = connected;
  }

  /// Mark as connected
  void connect() {
    state = true;
  }

  /// Mark as disconnected
  void disconnect() {
    state = false;
  }
}

/// Provider for loading states across the app
///
/// Tracks various loading states for UI feedback.
@riverpod
class LoadingState extends _$LoadingState {
  @override
  Map<String, bool> build() {
    return {};
  }

  /// Set loading state for a specific key
  void setLoading(String key, bool isLoading) {
    state = {...state, key: isLoading};
  }

  /// Check if a specific key is loading
  bool isLoading(String key) {
    return state[key] ?? false;
  }

  /// Clear loading state for a key
  void clearLoading(String key) {
    final newState = Map<String, bool>.from(state);
    newState.remove(key);
    state = newState;
  }

  /// Clear all loading states
  void clearAll() {
    state = {};
  }
}
