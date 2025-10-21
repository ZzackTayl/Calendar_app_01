import 'dart:developer' as developer;

import 'app_error.dart';

/// Centralized error handler for logging and surfacing user-friendly messages.
class ErrorHandler {
  /// Logs an exception and optional context.
  static Future<void> captureException(
    dynamic exception, {
    StackTrace? stackTrace,
    String? hint,
  }) async {
    final message = 'Captured exception: ${exception ?? 'unknown'}';
    developer.log(
      message,
      name: 'ErrorHandler',
      error: exception,
      stackTrace: stackTrace,
    );

    if (hint != null && hint.isNotEmpty) {
      developer.log('Context: $hint', name: 'ErrorHandler');
    }
  }

  /// Logs an informational message.
  static Future<void> captureMessage(
    String message, {
    int level = 0,
  }) async {
    developer.log(message, name: 'ErrorHandler', level: level);
  }

  /// Handles errors by logging them and returning a user-friendly message.
  static Future<String> handleError(
    dynamic error, {
    StackTrace? stackTrace,
    String? context,
  }) async {
    await captureException(error, stackTrace: stackTrace, hint: context);

    if (error is AppError) {
      return error.message;
    }
    if (error is String) {
      return error;
    }
    if (error != null) {
      return error.toString();
    }
    return 'An unknown error occurred';
  }

  /// Executes a function and handles any errors that occur.
  static Future<T> executeWithErrorHandling<T>(
    Future<T> Function() operation, {
    String? context,
    T? defaultValue,
  }) async {
    try {
      return await operation();
    } catch (error, stackTrace) {
      await ErrorHandler.handleError(
        error,
        stackTrace: stackTrace,
        context: context,
      );

      if (defaultValue != null) {
        return defaultValue;
      }
      rethrow;
    }
  }
}
