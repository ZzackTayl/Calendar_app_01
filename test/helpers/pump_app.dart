import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Helper extension to pump widgets with providers for testing
extension PumpApp on WidgetTester {
  /// Pump a widget wrapped in MaterialApp and ProviderScope
  ///
  /// This is the standard way to test widgets that need Material context
  /// and Riverpod providers.
  ///
  /// Example:
  /// ```dart
  /// await tester.pumpApp(
  ///   const DashboardScreen(),
  ///   overrides: [
  ///     eventListProvider.overrideWith((ref) => Future.value(mockEvents)),
  ///   ],
  /// );
  /// ```
  Future<void> pumpApp(
    Widget widget, {
    List<Override> overrides = const [],
    ThemeData? theme,
    Locale? locale,
  }) async {
    await pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: MaterialApp(
          theme: theme,
          locale: locale,
          home: Scaffold(
            body: widget,
          ),
        ),
      ),
    );
  }

  /// Pump a widget with full app context including navigation
  ///
  /// Use this when testing widgets that need navigation context
  /// or when testing the full app shell.
  ///
  /// Example:
  /// ```dart
  /// await tester.pumpAppWithNavigation(
  ///   const AppShell(),
  ///   overrides: [
  ///     eventListProvider.overrideWith((ref) => Future.value(mockEvents)),
  ///   ],
  /// );
  /// ```
  Future<void> pumpAppWithNavigation(
    Widget widget, {
    List<Override> overrides = const [],
    ThemeData? theme,
    Locale? locale,
  }) async {
    await pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: MaterialApp(
          theme: theme,
          locale: locale,
          home: widget,
        ),
      ),
    );
  }

  /// Pump a widget with minimal wrapping (just ProviderScope)
  ///
  /// Use this for testing individual widgets that don't need
  /// Material context or navigation.
  ///
  /// Example:
  /// ```dart
  /// await tester.pumpProviderScope(
  ///   const ErrorView(message: 'Test error'),
  /// );
  /// ```
  Future<void> pumpProviderScope(
    Widget widget, {
    List<Override> overrides = const [],
  }) async {
    await pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: widget,
      ),
    );
  }

  /// Pump a widget with Material context and Scaffold
  ///
  /// Use this for testing widgets that need Material context
  /// and Scaffold (e.g., for SnackBars).
  ///
  /// Example:
  /// ```dart
  /// await tester.pumpMaterialApp(
  ///   const SemanticButton(
  ///     label: 'Test',
  ///     child: ElevatedButton(onPressed: () {}, child: Text('Test')),
  ///   ),
  /// );
  /// ```
  Future<void> pumpMaterialApp(
    Widget widget, {
    List<Override> overrides = const [],
    ThemeData? theme,
  }) async {
    await pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: MaterialApp(
          theme: theme,
          home: Scaffold(
            body: widget,
          ),
        ),
      ),
    );
  }
}
