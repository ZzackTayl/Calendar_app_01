import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/supabase_client.dart';
import '../services/api_service.dart';

part 'auth_providers.g.dart';

/// Provider for current authentication state
@riverpod
class AuthState extends _$AuthState {
  @override
  User? build() {
    // Listen to auth state changes
    ref.listen(authStateStreamProvider, (previous, next) {
      next.when(
        data: (authState) => state = authState.session?.user,
        loading: () => {},
        error: (error, stackTrace) => state = null,
      );
    });
    
    return SupabaseService.currentUser;
  }

  /// Sign in with Google
  Future<void> signInWithGoogle() async {
    try {
      await AuthApi.signInWithGoogle();
      state = SupabaseService.currentUser;
    } catch (error) {
      // Handle error - will be caught by UI
      rethrow;
    }
  }

  /// Sign out
  Future<void> signOut() async {
    try {
      await AuthApi.signOut();
      state = null;
    } catch (error) {
      // Handle error
      rethrow;
    }
  }
}

/// Stream provider for auth state changes
@riverpod
Stream<AuthState> authStateStream(AuthStateStreamRef ref) {
  return SupabaseService.authStateChanges;
}

/// Simple provider to check if user is authenticated
@riverpod
bool isAuthenticated(IsAuthenticatedRef ref) {
  final user = ref.watch(authStateProvider);
  return user != null;
}