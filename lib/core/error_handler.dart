import 'dart:developer' as developer;

import 'package:sentry_flutter/sentry_flutter.dart';

import 'app_error.dart';

/// Centralized error handler that integrates with Sentry for error tracking
class ErrorHandler {
  /// Captures an exception with Sentry and returns a SentryId
  static Future<SentryId> captureException(
    dynamic exception, {
    StackTrace? stackTrace,
    String? hint,
  }) async {
    // Always capture the exception with Sentry for tracking
    final sentryId = await Sentry.captureException(
      exception,
      stackTrace: stackTrace,
      withScope: (scope) {
        if (hint != null) {
          scope.setContexts('context', {'details': hint});
        }
      },
    );

    // Log to console in development for immediate feedback
    // Log to console only when Sentry is disabled (development)
    if (!Sentry.isEnabled) {
      developer.log(
        'Error captured by Sentry with ID: $sentryId',
        name: 'ErrorHandler',
      );
    }

    return sentryId;
  }

  /// Captures a message with Sentry
  static Future<SentryId> captureMessage(
    String message, {
    SentryLevel level = SentryLevel.info,
  }) async {
    final sentryId = await Sentry.captureMessage(message, level: level);

    // Log to console in development
    if (!Sentry.isEnabled) {
      developer.log(
        'Message captured by Sentry with ID: $sentryId',
        name: 'ErrorHandler',
      );
    }

    return sentryId;
  }

  /// Handles errors by capturing them with Sentry and returning a user-friendly message
  static Future<String> handleError(
    dynamic error, {
    StackTrace? stackTrace,
    String? context,
  }) async {
    // Capture the error with Sentry for tracking
    final sentryId = await captureException(
      error,
      stackTrace: stackTrace,
      hint: context != null ? 'Context: $context' : null,
    );

    // Determine user-friendly error message based on error type
    String userMessage;

    if (error is AppError) {
      userMessage = error.message;
    } else if (error is String) {
      userMessage = error;
    } else if (error != null) {
      userMessage = error.toString();
    } else {
      userMessage = 'An unknown error occurred';
    }

    // Add Sentry ID to the user message for support purposes (in production)
    if (Sentry.isEnabled) {
      userMessage = '$userMessage (Error ID: ${sentryId.toString().substring(0, 8)})';
    }

    return userMessage;
  }

  /// Executes a function and handles any errors that occur
  static Future<T> executeWithErrorHandling<T>(
    Future<T> Function() operation, {
    String? context,
    T? defaultValue,
  }) async {
    try {
      return await operation();
    } catch (error, stackTrace) {
      // Capture the error with Sentry
      await ErrorHandler.handleError(error, stackTrace: stackTrace, context: context);

      // Re-throw the error or return a default value
      if (defaultValue != null) {
        return defaultValue;
      } else {
        rethrow;
      }
    }
  }
}
