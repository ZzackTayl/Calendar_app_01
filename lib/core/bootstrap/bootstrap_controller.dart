import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_bootstrapper.dart';
import 'bootstrap_status.dart';

final appBootstrapperProvider = Provider<AppBootstrapper>(
  (ref) => const AppBootstrapper(),
);

final bootstrapControllerProvider =
    NotifierProvider<BootstrapController, BootstrapState>(BootstrapController.new);

class BootstrapController extends Notifier<BootstrapState> {
  late final AppBootstrapper _bootstrapper;
  bool _isRunning = false;

  @override
  BootstrapState build() {
    _bootstrapper = ref.read(appBootstrapperProvider);
    _run();
    return const BootstrapState.loading(message: 'Preparing services...');
  }

  Future<void> _run() async {
    if (_isRunning) {
      return;
    }
    _isRunning = true;
    var lastStep = 0;
    var totalSteps = state.totalSteps;
    try {
      final data = await _bootstrapper.bootstrap(
        onProgress: (progress) {
          lastStep = progress.step;
          totalSteps = progress.totalSteps;
          state = state.copyWith(
            phase: BootstrapPhase.loading,
            message: progress.message,
            completedSteps: progress.step,
            totalSteps: progress.totalSteps,
            error: null,
            stackTrace: null,
          );
        },
      );

      final resolvedTotal = totalSteps == 0 ? lastStep : totalSteps;
      state = state.copyWith(
        phase: BootstrapPhase.ready,
        message: 'Ready',
        completedSteps: resolvedTotal,
        totalSteps: resolvedTotal,
        data: data,
        error: null,
        stackTrace: null,
      );
    } catch (error, stackTrace) {
      debugPrint('❌ Bootstrap failed: $error');
      state = state.copyWith(
        phase: BootstrapPhase.error,
        message: 'Bootstrap failed',
        error: error,
        stackTrace: stackTrace,
      );
    } finally {
      _isRunning = false;
    }
  }

  void retry() {
    if (_isRunning) {
      return;
    }
    state = const BootstrapState.loading(
      message: 'Retrying bootstrap...',
      completedSteps: 0,
      totalSteps: 0,
    );
    _run();
  }
}
