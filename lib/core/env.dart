import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  static bool get _hasEnv => dotenv.isInitialized;

  static String _value(String key, {String fallback = ''}) {
    if (!_hasEnv) return fallback;
    return dotenv.env[key] ?? fallback;
  }

  // Environment configuration
  static String get flutterEnv => _value('FLUTTER_ENV', fallback: 'dev');
  
  // Supabase - environment-specific URLs and keys
  static String get supabaseUrl {
    switch (flutterEnv) {
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
    switch (flutterEnv) {
      case 'prod':
        return _value('PROD_SUPABASE_ANON_KEY');
      case 'staging':
        return _value('STAGING_SUPABASE_ANON_KEY');
      case 'dev':
      default:
        return _value('DEV_SUPABASE_ANON_KEY');
    }
  }

  // Firebase
  static String get fcmServerKey => _value('FCM_SERVER_KEY');

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
  static String get twilioPhoneNumber => _value('TWILIO_PHONE_NUMBER');

  // Environment checks based on FLUTTER_ENV
  static bool get isProduction => flutterEnv == 'prod' || sentryEnv == 'production';
  static bool get isStaging => flutterEnv == 'staging';
  static bool get isDevelopment => flutterEnv == 'dev' || sentryEnv == 'development';
  
  // Get the current environment name for display/debugging
  static String get currentEnvironment => flutterEnv;
}
