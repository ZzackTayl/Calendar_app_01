import '../../core/result.dart';
import '../user_profile.dart';

abstract class UserRepository {
  Future<Result<List<UserProfile>>> getUsers();
  Future<Result<UserProfile>> getUserById(String id);
  Future<Result<UserProfile>> createUser(UserProfile user);
  Future<Result<UserProfile>> updateUser(UserProfile user);
  Future<Result<void>> deleteUser(String id);
}