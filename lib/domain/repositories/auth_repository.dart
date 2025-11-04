import 'package:dartz/dartz.dart';
import '../../core/error/failures.dart';

/// Contract for authentication operations used by presentation layers.
/// Concrete implementations can swap between Firebase, Supabase, or mocks.
abstract class AuthRepository {
  Future<Either<Failure, void>> signInWithGoogle();

  Future<Either<Failure, void>> signInWithEmail({
    required String email,
    required String password,
  });

  Future<Either<Failure, void>> signUpWithEmail({
    required String email,
    required String password,
  });

  Future<Either<Failure, void>> signOut();
}
