import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../services/api_service.dart';

/// Simple provider for current user - simplified for MVP
final currentUserProvider = StateProvider<supabase.User?>((ref) {
  return SupabaseService.currentUser;
});

/// Stream provider for auth state changes
final authStateStreamProvider = StreamProvider<supabase.AuthState>((ref) {
  final stream = SupabaseService.authStateChanges;
  if (stream == null) {
    // Return empty stream if Supabase is not initialized (offline mode)
    return Stream.empty();
  }
  return stream;
});

/// Simple provider to check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

/// Auth methods - simplified for MVP
class AuthService {
  static Future<Result<void>> signInWithGoogle() async {
    return await AuthApi.signInWithGoogle();
  }

  static Future<Result<void>> signOut() async {
    return await AuthApi.signOut();
  }
}
