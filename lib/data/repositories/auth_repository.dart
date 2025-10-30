import 'dart:developer' as developer;

import '../../core/result.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/remote/auth_firebase_data_source.dart';
import '../datasources/remote/auth_remote_data_source.dart';

/// Clean architecture repository for authentication flows.
class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl({
    required AuthRemoteDataSource remoteDataSource,
  }) : _remoteDataSource = remoteDataSource;

  final AuthRemoteDataSource _remoteDataSource;

  @override
  Future<Result<void>> signInWithGoogle() async {
    try {
      await _remoteDataSource.signInWithGoogle();
      return const Success(null);
    } on AccountExistsWithDifferentCredentialException catch (error) {
      final message = _mapAccountConflictMessage(error);
      developer.log(
        message,
        name: 'AuthRepository',
        error: error,
      );
      return Failure(message, error);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign in with Google: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Failure('Failed to sign in with Google. Please try again.', error as Exception?);
    }
  }

  @override
  Future<Result<void>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _remoteDataSource.signInWithEmail(email: email, password: password);
      return const Success(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign in with email for $email: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Failure('Failed to sign in. Please verify your credentials and try again.', error as Exception?);
    }
  }

  @override
  Future<Result<void>> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _remoteDataSource.signUpWithEmail(email: email, password: password);
      return const Success(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign up with email $email: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Failure('Failed to create an account. Please try again.', error as Exception?);
    }
  }

  @override
  Future<Result<void>> signOut() async {
    try {
      await _remoteDataSource.signOut();
      return const Success(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign out: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Failure('Failed to sign out. Please try again.', error as Exception?);
    }
  }

  String _mapAccountConflictMessage(AccountExistsWithDifferentCredentialException error) {
    return 'An account for ${error.email} already exists with a different sign-in method. Please use that provider or link your credentials.';
  }
}
