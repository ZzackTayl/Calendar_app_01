// Auth Cubit following MyOrbit_CleanArch pattern
// Migrated from Riverpod + Result<T> to BLoC + Either<Failure, Success>

import 'dart:async';
import 'dart:developer' as developer;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../core/enums/app_state_status.dart';
import '../../../core/firebase_app_services.dart';
import '../../../core/services/analytics_service.dart';
import '../../../domain/repositories/auth_repository.dart';
import '../../../logic/services/api_service.dart';
import '../../../logic/services/profile_api.dart';

/// Auth state following MyOrbit_CleanArch pattern
class AuthState {
  final AppStateStatus status;
  final User? user;
  final String message;
  final bool isAuthenticated;

  const AuthState({
    this.status = AppStateStatus.initial,
    this.user,
    this.message = '',
    this.isAuthenticated = false,
  });

  bool get isLoading => status.isLoading;

  AuthState copyWith({
    AppStateStatus? status,
    User? user,
    String? message,
    bool? isAuthenticated,
  }) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      message: message ?? this.message,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthCubit extends Cubit<AuthState> {
  AuthCubit({required AuthRepository repository})
      : _repository = repository,
        super(const AuthState()) {
    _initialize();
  }

  final AuthRepository _repository;
  StreamSubscription<User?>? _authSubscription;
  String? _lastBootstrappedUserId;

  bool get _authAvailable => FirebaseAppServices.isConfigured;

  Future<void> _initialize() async {
    if (!_authAvailable) {
      emit(state.copyWith(status: AppStateStatus.initial));
      return;
    }

    final currentUser = FirebaseAppServices.currentUser;
    if (currentUser != null) {
      emit(state.copyWith(
        status: AppStateStatus.success,
        user: currentUser,
        isAuthenticated: true,
      ));
      await _bootstrapCurrentUser(user: currentUser);
    } else {
      emit(state.copyWith(status: AppStateStatus.initial));
    }

    _authSubscription = FirebaseAppServices.authStateChanges.listen(
      (user) async {
        if (user == null) {
          _lastBootstrappedUserId = null;
          emit(state.copyWith(
            status: AppStateStatus.initial,
            isAuthenticated: false,
          ));
          return;
        }

        emit(state.copyWith(
          status: AppStateStatus.success,
          user: user,
          isAuthenticated: true,
        ));

        await _bootstrapCurrentUser(user: user);
      },
      onError: (error, stackTrace) {
        developer.log(
          'Auth state listener error: $error',
          name: 'AuthCubit',
          error: error,
          stackTrace: stackTrace,
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: error.toString(),
        ));
      },
    );
  }

  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async {
    if (!_authAvailable) {
      emit(state.copyWith(
        status: AppStateStatus.failure,
        message: 'Firebase authentication is not configured.',
      ));
      return;
    }

    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _repository.signInWithEmail(
      email: email,
      password: password,
    );

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) async {
        await _bootstrapCurrentUser();
        final user = FirebaseAppServices.currentUser;

        emit(state.copyWith(
          status: AppStateStatus.success,
          user: user,
          isAuthenticated: true,
          message: 'Sign in successful',
        ));

        unawaited(
          AnalyticsService.logAuthEvent(
            action: 'sign_in',
            method: 'password',
          ),
        );
      },
    );
  }

  Future<void> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    if (!_authAvailable) {
      emit(state.copyWith(
        status: AppStateStatus.failure,
        message: 'Firebase authentication is not configured.',
      ));
      return;
    }

    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _repository.signUpWithEmail(
      email: email,
      password: password,
    );

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) async {
        await _bootstrapCurrentUser();
        final user = FirebaseAppServices.currentUser;

        emit(state.copyWith(
          status: AppStateStatus.success,
          user: user,
          isAuthenticated: true,
          message: 'Account created successfully',
        ));

        unawaited(
          AnalyticsService.logAuthEvent(
            action: 'sign_up',
            method: 'password',
          ),
        );
      },
    );
  }

  Future<void> signInWithGoogle() async {
    if (!_authAvailable) {
      emit(state.copyWith(
        status: AppStateStatus.failure,
        message: 'Firebase authentication is not configured.',
      ));
      return;
    }

    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _repository.signInWithGoogle();

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) async {
        await _bootstrapCurrentUser(waitForSession: true);
        final user = FirebaseAppServices.currentUser;

        emit(state.copyWith(
          status: AppStateStatus.success,
          user: user,
          isAuthenticated: true,
          message: 'Signed in with Google',
        ));

        unawaited(
          AnalyticsService.logAuthEvent(
            action: 'sign_in',
            method: 'google',
          ),
        );
      },
    );
  }

  Future<void> signOut() async {
    if (!_authAvailable) {
      emit(state.copyWith(
        status: AppStateStatus.initial,
        isAuthenticated: false,
      ));
      return;
    }

    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await _repository.signOut();

    result.fold(
      (failure) {
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) {
        _lastBootstrappedUserId = null;
        emit(state.copyWith(
          status: AppStateStatus.initial,
          user: null,
          isAuthenticated: false,
          message: 'Signed out successfully',
        ));

        unawaited(
          AnalyticsService.logAuthEvent(
            action: 'sign_out',
            method: 'firebase_auth',
          ),
        );
      },
    );
  }

  Future<void> _bootstrapCurrentUser({
    User? user,
    bool waitForSession = false,
  }) async {
    User? resolved = user ?? FirebaseAppServices.currentUser;
    if (waitForSession && resolved == null) {
      resolved = await _waitForAuthenticatedUser();
    }

    if (resolved == null) {
      final message = waitForSession
          ? 'Sign-in completed but the Firebase session was not established.'
          : 'User not authenticated';
      developer.log(message, name: 'AuthCubit');
      return;
    }

    if (_lastBootstrappedUserId == resolved.uid) {
      return;
    }

    // Bootstrap user profile
    final profileResult = await ProfileApi.upsertCurrentUserProfile();
    profileResult.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log(
          'Profile bootstrap failed for user ${resolved!.uid}: $message',
          name: 'AuthCubit',
          error: exception,
        );
      },
    );

    // Bootstrap primary calendar
    final calendarResult =
        await CalendarApi.ensurePrimaryCalendarForCurrentUser();
    calendarResult.when(
      success: (_) {},
      failure: (message, exception) {
        developer.log(
          'Calendar bootstrap failed for user ${resolved!.uid}: $message',
          name: 'AuthCubit',
          error: exception,
        );
      },
    );

    _lastBootstrappedUserId = resolved.uid;
  }

  Future<User?> _waitForAuthenticatedUser() async {
    final existing = FirebaseAppServices.currentUser;
    if (existing != null) {
      return existing;
    }

    final stream = FirebaseAppServices.authStateChanges;
    try {
      return await stream
          .firstWhere((user) => user != null)
          .timeout(const Duration(seconds: 10));
    } on TimeoutException catch (error, stack) {
      developer.log(
        'Timed out waiting for Firebase session',
        name: 'AuthCubit',
        error: error,
        stackTrace: stack,
      );
      return null;
    } catch (error, stack) {
      developer.log(
        'Error waiting for Firebase session',
        name: 'AuthCubit',
        error: error,
        stackTrace: stack,
      );
      return null;
    }
  }

  @override
  Future<void> close() async {
    await _authSubscription?.cancel();
    return super.close();
  }
}
