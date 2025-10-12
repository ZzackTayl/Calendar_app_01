import 'package:flutter_dotenv/flutter_dotenv.dart';

class Env {
  // Supabase
  static String get supabaseUrl => dotenv.env['SUPABASE_URL'] ?? '';
  static String get supabaseAnonKey => dotenv.env['SUPABASE_ANON_KEY'] ?? '';
  
  // Firebase
  static String get fcmServerKey => dotenv.env['FCM_SERVER_KEY'] ?? '';
  
  // Google OAuth
  static String get googleOAuthClientIdIos => dotenv.env['GOOGLE_OAUTH_CLIENT_ID_IOS'] ?? '';
  static String get googleOAuthClientIdAndroid => dotenv.env['GOOGLE_OAUTH_CLIENT_ID_ANDROID'] ?? '';
  
  // Apple Sign-In
  static String get appleServicesId => dotenv.env['APPLE_SERVICES_ID'] ?? '';
  
  // Sentry
  static String get sentryDsn => dotenv.env['SENTRY_DSN'] ?? '';
  static String get sentryEnv => dotenv.env['SENTRY_ENV'] ?? 'development';
  static String get sentryRelease => dotenv.env['SENTRY_RELEASE'] ?? 'myorbit@1.0.0+1';
  
  // Twilio (for future SMS features)
  static String get twilioAccountSid => dotenv.env['TWILIO_ACCOUNT_SID'] ?? '';
  static String get twilioAuthToken => dotenv.env['TWILIO_AUTH_TOKEN'] ?? '';
  
  static bool get isProduction => sentryEnv == 'production';
  static bool get isDevelopment => sentryEnv == 'development';
}