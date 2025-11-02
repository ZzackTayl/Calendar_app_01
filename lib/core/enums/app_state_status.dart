// Application state status enumeration
// Following MyOrbit_CleanArch pattern

/// Represents the various states that a feature or operation can be in.
/// Used throughout the app to manage loading, success, and error states.
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

