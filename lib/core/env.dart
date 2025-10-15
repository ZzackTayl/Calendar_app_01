import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static bool get _hasEnv => dotenv.isInitialized;

  static String _value(String key, {String fallback = ''}) {
    if (!_hasEnv) return fallback;
    return dotenv.env[key] ?? fallback;
  }

  // Supabase
  static String get supabaseUrl => _value('SUPABASE_URL');
  static String get supabaseAnonKey => _value('SUPABASE_ANON_KEY');

  // Firebase
  static String get fcmServerKey => _value('FCM_SERVER_KEY');

  // Google OAuth
  static String get googleOAuthClientIdIos =>
      _value('GOOGLE_OAUTH_CLIENT_ID_IOS');
  static String get googleOAuthClientIdAndroid =>
      _value('GOOGLE_OAUTH_CLIENT_ID_ANDROID');

  // Apple Sign-In
  static String get appleServicesId => _value('APPLE_SERVICES_ID');

  // Sentry
  static String get sentryDsn => _value('SENTRY_DSN');
  static String get sentryEnv => _value('SENTRY_ENV', fallback: 'development');
  static String get sentryRelease =>
      _value('SENTRY_RELEASE', fallback: 'myorbit@1.0.0+1');

  // Twilio (for future SMS features)
  static String get twilioAccountSid => _value('TWILIO_ACCOUNT_SID');
  static String get twilioAuthToken => _value('TWILIO_AUTH_TOKEN');

  static bool get isProduction => sentryEnv == 'production';
  static bool get isDevelopment => sentryEnv == 'development';
}
