import 'package:myorbit_calendar/core/config/app_config.dart';

/// Global registry for config to support non-provider code paths.
/// Prefer using Riverpod via `appConfigProvider` where possible.
class ConfigRegistry {
  static AppConfig? _config;

  static void set(AppConfig config) {
    _config = config;
  }

  static AppConfig get require {
    final value = _config;
    if (value == null) {
      throw StateError('AppConfig not initialized. Call ConfigRegistry.set() early in app startup.');
    }
    return value;
  }

  static AppConfig? get maybe => _config;
}

