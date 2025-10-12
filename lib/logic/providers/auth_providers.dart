import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/supabase_client.dart';
import '../services/api_service.dart';

/// Simple provider for current user - simplified for MVP
final currentUserProvider = StateProvider<supabase.User?>((ref) {
  return SupabaseService.currentUser;
});

/// Stream provider for auth state changes
final authStateStreamProvider = StreamProvider<supabase.AuthState>((ref) {
  return SupabaseService.authStateChanges;
});

/// Simple provider to check if user is authenticated
final isAuthenticatedProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

/// Auth methods - simplified for MVP
class AuthService {
  static Future<bool> signInWithGoogle() async {
    try {
      return await AuthApi.signInWithGoogle();
    } catch (error) {
      return false;
    }
  }

  static Future<void> signOut() async {
    try {
      await AuthApi.signOut();
    } catch (error) {
      // Handle error silently for MVP
    }
  }
}
