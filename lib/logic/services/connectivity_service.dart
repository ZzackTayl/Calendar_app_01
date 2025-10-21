import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

import '../../core/supabase_client.dart';
import 'sync_queue_service.dart';

/// Monitors device connectivity and processes the sync queue whenever
/// a lost connection is restored.
class ConnectivityService {
  static StreamSubscription<ConnectivityResult>? _subscription;
  static Stream<ConnectivityResult>? _streamOverride;
  static Future<ConnectivityResult> Function()? _currentStatusOverride;
  static ConnectivityResult? _lastStatusOverride;
  static ConnectivityResult? _lastStatus;
  static Future<void> Function() _processQueue = SyncQueueService.processQueue;

  static bool get _isListening => _subscription != null;

  /// Initialize connectivity monitoring. Subsequent calls are ignored unless
  /// [debugReset] is invoked (used only in tests).
  static Future<void> initialize() async {
    if (_isListening) return;

    final initialStatus = _lastStatusOverride ?? await _currentStatus();
    _lastStatus = initialStatus;

    if (_didRegainConnection(
        previous: ConnectivityResult.none, current: initialStatus)) {
      await _syncIfPossible();
    }

    final stream = _streamOverride ?? _connectivityStream();
    _subscription = stream.listen((result) async {
      final previous = _lastStatus;
      _lastStatus = result;
      if (_didRegainConnection(previous: previous, current: result)) {
        await _syncIfPossible();
      }
    });
  }

  static bool _didRegainConnection({
    required ConnectivityResult? previous,
    required ConnectivityResult? current,
  }) {
    final wasConnected =
        previous != null && previous != ConnectivityResult.none;
    final isConnected = current != null && current != ConnectivityResult.none;
    return !wasConnected && isConnected;
  }

  static Future<void> _syncIfPossible() async {
    if (!SupabaseService.isConfigured || !SupabaseService.isAuthenticated) {
      return;
    }
    await _processQueue();
  }

  static Future<ConnectivityResult> _currentStatus() async {
    if (_currentStatusOverride != null) {
      return _currentStatusOverride!();
    }
    try {
      final value = await Connectivity().checkConnectivity();
      return _normalizeResult(value);
    } catch (error) {
      debugPrint('⚠️  Unable to check connectivity: $error');
      return ConnectivityResult.none;
    }
  }

  static Stream<ConnectivityResult> _connectivityStream() {
    return Connectivity().onConnectivityChanged.map(_normalizeResult);
  }

  static ConnectivityResult _normalizeResult(dynamic value) {
    if (value is ConnectivityResult) {
      return value;
    }
    if (value is List<ConnectivityResult>) {
      if (value.isEmpty) {
        return ConnectivityResult.none;
      }
      return value.firstWhere(
        (element) => element != ConnectivityResult.none,
        orElse: () => value.first,
      );
    }
    return ConnectivityResult.none;
  }

  /// Cancel connectivity monitoring. Primarily used in tests.
  static Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
  }

  @visibleForTesting
  static void debugOverride({
    Stream<ConnectivityResult>? stream,
    ConnectivityResult? initialStatus,
    Future<ConnectivityResult> Function()? currentStatus,
  }) {
    _streamOverride = stream;
    _lastStatusOverride = initialStatus;
    _currentStatusOverride = currentStatus;
  }

  @visibleForTesting
  static void debugSetProcessQueueHandler(Future<void> Function() handler) {
    _processQueue = handler;
  }

  @visibleForTesting
  static Future<void> debugReset() async {
    await dispose();
    _streamOverride = null;
    _lastStatusOverride = null;
    _lastStatus = null;
    _currentStatusOverride = null;
    _processQueue = SyncQueueService.processQueue;
  }
}
