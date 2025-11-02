// Utility extensions for working with Either type from dartz
// Following MyOrbit_CleanArch pattern

import 'package:dartz/dartz.dart';

import '../error/failures.dart';

/// Mixin to provide error handling utilities for repositories
/// Usage: class MyRepoImpl with EitherMixin implements MyRepo { ... }
mixin EitherMixin {
  /// Wraps a Future in Either, catching exceptions and converting to Failure
  Future<Either<Failure, T>> handleFuture<T>(
    Future<T> Function() future,
  ) async {
    try {
      final result = await future();
      return Right(result);
    } on Exception catch (e) {
      return Left(Failure(message: e.toString()));
    } catch (e) {
      return Left(Failure(message: 'Unexpected error: $e'));
    }
  }

  /// Wraps a synchronous operation in Either
  Either<Failure, T> handleSync<T>(T Function() operation) {
    try {
      final result = operation();
      return Right(result);
    } on Exception catch (e) {
      return Left(Failure(message: e.toString()));
    } catch (e) {
      return Left(Failure(message: 'Unexpected error: $e'));
    }
  }
}

