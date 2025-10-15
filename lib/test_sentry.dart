import 'dart:developer' as developer;

import 'package:sentry_flutter/sentry_flutter.dart';

import 'core/error_handler.dart';
import 'core/app_error.dart';

/// A simple function to test Sentry error reporting
void testSentryError() {
  try {
    // Intentionally throw an error to test Sentry
    throw Exception(
        'This is a test error from the MyOrbit calendar app to verify Sentry is working');
  } catch (error, stackTrace) {
    // Capture the error with our centralized error handler
    ErrorHandler.captureException(
      error,
      stackTrace: stackTrace,
      hint: 'Test error from testSentryError function',
    );
    developer.log(
      'Sentry error captured: $error',
      name: 'TestSentry',
    );
  }
}

/// Another way to manually send a message to Sentry
void testSentryMessage() {
  ErrorHandler.captureMessage(
      'This is a test message to verify Sentry is working',
      level: SentryLevel.info);
  developer.log(
    'Sentry message captured',
    name: 'TestSentry',
  );
}

/// Test the AppError system with Sentry integration
void testAppErrorWithSentry() {
  try {
    // Throw an AppError to test the integration
    throw NetworkError.connectionFailed();
  } catch (error, stackTrace) {
    // This will properly capture the error with Sentry and provide user-friendly feedback
    ErrorHandler.handleError(error,
        stackTrace: stackTrace,
        context: 'AppError test in testAppErrorWithSentry');
    developer.log(
      'AppError captured with Sentry: $error',
      name: 'TestSentry',
    );
  }
}

/// Test executing an operation with error handling
Future<void> testExecuteWithErrorHandling() async {
  await ErrorHandler.executeWithErrorHandling(
    () async {
      // Simulate an operation that fails
      throw Exception('Simulated operation failure');
    },
    context: 'Test operation in testExecuteWithErrorHandling',
  );
}
