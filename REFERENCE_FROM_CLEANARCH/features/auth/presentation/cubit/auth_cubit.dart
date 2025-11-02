part of 'cubit.dart';

class AuthCubit extends Cubit<AuthState> {
  final AuthRepo repository;

  AuthCubit(this.repository) : super(const AuthState());

  // Toggle between sign in and sign up modes
  void toggleMode() {
    emit(state.copyWith(isSignUpMode: !state.isSignUpMode));
  }

  void setSignInMode() {
    emit(state.copyWith(isSignUpMode: false));
  }

  void setSignUpMode() {
    emit(state.copyWith(isSignUpMode: true));
  }

  Future<void> login(String email, String password) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.login(email, password);
    result.fold(
      (error) => emit(
        state.copyWith(status: AppStateStatus.failure, message: error.message),
      ),
      (_) => emit(
        state.copyWith(
          status: AppStateStatus.success,
          message: 'Login successful',
          isAuthenticated: true,
        ),
      ),
    );
  }

  Future<void> signup(String name, String email, String password) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.signup(name, email, password);
    result.fold(
      (error) => emit(
        state.copyWith(status: AppStateStatus.failure, message: error.message),
      ),
      (_) => emit(
        state.copyWith(
          status: AppStateStatus.success,
          message: 'Signup successful',
          isAuthenticated: true,
          needsEmailVerification: true,
        ),
      ),
    );
  }

  Future<void> signInWithGoogle() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await repository.signInWithGoogle();
    result.fold(
      (error) => emit(
        state.copyWith(status: AppStateStatus.failure, message: error.message),
      ),
      (_) => emit(
        state.copyWith(
          status: AppStateStatus.success,
          message: 'Signed in with Google',
          isAuthenticated: true,
        ),
      ),
    );
  }

  void logout() {
    emit(const AuthState());
  }
}
