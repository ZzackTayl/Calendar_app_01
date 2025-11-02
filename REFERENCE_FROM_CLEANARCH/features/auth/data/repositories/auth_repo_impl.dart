part of 'repositories.dart';

class AuthRepoImpl with ExceptionMixin implements AuthRepo {
  // GoogleSignIn instantiation removed to avoid constructor mismatch; simulate sign-in in signInWithGoogle().
  @override
  Future<Either<CustomException, bool>> login(
    String email,
    String password,
  ) async {
    return await handleFuture(() async {
      await Future.delayed(const Duration(seconds: 1));

      return true;
    });
  }

  @override
  Future<Either<CustomException, bool>> signup(
    String name,
    String email,
    String password,
  ) async {
    return await handleFuture(() async {
      await Future.delayed(const Duration(seconds: 1));

      return true;
    });
  }

  @override
  Future<Either<CustomException, bool>> signInWithGoogle() async {
    return await handleFuture(() async {
      // Simulate Google Sign-In flow (replace with real GoogleSignIn usage if available)
      await Future.delayed(const Duration(seconds: 1));
      return true;
    });
  }
}
