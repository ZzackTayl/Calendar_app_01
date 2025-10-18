/// Base class for all application errors.
///
/// Use specific error types (NetworkError, ValidationError, etc.) instead of
/// throwing generic exceptions. This makes error handling more predictable.
class AppError implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  AppError(this.message, {this.code, this.originalError});

  @override
  String toString() {
    final buffer = StringBuffer('AppError: $message');
    if (code != null) buffer.write(' (code: $code)');
    if (originalError != null) buffer.write('\nCaused by: $originalError');
    return buffer.toString();
  }
}

/// Error that occurs during network operations
class NetworkError extends AppError {
  NetworkError(
    super.message, {
    super.code,
    super.originalError,
  });

  /// Create a NetworkError for connection failures
  factory NetworkError.connectionFailed([dynamic originalError]) {
    return NetworkError(
      'Unable to connect to the server. Please check your internet connection.',
      code: 'CONNECTION_FAILED',
      originalError: originalError,
    );
  }

  /// Create a NetworkError for timeout
  factory NetworkError.timeout([dynamic originalError]) {
    return NetworkError(
      'The request took too long. Please try again.',
      code: 'TIMEOUT',
      originalError: originalError,
    );
  }

  /// Create a NetworkError for server errors
  factory NetworkError.serverError([dynamic originalError]) {
    return NetworkError(
      'The server encountered an error. Please try again later.',
      code: 'SERVER_ERROR',
      originalError: originalError,
    );
  }

  @override
  String toString() => 'NetworkError: $message${code != null ? ' ($code)' : ''}';
}

/// Error that occurs during data validation
class ValidationError extends AppError {
  final Map<String, String>? fieldErrors;

  ValidationError(
    super.message, {
    super.code,
    super.originalError,
    this.fieldErrors,
  });

  /// Create a ValidationError for a specific field
  factory ValidationError.field(String field, String message) {
    return ValidationError(
      message,
      code: 'FIELD_VALIDATION',
      fieldErrors: {field: message},
    );
  }

  @override
  String toString() {
    final buffer = StringBuffer('ValidationError: $message');
    if (fieldErrors != null && fieldErrors!.isNotEmpty) {
      buffer.write('\nField errors: $fieldErrors');
    }
    return buffer.toString();
  }
}

/// Error that occurs when user lacks required permissions
class PermissionError extends AppError {
  final String permission;

  PermissionError(
    super.message, {
    required this.permission,
    super.code,
    super.originalError,
  });

  /// Create a PermissionError for denied permission
  factory PermissionError.denied(String permission) {
    return PermissionError(
      'Permission denied: $permission',
      permission: permission,
      code: 'PERMISSION_DENIED',
    );
  }

  /// Create a PermissionError for missing permission
  factory PermissionError.notGranted(String permission) {
    return PermissionError(
      'This feature requires $permission permission',
      permission: permission,
      code: 'PERMISSION_NOT_GRANTED',
    );
  }

  @override
  String toString() => 'PermissionError: $message (permission: $permission)';
}

/// Error that occurs when authentication fails
class AuthenticationError extends AppError {
  AuthenticationError(
    super.message, {
    super.code,
    super.originalError,
  });

  /// Create an AuthenticationError for invalid credentials
  factory AuthenticationError.invalidCredentials() {
    return AuthenticationError(
      'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    );
  }

  /// Create an AuthenticationError for expired session
  factory AuthenticationError.sessionExpired() {
    return AuthenticationError(
      'Your session has expired. Please sign in again.',
      code: 'SESSION_EXPIRED',
    );
  }

  /// Create an AuthenticationError for unauthorized access
  factory AuthenticationError.unauthorized() {
    return AuthenticationError(
      'You are not authorized to perform this action',
      code: 'UNAUTHORIZED',
    );
  }

  @override
  String toString() => 'AuthenticationError: $message${code != null ? ' ($code)' : ''}';
}

/// Error that occurs when a resource is not found
class NotFoundError extends AppError {
  final String resourceType;
  final String? resourceId;

  NotFoundError(
    super.message, {
    required this.resourceType,
    this.resourceId,
    super.code,
    super.originalError,
  });

  /// Create a NotFoundError for a specific resource
  factory NotFoundError.resource(String resourceType, [String? resourceId]) {
    final id = resourceId != null ? ' with id $resourceId' : '';
    return NotFoundError(
      '$resourceType not found$id',
      resourceType: resourceType,
      resourceId: resourceId,
      code: 'NOT_FOUND',
    );
  }

  @override
  String toString() => 'NotFoundError: $message (type: $resourceType)';
}

/// Error that occurs during data parsing or serialization
class DataError extends AppError {
  DataError(
    super.message, {
    super.code,
    super.originalError,
  });

  /// Create a DataError for parsing failures
  factory DataError.parsing(String dataType, [dynamic originalError]) {
    return DataError(
      'Failed to parse $dataType data',
      code: 'PARSING_ERROR',
      originalError: originalError,
    );
  }

  /// Create a DataError for serialization failures
  factory DataError.serialization(String dataType, [dynamic originalError]) {
    return DataError(
      'Failed to serialize $dataType data',
      code: 'SERIALIZATION_ERROR',
      originalError: originalError,
    );
  }

  @override
  String toString() => 'DataError: $message${code != null ? ' ($code)' : ''}';
}
