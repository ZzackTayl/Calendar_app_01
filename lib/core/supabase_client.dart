import 'package:supabase_flutter/supabase_flutter.dart';
import 'env.dart';

class SupabaseService {
  static SupabaseClient? _client;

  static SupabaseClient get client {
    if (_client == null) {
      throw Exception(
          'Supabase client not initialized. Call initialize() first.');
    }
    return _client!;
  }

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: Env.supabaseUrl,
      anonKey: Env.supabaseAnonKey,
      debug: Env.isDevelopment,
    );
    _client = Supabase.instance.client;
  }

  static User? get currentUser => client.auth.currentUser;

  static bool get isAuthenticated => currentUser != null;

  static Stream<AuthState> get authStateChanges =>
      client.auth.onAuthStateChange;
}
