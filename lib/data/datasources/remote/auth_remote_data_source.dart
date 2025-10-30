/// Abstraction for remote authentication operations.
///
/// Implementations can leverage Firebase Auth, Supabase, or in-memory mocks.
abstract class AuthRemoteDataSource {
  Future<void> signInWithGoogle();

  Future<void> signInWithEmail({
    required String email,
    required String password,
  });

  Future<void> signUpWithEmail({
    required String email,
    required String password,
  });

  Future<void> signOut();
}

/// Lightweight mock used while Firebase credentials are unavailable.
class MockAuthRemoteDataSource implements AuthRemoteDataSource {
  MockAuthRemoteDataSource();

  Never _unconfigured() {
    throw StateError(
      'Firebase authentication is not configured yet. '
      'Provide Firebase credentials and switch to the FirebaseAuthRemoteDataSource.',
    );
  }

  @override
  Future<void> signInWithGoogle() async => _unconfigured();

  @override
  Future<void> signInWithEmail({
    required String email,
    required String password,
  }) async =>
      _unconfigured();

  @override
  Future<void> signUpWithEmail({
    required String email,
    required String password,
  }) async =>
      _unconfigured();

  @override
  Future<void> signOut() async => _unconfigured();
}
