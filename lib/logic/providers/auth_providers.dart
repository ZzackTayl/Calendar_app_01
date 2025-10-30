import 'dart:async';
import 'dart:developer' as developer;

import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' as supabase;
import '../../core/supabase_client.dart';
import '../../core/result.dart';
import '../services/api_service.dart';
import '../services/profile_api.dart';
import '../../core/services/analytics_service.dart';

part 'auth_providers.g.dart';

class AuthOfflineException implements Exception {
  AuthOfflineException(this.message);
  final String message;

  @override
  String toString() => message;
}

@riverpod
class AuthController extends _$AuthController {
  String? _lastBootstrappedUserId;

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
        final user = session?.user;
        ref.read(currentUserProvider.notifier).setUser(user);

        if (user != null && user.id != _lastBootstrappedUserId) {
          unawaited(
            _bootstrapCurrentUser().then((result) {
              if (result is Failure<void>) {
                developer.log(
                  'Deferred bootstrap failed: ${result.message}',
                  name: 'AuthController',
                  error: result.exception,
                );
              }
            }),
          );
        }
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

          final bootstrapResult = await _bootstrapCurrentUser();
          if (bootstrapResult is Failure<void>) {
            final failure = bootstrapResult;
            state = AsyncValue.error(
              failure.exception ?? Exception(failure.message),
              StackTrace.current,
            );
            return Failure<void>(failure.message, failure.exception);
          }

          state = const AsyncValue.data(null);
          unawaited(
            AnalyticsService.logAuthEvent(
              action: 'sign_in',
              method: 'password',
            ),
          );
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

          final bootstrapResult = await _bootstrapCurrentUser();
          if (bootstrapResult is Failure<void>) {
            final failure = bootstrapResult;
            state = AsyncValue.error(
              failure.exception ?? Exception(failure.message),
              StackTrace.current,
            );
            return Failure<void>(failure.message, failure.exception);
          }

          state = const AsyncValue.data(null);
          unawaited(
            AnalyticsService.logAuthEvent(
              action: 'sign_up',
              method: 'password',
            ),
          );
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

  Future<Result<void>> signInWithGoogle() async {
    if (!SupabaseService.isConfigured) {
      final message =
          'Supabase credentials are not configured. Connect the app to Supabase before signing in.';
      final exception = AuthOfflineException(message);
      state = AsyncValue.error(exception, StackTrace.current);
      return Failure(message, exception);
    }

    state = const AsyncValue.loading();
    try {
      final result = await AuthService.signInWithGoogle();
      return await result.when(
        success: (_) async {
          final bootstrapResult =
              await _bootstrapCurrentUser(waitForSession: true);
          if (bootstrapResult is Failure<void>) {
            final failure = bootstrapResult;
            state = AsyncValue.error(
              failure.exception ?? Exception(failure.message),
              StackTrace.current,
            );
            return Failure<void>(failure.message, failure.exception);
          }

          final currentUser = SupabaseService.currentUser;
          if (currentUser != null) {
            ref.read(currentUserProvider.notifier).setUser(currentUser);
          }

          state = const AsyncValue.data(null);
          unawaited(
            AnalyticsService.logAuthEvent(
              action: 'sign_in',
              method: 'google',
            ),
          );
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
          _lastBootstrappedUserId = null;
          state = const AsyncValue.data(null);
          unawaited(
            AnalyticsService.logAuthEvent(
              action: 'sign_out',
              method: 'supabase',
            ),
          );
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

  Future<Result<void>> _bootstrapCurrentUser(
      {bool waitForSession = false}) async {
    supabase.User? user;
    if (waitForSession) {
      user = await _waitForAuthenticatedUser();
    } else {
      user = SupabaseService.currentUser;
    }

    if (user == null) {
      final message = waitForSession
          ? 'Sign-in completed but the Supabase session was not established. Please try again.'
          : 'User not authenticated';
      developer.log(message, name: 'AuthController');
      return Failure<void>(message);
    }

    if (_lastBootstrappedUserId == user.id) {
      return const Success(null);
    }

    final profileResult = await ProfileApi.upsertCurrentUserProfile();
    if (profileResult is Failure<void>) {
      developer.log(
        'Profile bootstrap failed for user ${user.id}: ${profileResult.message}',
        name: 'AuthController',
        error: profileResult.exception,
      );
      return Failure<void>(profileResult.message, profileResult.exception);
    }

    final calendarResult =
        await CalendarApi.ensurePrimaryCalendarForCurrentUser();
    if (calendarResult is Failure<void>) {
      developer.log(
        'Calendar bootstrap failed for user ${user.id}: ${calendarResult.message}',
        name: 'AuthController',
        error: calendarResult.exception,
      );
      return Failure<void>(calendarResult.message, calendarResult.exception);
    }

    _lastBootstrappedUserId = user.id;
    return const Success(null);
  }

  Future<supabase.User?> _waitForAuthenticatedUser() async {
    final existing = SupabaseService.currentUser;
    if (existing != null) {
      return existing;
    }

    final stream = SupabaseService.authStateChanges;
    if (stream == null) {
      return null;
    }

    try {
      final state = await stream
          .firstWhere((event) => event.session?.user != null)
          .timeout(const Duration(seconds: 10));
      return state.session?.user;
    } on TimeoutException catch (error, stack) {
      developer.log(
        'Timed out waiting for Supabase session',
        name: 'AuthController',
        error: error,
        stackTrace: stack,
      );
      return null;
    } catch (error, stack) {
      developer.log(
        'Error waiting for Supabase session',
        name: 'AuthController',
        error: error,
        stackTrace: stack,
      );
      return null;
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
    if (!SupabaseService.isConfigured) {
      final message =
          'Supabase credentials are not configured. Connect the app to Supabase before signing in.';
      return Failure<void>(message, AuthOfflineException(message));
    }

    return await AuthApi.signInWithGoogle();
  }

  static Future<Result<void>> signOut() async {
    return await AuthApi.signOut();
  }
}
