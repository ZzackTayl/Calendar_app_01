import 'dart:collection';
import 'dart:developer' as developer;

import 'package:flutter/scheduler.dart';

/// Simple frame timing monitor for debugging jank in debug/profile builds.
///
/// This hooks into [SchedulerBinding.addTimingsCallback] and logs slow frames
/// as well as rolling averages. The goal is to keep this lightweight so it can
/// remain enabled during local profiling without polluting release builds.
class FrameTimeMonitor {
  FrameTimeMonitor._();

  static FrameTimeMonitor? _instance;

  /// Singleton instance. Lazily created so tests that do not pump frames are
  /// not impacted.
  static FrameTimeMonitor get instance {
    return _instance ??= FrameTimeMonitor._();
  }

  final Queue<_FrameSample> _samples = Queue<_FrameSample>();
  late TimingsCallback _callback;
  bool _isActive = false;
  int _sampleSize = 120;
  double _jankThresholdMs = 16.0;
  int _logEvery = 60;
  int _framesSeen = 0;

  /// Starts collecting frame timings. Safe to call multiple times.
  void start({
    int sampleSize = 120,
    double jankThresholdMs = 16.0,
    int logEvery = 60,
  }) {
    if (_isActive) {
      return;
    }
    _sampleSize = sampleSize;
    _jankThresholdMs = jankThresholdMs;
    _logEvery = logEvery;

    _callback = _handleTimings;
    SchedulerBinding.instance.addTimingsCallback(_callback);
    _isActive = true;

    developer.log(
      'FrameTimeMonitor started (sampleSize=$_sampleSize, threshold=${_jankThresholdMs.toStringAsFixed(1)}ms)',
      name: 'FrameTimeMonitor',
    );
  }

  /// Stops monitoring and clears collected samples.
  void stop() {
    if (!_isActive) {
      return;
    }
    SchedulerBinding.instance.removeTimingsCallback(_callback);
    _samples.clear();
    _framesSeen = 0;
    _isActive = false;
    developer.log(
      'FrameTimeMonitor stopped',
      name: 'FrameTimeMonitor',
    );
  }

  bool get isActive => _isActive;

  void _handleTimings(List<FrameTiming> timings) {
    for (final timing in timings) {
      final buildMs = timing.buildDuration.inMicroseconds / 1000.0;
      final rasterMs = timing.rasterDuration.inMicroseconds / 1000.0;
      final totalMs = buildMs + rasterMs;
      _samples.addLast(
        _FrameSample(
          buildMs: buildMs,
          rasterMs: rasterMs,
          totalMs: totalMs,
        ),
      );
      _framesSeen++;

      while (_samples.length > _sampleSize) {
        _samples.removeFirst();
      }

      if (buildMs > _jankThresholdMs || rasterMs > _jankThresholdMs) {
        developer.log(
          'Slow frame detected (build: ${buildMs.toStringAsFixed(2)}ms, raster: ${rasterMs.toStringAsFixed(2)}ms)',
          name: 'FrameTimeMonitor',
        );
      }

      if (_framesSeen % _logEvery == 0) {
        _logRollingStats();
      }
    }
  }

  void _logRollingStats() {
    if (_samples.isEmpty) {
      return;
    }
    final buildTimes = _samples.map((s) => s.buildMs).toList();
    final rasterTimes = _samples.map((s) => s.rasterMs).toList();
    final totalTimes = _samples.map((s) => s.totalMs).toList();

    final avgBuild = _average(buildTimes);
    final avgRaster = _average(rasterTimes);
    final p95Total = _percentile(totalTimes, 95);
    final maxTotal = totalTimes.reduce((a, b) => a > b ? a : b);

    developer.log(
      'Frames: last ${_samples.length} (avg build ${avgBuild.toStringAsFixed(2)}ms, '
      'avg raster ${avgRaster.toStringAsFixed(2)}ms, p95 total ${p95Total.toStringAsFixed(2)}ms, '
      'max total ${maxTotal.toStringAsFixed(2)}ms)',
      name: 'FrameTimeMonitor',
    );
  }

  double _average(List<double> values) {
    if (values.isEmpty) {
      return 0;
    }
    final sum = values.reduce((a, b) => a + b);
    return sum / values.length;
  }

  double _percentile(List<double> values, int percentile) {
    if (values.isEmpty) {
      return 0;
    }
    final sorted = List<double>.from(values)..sort();
    final rank = ((percentile / 100) * (sorted.length - 1)).round();
    return sorted[rank];
  }
}

class _FrameSample {
  const _FrameSample({
    required this.buildMs,
    required this.rasterMs,
    required this.totalMs,
  });

  final double buildMs;
  final double rasterMs;
  final double totalMs;
}
