import 'dart:developer' as developer;

import '../../core/result.dart';
import '../../domain/repositories/user_repository.dart';
import '../../domain/user_profile.dart';
import '../datasources/remote/user_remote_data_source.dart';

/// Implementation of UserRepository using clean architecture
/// Handles business logic and error handling
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource remoteDataSource;

  const UserRepositoryImpl({
    required this.remoteDataSource,
  });

  @override
  Future<Result<List<UserProfile>>> getUsers() async {
    try {
      final users = await remoteDataSource.getUsers();
      developer.log('Repository: Successfully fetched ${users.length} users',
          name: 'UserRepository');
      return Success(users);
    } catch (e) {
      developer.log('Repository: Failed to fetch users: $e',
          name: 'UserRepository');
      return Failure(_getErrorMessage(e));
    }
  }

  @override
  Future<Result<UserProfile>> getUserById(String id) async {
    try {
      // Validate input
      if (id.trim().isEmpty) {
        return const Failure('User ID cannot be empty');
      }

      final user = await remoteDataSource.getUserById(id);
      developer.log('Repository: Successfully fetched user $id',
          name: 'UserRepository');
      return Success(user);
    } catch (e) {
      developer.log('Repository: Failed to fetch user $id: $e',
          name: 'UserRepository');
      return Failure(_getErrorMessage(e));
    }
  }

  @override
  Future<Result<UserProfile>> createUser(UserProfile user) async {
    try {
      // Business logic validation
      final validationError = _validateUser(user);
      if (validationError != null) {
        return Failure(validationError);
      }

      final createdUser = await remoteDataSource.createUser(user);
      developer.log('Repository: Successfully created user ${createdUser.id}',
          name: 'UserRepository');
      return Success(createdUser);
    } catch (e) {
      developer.log('Repository: Failed to create user: $e',
          name: 'UserRepository');
      return Failure(_getErrorMessage(e));
    }
  }

  @override
  Future<Result<UserProfile>> updateUser(UserProfile user) async {
    try {
      // Business logic validation
      final validationError = _validateUser(user);
      if (validationError != null) {
        return Failure(validationError);
      }

      if (user.id.trim().isEmpty) {
        return const Failure('User ID is required for update');
      }

      final updatedUser = await remoteDataSource.updateUser(user);
      developer.log('Repository: Successfully updated user ${updatedUser.id}',
          name: 'UserRepository');
      return Success(updatedUser);
    } catch (e) {
      developer.log('Repository: Failed to update user ${user.id}: $e',
          name: 'UserRepository');
      return Failure(_getErrorMessage(e));
    }
  }

  @override
  Future<Result<void>> deleteUser(String id) async {
    try {
      // Validate input
      if (id.trim().isEmpty) {
        return const Failure('User ID cannot be empty');
      }

      await remoteDataSource.deleteUser(id);
      developer.log('Repository: Successfully deleted user $id',
          name: 'UserRepository');
      return const Success(null);
    } catch (e) {
      developer.log('Repository: Failed to delete user $id: $e',
          name: 'UserRepository');
      return Failure(_getErrorMessage(e));
    }
  }

  /// Validates user data according to business rules
  String? _validateUser(UserProfile user) {
    // Email validation
    if (user.email.trim().isEmpty) {
      return 'Email is required';
    }

    final emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');
    if (!emailRegex.hasMatch(user.email)) {
      return 'Invalid email format';
    }

    // Display name validation
    if (user.displayName?.trim().isEmpty ?? true) {
      return 'Display name is required';
    }

    // Timezone validation (optional but if provided, should not be empty)
    if (user.timezone != null && user.timezone!.trim().isEmpty) {
      return 'Timezone cannot be empty if provided';
    }

    return null; // No validation errors
  }

  /// Converts exceptions to user-friendly error messages
  String _getErrorMessage(dynamic error) {
    if (error is Exception) {
      final message = error.toString();

      // Handle common error cases
      if (message.contains('not found')) {
        return 'User not found';
      }
      if (message.contains('already exists')) {
        return 'Email already exists';
      }
      if (message.contains('network') || message.contains('connection')) {
        return 'Network error. Please check your connection and try again';
      }

      // Return the exception message without "Exception: " prefix
      return message.replaceFirst('Exception: ', '');
    }

    return 'An unexpected error occurred';
  }
}
