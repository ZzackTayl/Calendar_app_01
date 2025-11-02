part of 'repositories.dart';

abstract class AuthRepo {
  Future<Either<CustomException, bool>> login(String email, String password);
  Future<Either<CustomException, bool>> signup(
    String name,
    String email,
    String password,
  );
  Future<Either<CustomException, bool>> signInWithGoogle();
}
