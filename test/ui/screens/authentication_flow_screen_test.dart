import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import 'package:myorbit_calendar/features/auth/presentation/pages/authentication_flow_page.dart';

import 'authentication_flow_screen_test.mocks.dart';

@GenerateMocks([FirebaseAuth])
void main() {
  group('AuthenticationFlowScreen', () {
    testWidgets(
      'navigates to dashboard when user is authenticated',
      (tester) async {
        final mockAuth = MockFirebaseAuth();
        final authStateController = StreamController<User?>.broadcast();
        addTearDown(authStateController.close);
        final router = _createRouter(initialLocation: '/auth');
        addTearDown(router.dispose);

        when(mockAuth.authStateChanges())
            .thenAnswer((_) => authStateController.stream);

        await tester.pumpWidget(
          _buildHarness(
            router: router,
            auth: mockAuth,
            hasCompletedOnboarding: true,
          ),
        );

        await tester.pump();
        expect(_currentLocation(router), '/auth');

        authStateController.add(_FakeUser());
        await _pumpUntilLocation(tester, router, '/dashboard');

        expect(_currentLocation(router), '/dashboard');
      },
    );

    testWidgets(
      'redirects to onboarding when unauthenticated and onboarding incomplete',
      (tester) async {
        final mockAuth = MockFirebaseAuth();
        final authStateController = StreamController<User?>.broadcast();
        addTearDown(authStateController.close);
        final router = _createRouter(initialLocation: '/dashboard');
        addTearDown(router.dispose);

        when(mockAuth.authStateChanges())
            .thenAnswer((_) => authStateController.stream);

        await tester.pumpWidget(
          _buildHarness(
            router: router,
            auth: mockAuth,
            hasCompletedOnboarding: false,
          ),
        );

        await tester.pump();
        expect(_currentLocation(router), '/dashboard');

        authStateController.add(null);
        await _pumpUntilLocation(tester, router, '/onboarding');

        expect(_currentLocation(router), '/onboarding');
      },
    );

    testWidgets(
      'redirects authenticated user away from onboarding flow',
      (tester) async {
        final mockAuth = MockFirebaseAuth();
        final authStateController = StreamController<User?>.broadcast();
        addTearDown(authStateController.close);
        final router = _createRouter(initialLocation: '/onboarding');
        addTearDown(router.dispose);

        when(mockAuth.authStateChanges())
            .thenAnswer((_) => authStateController.stream);

        await tester.pumpWidget(
          _buildHarness(
            router: router,
            auth: mockAuth,
            hasCompletedOnboarding: true,
          ),
        );

        await tester.pump();
        expect(_currentLocation(router), '/onboarding');

        authStateController.add(_FakeUser());
        await _pumpUntilLocation(tester, router, '/dashboard');

        expect(_currentLocation(router), '/dashboard');
      },
    );

    testWidgets(
      'redirects signed-out user to auth when onboarding already complete',
      (tester) async {
        final mockAuth = MockFirebaseAuth();
        final authStateController = StreamController<User?>.broadcast();
        addTearDown(authStateController.close);
        final router = _createRouter(initialLocation: '/dashboard');
        addTearDown(router.dispose);

        when(mockAuth.authStateChanges())
            .thenAnswer((_) => authStateController.stream);

        await tester.pumpWidget(
          _buildHarness(
            router: router,
            auth: mockAuth,
            hasCompletedOnboarding: true,
          ),
        );

        await tester.pump();
        expect(_currentLocation(router), '/dashboard');

        authStateController.add(null);
        await _pumpUntilLocation(tester, router, '/auth');

        expect(_currentLocation(router), '/auth');
      },
    );

    testWidgets(
      'does not redirect authenticated user on allowed route',
      (tester) async {
        final mockAuth = MockFirebaseAuth();
        final authStateController = StreamController<User?>.broadcast();
        addTearDown(authStateController.close);
        final router = _createRouter(initialLocation: '/calendar');
        addTearDown(router.dispose);

        when(mockAuth.authStateChanges())
            .thenAnswer((_) => authStateController.stream);

        await tester.pumpWidget(
          _buildHarness(
            router: router,
            auth: mockAuth,
            hasCompletedOnboarding: true,
          ),
        );

        authStateController.add(_FakeUser());
        await _pumpUntilLocation(tester, router, '/calendar');

        expect(_currentLocation(router), '/calendar');
      },
    );
  });
}

Widget _buildHarness({
  required GoRouter router,
  required FirebaseAuth auth,
  required bool hasCompletedOnboarding,
}) {
  return MaterialApp.router(
    routerConfig: router,
    builder: (context, child) => AuthenticationFlowScreen(
      hasCompletedOnboarding: hasCompletedOnboarding,
      router: router,
      auth: auth,
      child: child ?? const SizedBox.shrink(),
    ),
  );
}

class _TestScaffold extends StatelessWidget {
  const _TestScaffold(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text(label)),
    );
  }
}

class _FakeUser extends Fake implements User {}

String _currentLocation(GoRouter router) {
  return router.routeInformationProvider.value.uri.toString();
}

Future<void> _pumpUntilLocation(
  WidgetTester tester,
  GoRouter router,
  String expectedLocation, {
  int maxTicks = 15,
}) async {
  for (var i = 0; i < maxTicks; i++) {
    if (_currentLocation(router) == expectedLocation) {
      await tester.pump();
      return;
    }
    await tester.pump(const Duration(milliseconds: 10));
  }
  expect(_currentLocation(router), expectedLocation);
}

GoRouter _createRouter({required String initialLocation}) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: '/auth',
        builder: (context, state) => const _TestScaffold('Auth Screen'),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const _TestScaffold('Dashboard Screen'),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const _TestScaffold('Onboarding Screen'),
      ),
      GoRoute(
        path: '/calendar',
        builder: (context, state) => const _TestScaffold('Calendar Screen'),
      ),
    ],
  );
}
