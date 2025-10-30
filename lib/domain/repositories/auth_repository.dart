import '../../core/result.dart';

/// Contract for authentication operations used by presentation layers.
/// Concrete implementations can swap between Firebase, Supabase, or mocks.
abstract class AuthRepository {
  Future<Result<void>> signInWithGoogle();

  Future<Result<void>> signInWithEmail({
    required String email,
    required String password,
  });

  Future<Result<void>> signUpWithEmail({
    required String email,
    required String password,
  });

  Future<Result<void>> signOut();
}
