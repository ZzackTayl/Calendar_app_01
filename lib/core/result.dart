/// A type that represents the result of an operation that can succeed or fail.
/// 
/// Use this instead of throwing exceptions for expected failures.
/// 
/// Example:
/// ```dart
/// Future<Result<User>> getUser(String id) async {
///   try {
///     final user = await api.fetchUser(id);
///     return Success(user);
///   } catch (e) {
///     return Failure('Failed to fetch user', e as Exception);
///   }
/// }
/// ```
sealed class Result<T> {
  const Result();

  /// Execute different code paths based on success or failure
  R when<R>({
    required R Function(T data) success,
    required R Function(String message, Exception? exception) failure,
  }) {
    return switch (this) {
      Success<T>(data: final data) => success(data),
      Failure<T>(message: final message, exception: final exception) =>
        failure(message, exception),
    };
  }

  /// Check if this result is a success
  bool get isSuccess => this is Success<T>;

  /// Check if this result is a failure
  bool get isFailure => this is Failure<T>;

  /// Get the data if success, or null if failure
  T? get dataOrNull => switch (this) {
        Success<T>(data: final data) => data,
        Failure<T>() => null,
      };

  /// Get the error message if failure, or null if success
  String? get errorOrNull => switch (this) {
        Success<T>() => null,
        Failure<T>(message: final message) => message,
      };
}

/// Represents a successful result with data
class Success<T> extends Result<T> {
  final T data;
  const Success(this.data);

  @override
  String toString() => 'Success($data)';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Success<T> &&
          runtimeType == other.runtimeType &&
          data == other.data;

  @override
  int get hashCode => data.hashCode;
}

/// Represents a failed result with an error message
class Failure<T> extends Result<T> {
  final String message;
  final Exception? exception;

  const Failure(this.message, [this.exception]);

  @override
  String toString() => 'Failure($message${exception != null ? ', $exception' : ''})';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Failure<T> &&
          runtimeType == other.runtimeType &&
          message == other.message &&
          exception == other.exception;

  @override
  int get hashCode => Object.hash(message, exception);
}