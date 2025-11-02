// Failure classes for error handling with Either pattern
// Following MyOrbit_CleanArch pattern but adapted for calendar_app

/// Base failure class
class Failure {
  final String message;
  final String? code;
  final dynamic originalException;

  const Failure({
    required this.message,
    this.code,
    this.originalException,
  });

  @override
  String toString() {
    if (code != null) {
      return 'Failure [$code]: $message';
    }
    return 'Failure: $message';
  }
}

// ==================== Network Failures ====================

class NetworkFailure extends Failure {
  const NetworkFailure({
    super.message = 'Network connection failed. Please check your internet.',
    super.code,
    super.originalException,
  });
}

class TimeoutFailure extends NetworkFailure {
  const TimeoutFailure({
    super.message = 'Request timed out. Please try again.',
    super.code,
    super.originalException,
  });
}

// ==================== Server Failures ====================

class ServerFailure extends Failure {
  final int? statusCode;

  const ServerFailure({
    super.message = 'Server error occurred. Please try again later.',
    super.code,
    this.statusCode,
    super.originalException,
  });
}

class UnauthorizedFailure extends ServerFailure {
  const UnauthorizedFailure({
    super.message = 'You are not authorized to perform this action.',
    super.code,
    super.originalException,
  }) : super(statusCode: 401);
}

class NotFoundFailure extends ServerFailure {
  const NotFoundFailure({
    super.message = 'The requested resource was not found.',
    super.code,
    super.originalException,
  }) : super(statusCode: 404);
}

// ==================== Cache Failures ====================

class CacheFailure extends Failure {
  const CacheFailure({
    super.message = 'Failed to access local storage.',
    super.code,
    super.originalException,
  });
}

// ==================== Auth Failures ====================

class AuthFailure extends Failure {
  const AuthFailure({
    super.message = 'Authentication failed.',
    super.code,
    super.originalException,
  });
}

class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure({
    super.message = 'Invalid email or password.',
    super.code,
    super.originalException,
  });
}

class EmailAlreadyInUseFailure extends AuthFailure {
  const EmailAlreadyInUseFailure({
    super.message = 'This email is already registered.',
    super.code,
    super.originalException,
  });
}

class SessionExpiredFailure extends AuthFailure {
  const SessionExpiredFailure({
    super.message = 'Your session has expired. Please login again.',
    super.code,
    super.originalException,
  });
}

// ==================== Validation Failures ====================

class ValidationFailure extends Failure {
  final Map<String, String>? fieldErrors;

  const ValidationFailure({
    super.message = 'Validation failed.',
    super.code,
    this.fieldErrors,
    super.originalException,
  });

  String? getFieldError(String fieldName) => fieldErrors?[fieldName];
  bool hasFieldError(String fieldName) =>
      fieldErrors?.containsKey(fieldName) ?? false;
}

