import 'package:flutter/material.dart';

class BootstrapStatusScreen extends StatelessWidget {
  const BootstrapStatusScreen({
    super.key,
    required this.message,
    this.progress,
    this.completedSteps,
    this.totalSteps,
  });

  final String message;
  final double? progress;
  final int? completedSteps;
  final int? totalSteps;

  @override
  Widget build(BuildContext context) {
    final percent = progress != null ? (progress!.clamp(0.0, 1.0) * 100).round() : null;
    final stepsLabel = (completedSteps != null && totalSteps != null && totalSteps! > 0)
        ? '${completedSteps!.clamp(0, totalSteps!)} of $totalSteps'
        : null;

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo, brightness: Brightness.dark),
      ),
      home: Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 16),
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
              ),
              if (percent != null) ...[
                const SizedBox(height: 8),
                Text('$percent% complete', style: const TextStyle(fontSize: 14)),
              ],
              if (stepsLabel != null) ...[
                const SizedBox(height: 4),
                Text(
                  stepsLabel,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class BootstrapErrorScreen extends StatelessWidget {
  const BootstrapErrorScreen({
    super.key,
    required this.message,
    this.error,
    this.stackTrace,
    this.onRetry,
  });

  final String message;
  final Object? error;
  final StackTrace? stackTrace;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final details = StringBuffer()
      ..writeln(message)
      ..writeln();
    if (error != null) {
      details..writeln('Error:')..writeln(error);
    }
    if (stackTrace != null) {
      details..writeln()..writeln(stackTrace);
    }

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(),
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Text(
                  'We hit a snag starting the app',
                  style: Theme.of(context).textTheme.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                Text(
                  details.toString(),
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                if (onRetry != null) ...[
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: onRetry,
                    child: const Text('Try again'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
