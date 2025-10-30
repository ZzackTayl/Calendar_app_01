import 'dart:async';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Lightweight wrapper around Firebase Analytics to centralize instrumentation
/// and guard calls when analytics is disabled or Firebase is unavailable.
class AnalyticsService {
  AnalyticsService._();

  static FirebaseAnalytics? _analytics;
  static FirebaseAnalyticsObserver? _observer;
  static bool _collectionEnabled = false;

  /// Initializes Firebase Analytics if Firebase is ready. Safe to call multiple
  /// times – subsequent calls become no-ops.
  static Future<void> initialize({bool enableCollection = true}) async {
    if (_analytics != null) {
      return;
    }

    if (Firebase.apps.isEmpty) {
      if (kDebugMode) {
        debugPrint(
          '[AnalyticsService] Firebase not initialized – skipping analytics setup.',
        );
      }
      return;
    }

    try {
      final analytics = FirebaseAnalytics.instance;
      await analytics.setAnalyticsCollectionEnabled(enableCollection);
      _analytics = analytics;
      _observer = FirebaseAnalyticsObserver(analytics: analytics);
      _collectionEnabled = enableCollection;

      if (kDebugMode) {
        debugPrint('[AnalyticsService] Analytics initialized (enabled: $enableCollection).');
      }
    } catch (error, stackTrace) {
      debugPrint('[AnalyticsService] Failed to initialize analytics: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  /// Navigator observers used by GoRouter / Navigator for automatic screen_view
  /// tracking. Returns an empty list if analytics is not active.
  static List<NavigatorObserver> get navigatorObservers {
    final observer = _observer;
    if (observer == null) {
      return const [];
    }
    return <NavigatorObserver>[observer];
  }

  /// Logs a structured app launch event to capture boot context.
  static Future<void> logAppLaunch({
    required bool hasCompletedOnboarding,
    required bool isAuthenticated,
  }) async {
    await _logEvent(
      name: 'app_launch',
      parameters: <String, Object?>{
        'onboarded': hasCompletedOnboarding,
        'authenticated': isAuthenticated,
      },
    );
  }

  /// Emits a generic bloc event payload for high level observability in
  /// production. Event names are sanitized to respect Firebase constraints.
  static Future<void> logBlocEvent({
    required String blocName,
    required String eventName,
  }) async {
    await _logEvent(
      name: 'bloc_event',
      parameters: <String, Object?>{
        'bloc': _truncateParameter(_sanitizeKey(blocName)),
        'event': _truncateParameter(_sanitizeKey(eventName)),
      },
    );
  }

  /// Tracks authentication lifecycle events such as sign in/out methods.
  static Future<void> logAuthEvent({
    required String action,
    String? method,
  }) async {
    await _logEvent(
      name: 'auth_$action',
      parameters: <String, Object?>{
        if (method != null) 'method': _truncateParameter(_sanitizeKey(method)),
      },
    );
  }

  /// Tracks onboarding completion metadata for funnel analysis.
  static Future<void> logOnboardingCompleted({
    required int totalSteps,
    required bool googleConnected,
    required int invitedPartnerCount,
    required bool skippedInvites,
  }) async {
    await _logEvent(
      name: 'onboarding_completed',
      parameters: <String, Object?>{
        'steps': totalSteps,
        'google_connected': googleConnected,
        'invited_partners': invitedPartnerCount,
        'skipped_invites': skippedInvites,
      },
    );
  }

  /// Records Google Calendar connection attempts during onboarding.
  static Future<void> logOnboardingCalendarConnect({
    required bool success,
    required int calendarsDetected,
  }) async {
    await _logEvent(
      name: 'onboarding_calendar_connect',
      parameters: <String, Object?>{
        'success': success,
        'calendar_count': calendarsDetected,
      },
    );
  }

  /// Captures when the onboarding flow skips partner invites.
  static Future<void> logOnboardingInvitesSkipped() async {
    await _logEvent(name: 'onboarding_invites_skipped');
  }

  /// Utility for calendar event lifecycle events (create/update/delete).
  static Future<void> logCalendarEventAction(
    String action, {
    required String calendarId,
    required int invitedCount,
    required String privacyLevel,
    required bool recurring,
    required int durationMinutes,
  }) async {
    await _logEvent(
      name: 'calendar_event_$action',
      parameters: <String, Object?>{
        'calendar_id': _truncateParameter(_sanitizeKey(calendarId)),
        'invited_count': invitedCount,
        'privacy': _truncateParameter(_sanitizeKey(privacyLevel)),
        'recurring': recurring,
        'duration_min': durationMinutes,
      },
    );
  }

  /// Public escape hatch when bespoke analytics events are necessary.
  static Future<void> logCustomEvent(
    String name, {
    Map<String, Object?>? parameters,
  }) async {
    await _logEvent(name: name, parameters: parameters);
  }

  /// Allows manual screen_view logging when automatic observers are not used.
  static Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    final analytics = _analytics;
    if (!_collectionEnabled || analytics == null) {
      return;
    }

    try {
      await analytics.logScreenView(
        screenName: screenName,
        screenClass: screenClass,
      );
    } catch (error, stackTrace) {
      debugPrint('[AnalyticsService] Failed to log screen view: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static Future<void> _logEvent({
    required String name,
    Map<String, Object?>? parameters,
  }) async {
    final analytics = _analytics;
    if (!_collectionEnabled || analytics == null) {
      return;
    }

    final sanitizedParameters = parameters?.entries.fold<Map<String, Object>>(
      <String, Object>{},
      (map, entry) {
        final value = entry.value;
        if (value != null) {
          map[_truncateParameter(_sanitizeKey(entry.key))] = value;
        }
        return map;
      },
    );

    try {
      await analytics.logEvent(
        name: _truncateEventName(_sanitizeKey(name)),
        parameters: sanitizedParameters,
      );
    } catch (error, stackTrace) {
      debugPrint('[AnalyticsService] Failed to log event $name: $error');
      debugPrintStack(stackTrace: stackTrace);
    }
  }

  static String _sanitizeKey(String value) {
    final sanitized = value.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '_').toLowerCase();
    if (sanitized.isEmpty) {
      return 'unknown';
    }
    if (RegExp(r'^[^a-zA-Z]').hasMatch(sanitized)) {
      return 'k_$sanitized';
    }
    return sanitized;
  }

  static String _truncateEventName(String value) {
    return value.length <= 40 ? value : value.substring(0, 40);
  }

  static String _truncateParameter(String value) {
    return value.length <= 40 ? value : value.substring(0, 40);
  }
}
