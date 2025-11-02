part of 'cubit.dart';

class AuthState {
  final AppStateStatus status;
  final String message;
  final bool isAuthenticated;
  final bool needsEmailVerification;
  final bool isSignUpMode;

  const AuthState({
    this.status = AppStateStatus.initial,
    this.message = '',
    this.isAuthenticated = false,
    this.needsEmailVerification = false,
    this.isSignUpMode = false,
  });

  AuthState copyWith({
    AppStateStatus? status,
    String? message,
    bool? isAuthenticated,
    bool? needsEmailVerification,
    bool? isSignUpMode,
  }) {
    return AuthState(
      status: status ?? this.status,
      message: message ?? this.message,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      needsEmailVerification:
          needsEmailVerification ?? this.needsEmailVerification,
      isSignUpMode: isSignUpMode ?? this.isSignUpMode,
    );
  }
}
