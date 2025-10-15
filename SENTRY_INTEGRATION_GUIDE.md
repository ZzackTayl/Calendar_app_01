# Sentry Error Tracking Best Practices for MyOrbit Calendar App

## Overview
This document outlines the best practices for using Sentry for error tracking in the MyOrbit calendar app.

## Setting up Sentry

1. **Get Your DSN**:
   - Create an account at [sentry.io](https://sentry.io)
   - Create a new Flutter project in your Sentry dashboard
   - Copy the DSN (Data Source Name) from your project settings

2. **Configure Environment Variables**:
   - Add your DSN to your `.env` file:

3. **Sentry is automatically initialized in `main.dart`** if the DSN is provided.

## Using the ErrorHandler

The app includes a centralized `ErrorHandler` class in `lib/core/error_handler.dart` that provides several methods:

### Capture Exceptions
```dart
try {
  // Your code here
} catch (error, stackTrace) {
  await ErrorHandler.captureException(error, stackTrace: stackTrace);
}
```

### Capture Messages
```dart
await ErrorHandler.captureMessage('Debug message for tracking', level: SentryLevel.info);
```

### Handle Errors with User Feedback
```dart
try {
  // Your code here
} catch (error, stackTrace) {
  final userMessage = await ErrorHandler.handleError(error, stackTrace: stackTrace, context: 'Specific context');
  // Show userMessage to the user
}
```

### Execute Operations with Error Handling
```dart
await ErrorHandler.executeWithErrorHandling(
  () async {
    // Your async operation
  },
  context: 'Operation context',
  defaultValue: 'Default value if error occurs',
);
```

## Best Practices

1. **Always Use AppError Classes**: Use the AppError subclasses (NetworkError, ValidationError, etc.) instead of generic exceptions to provide structured error information.

2. **Include Contextual Information**: When capturing errors, always provide context about where the error occurred:
   ```dart
   await ErrorHandler.captureException(error, 
     stackTrace: stackTrace, 
     hint: 'User profile update at ${DateTime.now()}'
   );
   ```

3. **Handle Errors Gracefully**: Use the `handleError` method to provide user-friendly messages while still capturing the technical error details with Sentry.

4. **Don't Over-Capture**: Avoid capturing errors that are already handled appropriately in your UI flow unless they're unexpected.

5. **Tag Important Events**: For important business events, consider using Sentry's breadcrumb feature:
   ```dart
   Sentry.addBreadcrumb(Breadcrumb(
     category: 'user',
     message: 'User attempted to create event',
     level: SentryLevel.info,
   ));
   ```

6. **Test Error Scenarios**: During development, test your error handling by calling the test functions in `test_sentry.dart`:
   ```dart
   testSentryError();  // Tests exception capturing
   testSentryMessage();  // Tests message capturing
   testAppErrorWithSentry();  // Tests AppError integration
   ```

## Environment-Specific Behavior

- In development: Errors are captured by Sentry if configured, and also printed to the console.
- In production: Errors are captured by Sentry for monitoring, with user-friendly messages presented in the UI.

## Monitoring and Maintenance

- Regularly review Sentry dashboard for recurring issues
- Set up alerts for critical error patterns
- Include Sentry IDs in user support messages for easier debugging