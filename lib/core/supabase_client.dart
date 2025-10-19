import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'env.dart';

class SupabaseService {
  static SupabaseClient? _client;
  static bool? _configuredOverride;
  static bool? _authenticatedOverride;

  static SupabaseClient? get client => _client;

  static SupabaseClient get clientOrThrow {
    if (_client == null) {
      throw Exception('Supabase client not initialized. Running in offline mode.');
    }
    return _client!;
  }

  static bool get isConfigured => _configuredOverride ?? _client != null;

  static Future<void> initialize() async {
    // Skip Supabase initialization if credentials are not configured
    // This allows the app to run in development mode without Supabase
    if (Env.supabaseUrl.isEmpty ||
        Env.supabaseUrl.contains('your') ||
        Env.supabaseAnonKey.isEmpty ||
        Env.supabaseAnonKey.contains('your')) {
      debugPrint('⚠️  Supabase not configured - running in offline mode');
      return;
    }

    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      debug: Env.isDevelopment,
    );
    _client = Supabase.instance.client;
  }

  static User? get currentUser => _client?.auth.currentUser;

  static bool get isAuthenticated => _authenticatedOverride ?? currentUser != null;

  static Stream<AuthState>? get authStateChanges => _client?.auth.onAuthStateChange;

  @visibleForTesting
  static void debugOverrideAuthState({bool? isConfigured, bool? isAuthenticated}) {
    _configuredOverride = isConfigured;
    _authenticatedOverride = isAuthenticated;
  }

  @visibleForTesting
  static void debugResetAuthOverride() {
    _configuredOverride = null;
    _authenticatedOverride = null;
  }
}
