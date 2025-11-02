part of 'utils.dart';

mixin ExceptionMixin {
  Future<Either<CustomException, T>> handleFuture<T>(
    Future<T> Function() future,
  ) async {
    try {
      final result = await future();
      return Right(result);
    } catch (e) {
      return Left(CustomException(message: e.toString()));
    }
  }
}
