import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../services/api_service.dart';

part 'auth_providers.g.dart';

class AuthOfflineException implements Exception {
  AuthOfflineException(this.message);
  final String message;

  @override
  String toString() => message;
}

@riverpod
class AuthController extends _$AuthController {
  @override
  AsyncValue<void> build() {
    // Keep the currentUser provider in sync with Supabase auth changes.
    ref.listen<AsyncValue<supabase.AuthState>>(
      authStateStreamProvider,
      (previous, next) {
        final authState = next.value;
        if (authState == null) {
          return;
        }

        final session = authState.session;
        ref.read(currentUserProvider.notifier).setUser(session?.user);
      },
    );

    return const AsyncValue.data(null);
  }

  Future<Result<void>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    if (!SupabaseService.isConfigured) {
      final message =
          'Supabase credentials are not configured. Connect the app to Supabase before signing in.';
      final exception = AuthOfflineException(message);
      state = AsyncValue.error(exception, StackTrace.current);
      return Failure(message, exception);
    }

    state = const AsyncValue.loading();
    try {
      final result = await AuthApi.signInWithEmail(email, password);
      return await result.when(
        success: (response) async {
          final user = response.user;
          ref.read(currentUserProvider.notifier).setUser(user);
          state = const AsyncValue.data(null);
          return const Success(null);
        },
        failure: (message, exception) async {
          state = AsyncValue.error(
            exception ?? Exception(message),
            StackTrace.current,
          );
          return Failure(message, exception);
        },
      );
    } catch (error, stack) {
      state = AsyncValue.error(error, stack);
      return Failure(error.toString(), error as Exception?);
    }
  }

  Future<Result<void>> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    if (!SupabaseService.isConfigured) {
      final message =
          'Supabase credentials are not configured. Connect the app to Supabase before creating an account.';
      final exception = AuthOfflineException(message);
      state = AsyncValue.error(exception, StackTrace.current);
      return Failure(message, exception);
    }

    state = const AsyncValue.loading();
    try {
      final result = await AuthApi.signUpWithEmail(email, password);
      return await result.when(
        success: (response) async {
          final user = response.user;
          ref.read(currentUserProvider.notifier).setUser(user);
          state = const AsyncValue.data(null);
          return const Success(null);
        },
        failure: (message, exception) async {
          state = AsyncValue.error(
            exception ?? Exception(message),
            StackTrace.current,
          );
          return Failure(message, exception);
        },
      );
    } catch (error, stack) {
      state = AsyncValue.error(error, stack);
      return Failure(error.toString(), error as Exception?);
    }
  }

  Future<Result<void>> signOut() async {
    if (!SupabaseService.isConfigured) {
      return const Success(null);
    }

    state = const AsyncValue.loading();
    try {
      final result = await AuthService.signOut();
      return await result.when(
        success: (_) async {
          ref.read(currentUserProvider.notifier).setUser(null);
          state = const AsyncValue.data(null);
          return const Success(null);
        },
        failure: (message, exception) async {
          state = AsyncValue.error(
            exception ?? Exception(message),
            StackTrace.current,
          );
          return Failure(message, exception);
        },
      );
    } catch (error, stack) {
      state = AsyncValue.error(error, stack);
      return Failure(error.toString(), error as Exception?);
    }
  }
}

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
