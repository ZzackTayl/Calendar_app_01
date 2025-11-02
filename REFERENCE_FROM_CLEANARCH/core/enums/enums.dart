part of '../config/config.dart';

/// Application state status enumeration.
///
/// Represents the various states that a feature or operation can be in.
/// This is used throughout the app to manage loading, success, and error states.
///
/// States:
/// - initial: Default state before any operation
/// - loading: Operation in progress
/// - success: Operation completed successfully
/// - failure: Operation failed with an error
///
/// Example usage:
/// ```dart
/// if (state.status == AppStateStatus.loading) {
///   return CircularProgressIndicator();
/// }
/// ```

enum AppStateStatus {
  /// Initial state - no operation has been performed yet
  initial,

  /// Loading state - operation is in progress
  loading,

  /// Success state - operation completed successfully
  success,

  /// Failure state - operation failed with an error
  failure,
}

/// Extension methods for AppStateStatus
extension AppStateStatusX on AppStateStatus {
  /// Check if the current status is initial
  bool get isInitial => this == AppStateStatus.initial;

  /// Check if the current status is loading
  bool get isLoading => this == AppStateStatus.loading;

  /// Check if the current status is success
  bool get isSuccess => this == AppStateStatus.success;

  /// Check if the current status is failure
  bool get isFailure => this == AppStateStatus.failure;
}

enum OnboardingStep {
  welcome,
  calendarSync,
  permissionsIntro,
  contactsImport,
  complete,
}

enum CalendarProvider { google, apple, none }

enum PermissionLevel { fullVisibility, partialVisibility, private }

enum ThemeStatus { initial, light, dark }
