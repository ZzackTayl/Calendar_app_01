import 'package:flutter/material.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

void main() async {
  // Initialize Sentry with your DSN
  await SentryFlutter.init(
    (options) {
      options.dsn = 'https://85348c7e4084f6a46f47262154c4fc61@o4510190406336512.ingest.us.sentry.io/4510190409416704';
      options.environment = 'development';
      options.debug = true; // Enable debug mode to see what's happening
    },
    appRunner: () => runApp(const SentryTestApp()),
  );
}

class SentryTestApp extends StatelessWidget {
  const SentryTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sentry Test',
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Sentry Test App'),
        ),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Sentry Test App',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 20),
              Text(
                'Click the button below to send a test error to Sentry',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: () {
            // This will send an error to Sentry
            throw StateError('This is a test exception to verify Sentry is working!');
          },
          child: const Icon(Icons.bug_report),
        ),
      ),
    );
  }
}