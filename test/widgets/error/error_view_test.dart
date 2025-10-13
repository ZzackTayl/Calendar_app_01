import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/error/error_view.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('ErrorView', () {
    testWidgets('renders with required message', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(message: 'Something went wrong'),
      );

      // Message appears as both title and description
      expect(find.text('Something went wrong'), findsWidgets);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('renders with custom title', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(
          message: 'Network error',
          title: 'Connection Failed',
        ),
      );

      expect(find.text('Connection Failed'), findsOneWidget);
      expect(find.text('Network error'), findsOneWidget);
    });

    testWidgets('renders with custom icon', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(
          message: 'Test error',
          icon: Icons.warning,
        ),
      );

      expect(find.byIcon(Icons.warning), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsNothing);
    });

    testWidgets('shows retry button when onRetry is provided', (tester) async {
      var retryPressed = false;

      await tester.pumpMaterialApp(
        ErrorView(
          message: 'Failed to load',
          onRetry: () => retryPressed = true,
        ),
      );

      expect(find.byKey(const Key('error_view_retry_button')), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsOneWidget);

      await tester.tap(find.byKey(const Key('error_view_retry_button')));
      await tester.pump();

      expect(retryPressed, isTrue);
    });

    testWidgets('hides retry button when onRetry is null', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(message: 'Error without retry'),
      );

      expect(find.text('Try Again'), findsNothing);
      expect(find.byIcon(Icons.refresh), findsNothing);
    });

    testWidgets('uses theme colors correctly', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(message: 'Test error'),
      );

      final iconFinder = find.byIcon(Icons.error_outline);
      final Icon icon = tester.widget(iconFinder);

      expect(icon.color, isNotNull);
      expect(icon.size, equals(64));
    });

    testWidgets('centers content vertically and horizontally', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorView(message: 'Centered error'),
      );

      // May find multiple Center widgets due to widget tree structure
      final centerFinder = find.byType(Center);
      expect(centerFinder, findsWidgets);
    });
  });

  group('ErrorBanner', () {
    testWidgets('renders with required message', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorBanner(message: 'Banner error message'),
      );

      expect(find.text('Banner error message'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('shows retry button when onRetry is provided', (tester) async {
      var retryPressed = false;

      await tester.pumpMaterialApp(
        ErrorBanner(
          message: 'Failed to load',
          onRetry: () => retryPressed = true,
        ),
      );

      final retryButton = find.byKey(const Key('error_banner_retry_button'));
      expect(retryButton, findsOneWidget);

      await tester.tap(retryButton);
      await tester.pump();

      expect(retryPressed, isTrue);
    });

    testWidgets('shows dismiss button when onDismiss is provided',
        (tester) async {
      var dismissPressed = false;

      await tester.pumpMaterialApp(
        ErrorBanner(
          message: 'Dismissible error',
          onDismiss: () => dismissPressed = true,
        ),
      );

      final dismissButton =
          find.byKey(const Key('error_banner_dismiss_button'));
      expect(dismissButton, findsOneWidget);

      await tester.tap(dismissButton);
      await tester.pump();

      expect(dismissPressed, isTrue);
    });

    testWidgets('shows both retry and dismiss buttons', (tester) async {
      await tester.pumpMaterialApp(
        ErrorBanner(
          message: 'Error with actions',
          onRetry: () {},
          onDismiss: () {},
        ),
      );

      expect(
          find.byKey(const Key('error_banner_retry_button')), findsOneWidget);
      expect(
          find.byKey(const Key('error_banner_dismiss_button')), findsOneWidget);
    });

    testWidgets('uses custom background color', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorBanner(
          message: 'Custom color error',
          backgroundColor: Colors.red,
        ),
      );

      final container = tester.widget<Container>(
        find
            .ancestor(
              of: find.text('Custom color error'),
              matching: find.byType(Container),
            )
            .first,
      );

      final decoration = container.decoration as BoxDecoration;
      expect(decoration.color, equals(Colors.red));
    });

    testWidgets('has proper tooltip on retry button', (tester) async {
      await tester.pumpMaterialApp(
        ErrorBanner(
          message: 'Test',
          onRetry: () {},
        ),
      );

      final retryButton = tester.widget<IconButton>(
        find.byKey(const Key('error_banner_retry_button')),
      );

      expect(retryButton.tooltip, equals('Retry'));
    });

    testWidgets('has proper tooltip on dismiss button', (tester) async {
      await tester.pumpMaterialApp(
        ErrorBanner(
          message: 'Test',
          onDismiss: () {},
        ),
      );

      final dismissButton = tester.widget<IconButton>(
        find.byKey(const Key('error_banner_dismiss_button')),
      );

      expect(dismissButton.tooltip, equals('Dismiss'));
    });
  });

  group('showErrorSnackBar', () {
    testWidgets('shows snackbar with message', (tester) async {
      await tester.pumpMaterialApp(
        Builder(
          builder: (context) {
            return ElevatedButton(
              onPressed: () {
                showErrorSnackBar(
                  context,
                  message: 'Snackbar error',
                );
              },
              child: const Text('Show Error'),
            );
          },
        ),
      );

      await tester.tap(find.text('Show Error'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Snackbar error'), findsOneWidget);
    });

    testWidgets('shows retry action when provided', (tester) async {
      var retryPressed = false;

      await tester.pumpMaterialApp(
        Builder(
          builder: (context) {
            return ElevatedButton(
              onPressed: () {
                showErrorSnackBar(
                  context,
                  message: 'Error with retry',
                  onRetry: () => retryPressed = true,
                );
              },
              child: const Text('Show Error'),
            );
          },
        ),
      );

      await tester.tap(find.text('Show Error'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Retry'), findsOneWidget);

      await tester.tap(find.text('Retry'), warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(retryPressed, isTrue);
    });

    testWidgets('uses floating behavior', (tester) async {
      await tester.pumpMaterialApp(
        Builder(
          builder: (context) {
            return ElevatedButton(
              onPressed: () {
                showErrorSnackBar(
                  context,
                  message: 'Floating snackbar',
                );
              },
              child: const Text('Show Error'),
            );
          },
        ),
      );

      await tester.tap(find.text('Show Error'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));

      final snackBar = tester.widget<SnackBar>(find.byType(SnackBar));
      expect(snackBar.behavior, equals(SnackBarBehavior.floating));
    });
  });
}
