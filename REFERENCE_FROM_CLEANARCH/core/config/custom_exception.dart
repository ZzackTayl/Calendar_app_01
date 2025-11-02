part of 'config.dart';

/// Base class for all custom exceptions in the application.
///
/// Provides a consistent structure for error handling with:
/// - User-friendly error messages
/// - Optional error codes for logging
/// - Stack trace preservation
///
/// All app-specific exceptions should extend this class.

class CustomException implements Exception {
  /// User-friendly error message
  final String message;

  /// Optional error code for logging and debugging
  final String? code;

  /// Optional underlying exception
  final dynamic originalException;

  const CustomException({
    required this.message,
    this.code,
    this.originalException,
  });

  @override
  String toString() {
    if (code != null) {
      return 'CustomException [$code]: $message';
    }
    return 'CustomException: $message';
  }
}

// ==================== Network Exceptions ====================

/// Exception thrown when network connectivity issues occur.
class NetworkException extends CustomException {
  const NetworkException({
    super.message =
        'Network connection failed. Please check your internet connection.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when request times out.
class TimeoutException extends NetworkException {
  const TimeoutException({
    super.message = 'Request timed out. Please try again.',
    super.code,
    super.originalException,
  });
}

// ==================== Server Exceptions ====================

/// Exception thrown when server returns an error.
class ServerException extends CustomException {
  final int? statusCode;

  const ServerException({
    super.message = 'Server error occurred. Please try again later.',
    super.code,
    this.statusCode,
    super.originalException,
  });
}

/// Exception thrown for unauthorized access (401).
class UnauthorizedException extends ServerException {
  const UnauthorizedException({
    super.message = 'You are not authorized to perform this action.',
    super.code,
    super.originalException,
  }) : super(statusCode: 401);
}

/// Exception thrown for forbidden access (403).
class ForbiddenException extends ServerException {
  const ForbiddenException({
    super.message = 'Access to this resource is forbidden.',
    super.code,
    super.originalException,
  }) : super(statusCode: 403);
}

/// Exception thrown when resource not found (404).
class NotFoundException extends ServerException {
  const NotFoundException({
    super.message = 'The requested resource was not found.',
    super.code,
    super.originalException,
  }) : super(statusCode: 404);
}

// ==================== Cache Exceptions ====================

/// Exception thrown when local cache operations fail.
class CacheException extends CustomException {
  const CacheException({
    super.message = 'Failed to access local storage.',
    super.code,
    super.originalException,
  });
}

// ==================== Validation Exceptions ====================

/// Exception thrown when input validation fails.
class ValidationException extends CustomException {
  final Map<String, String>? fieldErrors;

  const ValidationException({
    super.message = 'Validation failed.',
    super.code,
    this.fieldErrors,
    super.originalException,
  });

  /// Get error message for a specific field
  String? getFieldError(String fieldName) {
    return fieldErrors?[fieldName];
  }

  /// Check if a specific field has an error
  bool hasFieldError(String fieldName) {
    return fieldErrors?.containsKey(fieldName) ?? false;
  }
}

// ==================== Auth Exceptions ====================

/// Exception thrown for authentication errors.
class AuthException extends CustomException {
  const AuthException({
    super.message = 'Authentication failed.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when user credentials are invalid.
class InvalidCredentialsException extends AuthException {
  const InvalidCredentialsException({
    super.message = 'Invalid email or password.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when email is already in use.
class EmailAlreadyInUseException extends AuthException {
  const EmailAlreadyInUseException({
    super.message = 'This email is already registered.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when email is not verified.
class EmailNotVerifiedException extends AuthException {
  const EmailNotVerifiedException({
    super.message = 'Please verify your email address.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when user account is disabled.
class UserDisabledException extends AuthException {
  const UserDisabledException({
    super.message = 'Your account has been disabled.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when session expires.
class SessionExpiredException extends AuthException {
  const SessionExpiredException({
    super.message = 'Your session has expired. Please login again.',
    super.code,
    super.originalException,
  });
}

// ==================== Calendar Sync Exceptions ====================

/// Exception thrown for calendar synchronization errors.
class CalendarSyncException extends CustomException {
  const CalendarSyncException({
    super.message = 'Failed to sync calendar.',
    super.code,
    super.originalException,
  });
}

/// Exception thrown when calendar permission is denied.
class CalendarPermissionDeniedException extends CalendarSyncException {
  const CalendarPermissionDeniedException({
    super.message = 'Calendar permission is required to sync your events.',
    super.code,
    super.originalException,
  });
}

// ==================== General Exceptions ====================

/// Exception thrown for unknown/unexpected errors.
class UnknownException extends CustomException {
  const UnknownException({
    super.message = 'An unexpected error occurred. Please try again.',
    super.code,
    super.originalException,
  });
}
