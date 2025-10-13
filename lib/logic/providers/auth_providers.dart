import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../services/api_service.dart';

part 'auth_providers.g.dart';

/// Simple provider for current user - simplified for MVP
@riverpod
class CurrentUser extends _$CurrentUser {
  @override
  supabase.User? build() {
    return SupabaseService.currentUser;
  }

  void setUser(supabase.User? user) {
    state = user;
  }
}

/// Stream provider for auth state changes
@riverpod
Stream<supabase.AuthState> authStateStream(Ref ref) {
  final stream = SupabaseService.authStateChanges;
  if (stream == null) {
    // Return empty stream if Supabase is not initialized (offline mode)
    return Stream.empty();
  }
  return stream;
}

/// Simple provider to check if user is authenticated
@riverpod
bool isAuthenticated(Ref ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
}

/// Auth methods - simplified for MVP
class AuthService {
  static Future<Result<void>> signInWithGoogle() async {
    return await AuthApi.signInWithGoogle();
  }

  static Future<Result<void>> signOut() async {
    return await AuthApi.signOut();
  }
}
