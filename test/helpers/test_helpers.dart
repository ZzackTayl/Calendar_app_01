import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// Common test utilities for widget testing
class TestHelpers {
  /// Default test screen size
  static const Size defaultScreenSize = Size(800, 1200);

  /// Set up test environment with proper screen size
  /// Note: TimezoneService.initialize() is called once by widget_test.dart's setUpAll
  /// and is guarded against re-initialization, so we don't need to call it here.
  static Future<void> setupTestEnvironment(WidgetTester tester) async {
    await tester.binding.setSurfaceSize(defaultScreenSize);
  }

  /// Clean up test environment
  static void tearDownTestEnvironment(WidgetTester tester) {
    tester.binding.setSurfaceSize(null);
  }

  /// Find a widget by its semantic label
  static Finder findBySemanticsLabel(String label) {
    return find.bySemanticsLabel(label);
  }

  /// Find a widget by its semantic label using regex
  static Finder findBySemanticsLabelRegex(Pattern pattern) {
    return find.bySemanticsLabel(pattern);
  }

  /// Verify that a widget has proper accessibility
  static void verifyAccessibility(WidgetTester tester, Finder finder) {
    final semantics = tester.getSemantics(finder);
    expect(semantics, isNotNull, reason: 'Widget should have semantics');
  }

  /// Wait for animations to complete
  static Future<void> waitForAnimations(WidgetTester tester) async {
    await tester.pumpAndSettle();
  }

  /// Pump widget with a delay
  static Future<void> pumpWithDelay(
    WidgetTester tester, {
    Duration delay = const Duration(milliseconds: 100),
  }) async {
    await tester.pump(delay);
  }

  /// Tap and wait for animations
  static Future<void> tapAndSettle(
    WidgetTester tester,
    Finder finder,
  ) async {
    await tester.tap(finder);
    await tester.pumpAndSettle();
  }

  /// Safe tap that handles hit-testing issues
  static Future<void> safeTap(
    WidgetTester tester,
    Finder finder, {
    bool warnIfMissed = false,
  }) async {
    try {
      await tester.tap(finder, warnIfMissed: warnIfMissed);
      await tester.pumpAndSettle();
    } catch (e) {
      // If tap fails, try to find the widget and scroll to it
      if (finder.evaluate().isNotEmpty) {
        await tester.ensureVisible(finder);
        await tester.tap(finder, warnIfMissed: warnIfMissed);
        await tester.pumpAndSettle();
      } else {
        rethrow;
      }
    }
  }

  /// Enter text and wait for animations
  static Future<void> enterTextAndSettle(
    WidgetTester tester,
    Finder finder,
    String text,
  ) async {
    await tester.enterText(finder, text);
    await tester.pumpAndSettle();
  }

  /// Scroll until visible
  static Future<void> scrollUntilVisible(
    WidgetTester tester,
    Finder finder,
    Finder scrollable, {
    double delta = 100,
  }) async {
    await tester.scrollUntilVisible(
      finder,
      delta,
      scrollable: scrollable,
    );
  }

  /// Verify error state is displayed
  static void verifyErrorState(WidgetTester tester, String errorMessage) {
    expect(find.text(errorMessage), findsOneWidget);
    expect(find.byIcon(Icons.error_outline), findsOneWidget);
  }

  /// Verify loading state is displayed
  static void verifyLoadingState(WidgetTester tester) {
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  }

  /// Verify empty state is displayed
  static void verifyEmptyState(WidgetTester tester, String message) {
    expect(find.text(message), findsOneWidget);
  }
}
