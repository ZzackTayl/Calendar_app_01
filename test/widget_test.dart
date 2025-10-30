// MyOrbit widget tests
//
// Basic smoke tests for the MyOrbit calendar app.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/presentation/app/my_orbit_app.dart';
import 'package:myorbit_calendar/presentation/routes/app_router.dart';

void main() {
  setUpAll(() async {
    // Initialize timezone database once for all tests
    // This is a heavy operation (~5MB), so we do it once here instead of in each pump helper
    // All subsequent tests will skip re-initialization thanks to TimezoneService guards
    await TimezoneService.initialize();
  });

  testWidgets('MyOrbit app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Set a reasonable screen size for testing
    await tester.binding.setSurfaceSize(const Size(800, 1200));

    final router = buildAppRouter(hasOnboarded: true);

    await tester.pumpWidget(
      ProviderScope(
        child: MyOrbitApp(
          router: router,
          hasCompletedOnboarding: true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify the app builds without crashing
    expect(find.byType(MaterialApp), findsOneWidget);

    // Reset surface size
    addTearDown(() => tester.binding.setSurfaceSize(null));
  });
}
