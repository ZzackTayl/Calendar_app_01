import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/env.dart';
import 'core/error_handler.dart';
import 'core/app_error.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  await dotenv.load(fileName: '.env');

  // Initialize Sentry for testing
  if (Env.sentryDsn.isNotEmpty && Env.sentryDsn != 'your-sentry-dsn-here') {
    await SentryFlutter.init(
      (options) {
        options.dsn = Env.sentryDsn;
        options.environment = Env.sentryEnv;
        options.release = Env.sentryRelease;
      },
      appRunner: () => runApp(TestSentryApp()),
    );
  } else {
    runApp(TestSentryApp());
  }
}

class TestSentryApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sentry Test App',
      home: Scaffold(
        appBar: AppBar(title: Text('Sentry Test')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton(
                onPressed: _testSentryError,
                child: Text('Test Sentry Error'),
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _testSentryMessage,
                child: Text('Test Sentry Message'),
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _testAppError,
                child: Text('Test AppError with Sentry'),
              ),
              SizedBox(height: 20),
              Text(
                  'Check your Sentry dashboard after clicking the buttons above'),
            ],
          ),
        ),
      ),
    );
  }

  void _testSentryError() async {
    try {
      // Intentionally throw an error to test Sentry
      throw Exception(
          'This is a test error from the MyOrbit calendar app to verify Sentry is working');
    } catch (error, stackTrace) {
      // Capture the error with our centralized error handler
      final sentryId = await ErrorHandler.captureException(
        error,
        stackTrace: stackTrace,
        hint: 'Test error from TestSentryApp',
      );
      print('Sentry error captured with ID: $sentryId');
      debugPrint('Error sent to Sentry: $error');
    }
  }

  void _testSentryMessage() async {
    final sentryId = await ErrorHandler.captureMessage(
        'This is a test message to verify Sentry is working',
        level: SentryLevel.info);
    print('Sentry message captured with ID: $sentryId');
    debugPrint('Message sent to Sentry: This is a test message');
  }

  void _testAppError() async {
    try {
      // Throw an AppError to test the integration
      throw NetworkError.connectionFailed();
    } catch (error, stackTrace) {
      // This will properly capture the error with Sentry and provide user-friendly feedback
      final userMessage = await ErrorHandler.handleError(error,
          stackTrace: stackTrace, context: 'AppError test in TestSentryApp');
      print('AppError captured with Sentry: $userMessage');
    }
  }
}
