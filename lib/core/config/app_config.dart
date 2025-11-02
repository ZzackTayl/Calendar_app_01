import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'package:myorbit_calendar/core/env.dart';

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.sentryDsn,
    required this.analyticsEnabled,
  });

  final String environment; // dev | staging | prod
  final String? apiBaseUrl; // Optional REST API base, if used
  final String supabaseUrl;
  final String supabaseAnonKey;
  final String? sentryDsn;
  final bool analyticsEnabled;

  static AppConfig fromEnv() {
    final env = Env.currentEnvironment;
    final apiBase = _read('API_BASE_URL');
    final supabaseUrl = Env.supabaseUrl;
    final supabaseAnon = Env.supabaseAnonKey;
    final sentry = _read('SENTRY_DSN');
    final analytics = Env.analyticsEnabled && (!kDebugMode || Env.analyticsEnabledInDebug);

    return AppConfig(
      environment: env,
      apiBaseUrl: _emptyToNull(apiBase),
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnon,
      sentryDsn: _emptyToNull(sentry),
      analyticsEnabled: analytics,
    );
  }

  static String _read(String key) {
    if (!dotenv.isInitialized) return '';
    return (dotenv.env[key] ?? '').trim();
  }

  static String? _emptyToNull(String? value) {
    if (value == null) return null;
    final v = value.trim();
    return v.isEmpty ? null : v;
  }
}

