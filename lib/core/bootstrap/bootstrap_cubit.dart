import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import 'app_bootstrapper.dart';
import 'bootstrap_status.dart';

class BootstrapCubit extends Cubit<BootstrapState> {
  BootstrapCubit({AppBootstrapper? bootstrapper})
      : _bootstrapper = bootstrapper ?? const AppBootstrapper(),
        super(const BootstrapState.loading(message: 'Preparing services...')) {
    _run();
  }

  final AppBootstrapper _bootstrapper;
  bool _isRunning = false;

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
          emit(
            state.copyWith(
              phase: BootstrapPhase.loading,
              message: progress.message,
              completedSteps: progress.step,
              totalSteps: progress.totalSteps,
              error: null,
              stackTrace: null,
            ),
          );
        },
      );

      final resolvedTotal = totalSteps == 0 ? lastStep : totalSteps;
      emit(
        state.copyWith(
          phase: BootstrapPhase.ready,
          message: 'Ready',
          completedSteps: resolvedTotal,
          totalSteps: resolvedTotal,
          data: data,
          error: null,
          stackTrace: null,
        ),
      );
    } catch (error, stackTrace) {
      debugPrint('❌ Bootstrap failed: $error');
      emit(
        state.copyWith(
          phase: BootstrapPhase.error,
          message: 'Bootstrap failed',
          error: error,
          stackTrace: stackTrace,
        ),
      );
    } finally {
      _isRunning = false;
    }
  }

  void retry() {
    if (_isRunning) {
      return;
    }
    emit(const BootstrapState.loading(
      message: 'Retrying bootstrap...',
      completedSteps: 0,
      totalSteps: 0,
    ));
    _run();
  }
}


