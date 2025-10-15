// MyOrbit widget tests
//
// Basic smoke tests for the MyOrbit calendar app.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:myorbit_calendar/main.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';

void main() {
  setUpAll(() async {
    await TimezoneService.initialize();
  });

  testWidgets('MyOrbit app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Set a reasonable screen size for testing
    await tester.binding.setSurfaceSize(const Size(800, 1200));

    final router = createAppRouter(hasOnboarded: true);

    await tester.pumpWidget(
      ProviderScope(
        child: MyOrbitApp(router: router),
      ),
    );
    await tester.pumpAndSettle();

    // Verify the app builds without crashing
    expect(find.byType(MaterialApp), findsOneWidget);

    // Reset surface size
    addTearDown(() => tester.binding.setSurfaceSize(null));
  });
}
