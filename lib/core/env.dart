import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static bool get _hasEnv => dotenv.isInitialized;

  static String _value(String key, {String fallback = ''}) {
    if (!_hasEnv) return fallback;
    return dotenv.env[key] ?? fallback;
  }

  static bool _boolValue(String key, {bool fallback = false}) {
    final raw = _value(key, fallback: '');
    if (raw.isEmpty) {
      return fallback;
    }
    switch (raw.trim().toLowerCase()) {
      case '1':
      case 'true':
      case 'yes':
      case 'y':
      case 'on':
        return true;
      case '0':
      case 'false':
      case 'no':
      case 'n':
      case 'off':
        return false;
      default:
        return fallback;
    }
  }

  // Environment configuration
  // Supports both APP_ENV (new standard) and FLUTTER_ENV (legacy) for backwards compatibility
  static String get appEnv {
    final env = _value('APP_ENV', fallback: '');
    if (env.isNotEmpty) return env;
    return _value('FLUTTER_ENV', fallback: 'dev');
  }

  // Legacy getter for backwards compatibility - will be removed after full migration
  @Deprecated('Use appEnv instead')
  static String get flutterEnv => appEnv;

  // Supabase - environment-specific URLs and keys
  static String get supabaseUrl {
    switch (appEnv) {
      case 'prod':
        return _value('PROD_SUPABASE_URL');
      case 'staging':
        return _value('STAGING_SUPABASE_URL');
      case 'dev':
      default:
        return _value('DEV_SUPABASE_URL');
    }
  }

  static String get supabaseAnonKey {
    switch (appEnv) {
      case 'prod':
        return _value('PROD_SUPABASE_ANON_KEY');
      case 'staging':
        return _value('STAGING_SUPABASE_ANON_KEY');
      case 'dev':
      default:
        return _value('DEV_SUPABASE_ANON_KEY');
    }
  }

  // Google OAuth
  static String get googleOAuthClientIdIos =>
      _value('GOOGLE_OAUTH_CLIENT_ID_IOS');
  static String get googleOAuthClientIdAndroid =>
      _value('GOOGLE_OAUTH_CLIENT_ID_ANDROID');
  static String get deepLinkScheme =>
      _value('APP_DEEP_LINK_SCHEME', fallback: 'myorbit');
  static String get oauthRedirectUri =>
      _value('OAUTH_REDIRECT_URI', fallback: '$deepLinkScheme://callback');
  static String get passwordResetRedirectUri =>
      _value('PASSWORD_RESET_REDIRECT_URI',
          fallback: '$deepLinkScheme://reset-password');

  static String get supportEmail =>
      _value('SUPPORT_EMAIL', fallback: 'support@myorbit.app');
  static String get supportPortalUrl =>
      _value('SUPPORT_PORTAL_URL', fallback: 'https://myorbit.app/support');
  static String get discordInviteUrl =>
      _value('DISCORD_INVITE_URL', fallback: 'https://discord.gg/myorbit');
  static String get dataExportHelpUrl => _value('DATA_EXPORT_HELP_URL',
      fallback: 'https://myorbit.app/help/data-export');

  // Apple Sign-In
  static String get appleServicesId => _value('APPLE_SERVICES_ID');

  // Environment checks based on APP_ENV
  static bool get isProduction => appEnv == 'prod';
  static bool get isStaging => appEnv == 'staging';
  static bool get isDevelopment => appEnv == 'dev';

  // Get the current environment name for display/debugging
  static String get currentEnvironment => appEnv;

  // Firebase environment selection
  // Returns 'dev', 'staging', or 'prod' to select the correct firebase_options file
  static String get firebaseEnvironment => appEnv;

  static bool get analyticsEnabled {
    final override = _value('ENABLE_ANALYTICS', fallback: '');
    if (override.isNotEmpty) {
      return _boolValue('ENABLE_ANALYTICS', fallback: true);
    }

    if (isDevelopment) {
      return _boolValue('ENABLE_ANALYTICS_IN_DEV', fallback: false);
    }

    return true;
  }

  static bool get analyticsEnabledInDebug =>
      _boolValue('ENABLE_ANALYTICS_IN_DEBUG', fallback: false);

  static bool get useFirestoreDataSource =>
      _boolValue('USE_FIRESTORE_DATASOURCE', fallback: isProduction);

  static bool get useFirebaseAuth =>
      _boolValue('USE_FIREBASE_AUTH', fallback: isProduction);

  // Firebase Functions configuration
  static String get firebaseFunctionsRegion =>
      _value('FIREBASE_FUNCTIONS_REGION', fallback: 'us-central1');

  // Firebase Emulator configuration
  static bool get firebaseEmulatorsEnabled =>
      _boolValue('FIREBASE_EMULATORS_ENABLED', fallback: false);

  static String get firebaseEmulatorHost =>
      _value('FIREBASE_EMULATOR_HOST', fallback: 'localhost');

  static bool get firebaseAuthEmulatorEnabled =>
      _boolValue('FIREBASE_AUTH_EMULATOR_ENABLED',
          fallback: firebaseEmulatorsEnabled);

  static bool get firestoreEmulatorEnabled =>
      _boolValue('FIRESTORE_EMULATOR_ENABLED',
          fallback: firebaseEmulatorsEnabled);

  static bool get firebaseFunctionsEmulatorEnabled =>
      _boolValue('FIREBASE_FUNCTIONS_EMULATOR_ENABLED',
          fallback: firebaseEmulatorsEnabled);

  static bool get firebaseStorageEmulatorEnabled =>
      _boolValue('FIREBASE_STORAGE_EMULATOR_ENABLED',
          fallback: firebaseEmulatorsEnabled);

  static int get firebaseAuthEmulatorPort =>
      int.tryParse(_value('FIREBASE_AUTH_EMULATOR_PORT', fallback: '9099')) ??
      9099;

  static int get firestoreEmulatorPort =>
      int.tryParse(_value('FIRESTORE_EMULATOR_PORT', fallback: '8080')) ?? 8080;

  static int get firebaseFunctionsEmulatorPort =>
      int.tryParse(
          _value('FIREBASE_FUNCTIONS_EMULATOR_PORT', fallback: '5001')) ??
      5001;

  static int get firebaseStorageEmulatorPort =>
      int.tryParse(_value('FIREBASE_STORAGE_EMULATOR_PORT', fallback: '9199')) ??
      9199;
}
