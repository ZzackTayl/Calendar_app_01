import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:system_time_change_detector/system_time_change_detector.dart';
import '../../core/timezone_service.dart';
import '../providers/settings_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Service for automatic timezone detection and travel updates
class TimezoneDetectionService {
  TimezoneDetectionService._();

  static final TimezoneDetectionService _instance = TimezoneDetectionService._();
  static TimezoneDetectionService get instance => _instance;

  SystemTimeChangeDetector? _detector;
  Timer? _periodicCheck;
  String? _lastKnownTimezone;
  bool _isMonitoring = false;

  /// Start monitoring for timezone changes (e.g., when user travels)
  void startMonitoring(WidgetRef ref) {
    if (_isMonitoring) return;

    _isMonitoring = true;
    _lastKnownTimezone = TimezoneDetection.getDeviceTimezone();

    // Auto-update timezone on startup if needed
    autoUpdateTimezoneIfNeeded(ref);

    // Set up system time change detector
    _detector = SystemTimeChangeDetector();
    _detector!.getSystemTimeChange(() {
      _handleTimezoneChange(ref);
    });

    // Also check periodically in case the system detector doesn't catch everything
    _periodicCheck = Timer.periodic(const Duration(minutes: 5), (_) {
      _checkForTimezoneChange(ref);
    });

    debugPrint('TimezoneDetectionService: Started monitoring for timezone changes');
  }

  /// Stop monitoring for timezone changes
  void stopMonitoring() {
    if (!_isMonitoring) return;

    _isMonitoring = false;
    // Note: SystemTimeChangeDetector doesn't have a dispose method
    // The detector will be garbage collected when the service is disposed
    _detector = null;
    _periodicCheck?.cancel();
    _periodicCheck = null;

    debugPrint('TimezoneDetectionService: Stopped monitoring for timezone changes');
  }

  /// Handle timezone change detection
  void _handleTimezoneChange(WidgetRef ref) {
    debugPrint('TimezoneDetectionService: System time change detected');
    _checkForTimezoneChange(ref);
  }

  /// Check if timezone has changed and update if necessary
  void _checkForTimezoneChange(WidgetRef ref) {
    final currentTimezone = TimezoneDetection.getDeviceTimezone();

    if (_lastKnownTimezone != currentTimezone) {
      debugPrint(
          'TimezoneDetectionService: Timezone changed from $_lastKnownTimezone to $currentTimezone');
      _lastKnownTimezone = currentTimezone;
      _updateUserTimezone(ref, currentTimezone);
    }
  }

  /// Update user's timezone setting
  void _updateUserTimezone(WidgetRef ref, String newTimezone) {
    try {
      final settingsController = ref.read(settingsControllerProvider.notifier);
      final normalized = TimezoneService.normalizeDisplayName(newTimezone);
      settingsController.setTimeZone(normalized);
      debugPrint('TimezoneDetectionService: Updated user timezone to $normalized');
    } catch (e) {
      debugPrint('TimezoneDetectionService: Failed to update timezone: $e');
    }
  }

  /// Get current device timezone with description
  String getCurrentDeviceTimezoneDescription() {
    return TimezoneDetection.getDeviceTimezoneDescription();
  }

  /// Check if user's current setting matches device timezone
  bool isUserTimezoneCurrent(WidgetRef ref) {
    final settingsAsync = ref.read(settingsControllerProvider);
    return settingsAsync.when(
      data: (settings) => TimezoneDetection.isDeviceTimezone(settings.timeZone),
      loading: () => false,
      error: (_, __) => false,
    );
  }

  /// Automatically update to device timezone if different (no manual suggestion needed)
  void autoUpdateTimezoneIfNeeded(WidgetRef ref) {
    final settingsAsync = ref.read(settingsControllerProvider);
    settingsAsync.when(
      data: (settings) {
        final deviceTz = TimezoneDetection.getDeviceTimezone();
        final normalized = TimezoneService.normalizeDisplayName(deviceTz);
        final current = TimezoneService.normalizeDisplayName(settings.timeZone);
        if (normalized != current) {
          debugPrint(
              'TimezoneDetectionService: Auto-updating timezone from ${settings.timeZone} to $deviceTz');
          _updateUserTimezone(ref, normalized);
        }
      },
      loading: () {},
      error: (_, __) {},
    );
  }
}

/// Provider for timezone detection service
final timezoneDetectionServiceProvider = Provider<TimezoneDetectionService>((ref) {
  return TimezoneDetectionService.instance;
});

/// Provider to check if user's timezone matches device timezone
final isUserTimezoneCurrentProvider = Provider<bool>((ref) {
  final settingsAsync = ref.watch(settingsControllerProvider);
  return settingsAsync.when(
    data: (settings) => TimezoneDetection.isDeviceTimezone(settings.timeZone),
    loading: () => false,
    error: (_, __) => false,
  );
});
