import 'dart:developer' as developer;

import 'package:dartz/dartz.dart';
import '../../core/error/failures.dart';
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
  Future<Either<Failure, void>> signInWithGoogle() async {
    try {
      await _remoteDataSource.signInWithGoogle();
      return const Right(null);
    } on AccountExistsWithDifferentCredentialException catch (error) {
      final message = _mapAccountConflictMessage(error);
      developer.log(
        message,
        name: 'AuthRepository',
        error: error,
      );
      return Left(Failure(message: message, originalException: error));
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign in with Google: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Left(Failure(
        message: 'Failed to sign in with Google. Please try again.',
        originalException: error,
      ));
    }
  }

  @override
  Future<Either<Failure, void>> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _remoteDataSource.signInWithEmail(email: email, password: password);
      return const Right(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign in with email $email: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Left(Failure(
        message: 'Failed to sign in. Please verify your credentials and try again.',
        originalException: error,
      ));
    }
  }

  @override
  Future<Either<Failure, void>> signUpWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      await _remoteDataSource.signUpWithEmail(email: email, password: password);
      return const Right(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign up with email $email: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Left(Failure(
        message: 'Failed to create an account. Please try again.',
        originalException: error,
      ));
    }
  }

  @override
  Future<Either<Failure, void>> signOut() async {
    try {
      await _remoteDataSource.signOut();
      return const Right(null);
    } catch (error, stackTrace) {
      developer.log(
        'Failed to sign out: $error',
        name: 'AuthRepository',
        error: error,
        stackTrace: stackTrace,
      );
      return Left(Failure(
        message: 'Failed to sign out. Please try again.',
        originalException: error,
      ));
    }
  }

  String _mapAccountConflictMessage(AccountExistsWithDifferentCredentialException error) {
    return 'An account for ${error.email} already exists with a different sign-in method. Please use that provider or link your credentials.';
  }
}
