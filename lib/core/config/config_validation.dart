import 'package:flutter/foundation.dart';

import 'package:myorbit_calendar/core/config/app_config.dart';
import 'package:myorbit_calendar/core/env.dart';

/// Validate essential configuration. In prod, log loud errors if missing.
void validateCriticalConfig(AppConfig config) {
  // Supabase was removed, but keep checks for future backend toggles
  final missing = <String>[];

  // Example critical keys commonly required
  if (config.apiBaseUrl == null || config.apiBaseUrl!.isEmpty) {
    missing.add('API_BASE_URL');
  }

  // Telemetry not strictly required; warn only
  final telemetryMissing = <String>[];
  if ((config.sentryDsn == null || config.sentryDsn!.isEmpty) && Env.isProduction) {
    telemetryMissing.add('SENTRY_DSN');
  }

  if (Env.isProduction) {
    if (missing.isNotEmpty) {
      debugPrint('❌ Missing critical config in production: ${missing.join(', ')}');
    }
    if (telemetryMissing.isNotEmpty) {
      debugPrint('⚠️  Missing recommended telemetry config: ${telemetryMissing.join(', ')}');
    }
  } else {
    if (missing.isNotEmpty) {
      debugPrint('ℹ️  Missing dev config: ${missing.join(', ')}');
    }
  }
}

