import 'app_bootstrapper.dart';

enum BootstrapPhase { loading, ready, error }

class BootstrapState {
  const BootstrapState({
    required this.phase,
    required this.message,
    required this.completedSteps,
    required this.totalSteps,
    this.data,
    this.error,
    this.stackTrace,
  });

  const BootstrapState.loading({
    required String message,
    int completedSteps = 0,
    int totalSteps = 0,
  }) : this(
          phase: BootstrapPhase.loading,
          message: message,
          completedSteps: completedSteps,
          totalSteps: totalSteps,
        );

  final BootstrapPhase phase;
  final String message;
  final int completedSteps;
  final int totalSteps;
  final AppBootstrapData? data;
  final Object? error;
  final StackTrace? stackTrace;

  double? get progress {
    if (totalSteps == 0) {
      return null;
    }
    final safeSteps = completedSteps.clamp(0, totalSteps);
    return safeSteps / totalSteps;
  }

  BootstrapState copyWith({
    BootstrapPhase? phase,
    String? message,
    int? completedSteps,
    int? totalSteps,
    AppBootstrapData? data,
    Object? error,
    StackTrace? stackTrace,
  }) {
    return BootstrapState(
      phase: phase ?? this.phase,
      message: message ?? this.message,
      completedSteps: completedSteps ?? this.completedSteps,
      totalSteps: totalSteps ?? this.totalSteps,
      data: data ?? this.data,
      error: error ?? this.error,
      stackTrace: stackTrace ?? this.stackTrace,
    );
  }
}
