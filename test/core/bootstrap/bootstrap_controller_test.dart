import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:myorbit_calendar/core/bootstrap/app_bootstrapper.dart';
import 'package:myorbit_calendar/core/bootstrap/bootstrap_controller.dart';
import 'package:myorbit_calendar/core/bootstrap/bootstrap_status.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('BootstrapController', () {
    test('emits progress updates in the expected order', () async {
      const expectedOrder = <String>[
        'Initializing Firebase',
        'Configuring dependency injection',
        'Initializing analytics',
        'Initializing Supabase',
        'Initializing timezone service',
        'Loading sync queue',
        'Initializing connectivity service',
        'Initializing reminder scheduling',
        'Preparing real-time sync',
        'Loading onboarding status',
        'Loading persisted settings',
        'Building navigation router',
      ];

      final recordedStepOrder = <String>[];
      final lastStepCompleter = Completer<void>();

      GoRouter buildTestRouter(bool hasOnboarded) {
        return GoRouter(
          initialLocation: hasOnboarded ? '/ready' : '/auth',
          routes: [
            GoRoute(
              path: '/auth',
              builder: (context, state) => const SizedBox.shrink(),
            ),
            GoRoute(
              path: '/ready',
              builder: (context, state) => const SizedBox.shrink(),
            ),
          ],
        );
      }

      final bootstrapper = AppBootstrapper(
        overrides: BootstrapOverrides(
          initializeFirebase: () async {
            recordedStepOrder.add('Initializing Firebase');
            await Future<void>.delayed(Duration.zero);
          },
          configureDependencyInjection: () async {
            recordedStepOrder.add('Configuring dependency injection');
            await Future<void>.delayed(Duration.zero);
          },
          initializeAnalytics: () async {
            recordedStepOrder.add('Initializing analytics');
            await Future<void>.delayed(Duration.zero);
          },
          initializeSupabase: () async {
            recordedStepOrder.add('Initializing Supabase');
            await Future<void>.delayed(Duration.zero);
          },
          initializeTimezoneService: () async {
            recordedStepOrder.add('Initializing timezone service');
            await Future<void>.delayed(Duration.zero);
          },
          loadSyncQueue: () async {
            recordedStepOrder.add('Loading sync queue');
            await Future<void>.delayed(Duration.zero);
          },
          initializeConnectivity: () async {
            recordedStepOrder.add('Initializing connectivity service');
            await Future<void>.delayed(Duration.zero);
          },
          initializeReminders: () async {
            recordedStepOrder.add('Initializing reminder scheduling');
            await Future<void>.delayed(Duration.zero);
          },
          initializeRealtimeSync: () async {
            recordedStepOrder.add('Preparing real-time sync');
            await Future<void>.delayed(Duration.zero);
          },
          loadOnboardingStatus: () async {
            recordedStepOrder.add('Loading onboarding status');
            await Future<void>.delayed(Duration.zero);
            return true;
          },
          loadInitialSettings: () async {
            recordedStepOrder.add('Loading persisted settings');
            await Future<void>.delayed(Duration.zero);
            return const SettingsState();
          },
          buildRouter: (hasOnboarded) {
            recordedStepOrder.add('Building navigation router');
            if (!lastStepCompleter.isCompleted) {
              lastStepCompleter.complete();
            }
            return buildTestRouter(hasOnboarded);
          },
          logAppLaunch: (
              {required bool hasCompletedOnboarding,
              required bool isAuthenticated}) async {
            // No-op for tests.
          },
        ),
      );

      final container = ProviderContainer(
        overrides: [
          appBootstrapperProvider.overrideWithValue(bootstrapper),
        ],
      );
      addTearDown(container.dispose);

      final observedStates = <BootstrapState>[];
      final sub = container.listen<BootstrapState>(
        bootstrapControllerProvider,
        (previous, next) => observedStates.add(next),
        fireImmediately: true,
      );
      addTearDown(sub.close);

      await lastStepCompleter.future;
      await Future<void>.delayed(Duration.zero);

      final loadingMessages = observedStates
          .where((state) => state.phase == BootstrapPhase.loading)
          .map((state) => state.message)
          .toList();

      expect(loadingMessages.first, 'Preparing services...');
      expect(loadingMessages.skip(1).toList(), expectedOrder);
      expect(recordedStepOrder, expectedOrder);

      final readyState = observedStates.lastWhere(
        (state) => state.phase == BootstrapPhase.ready,
        orElse: () => throw StateError('No ready state emitted'),
      );

      expect(readyState.message, 'Ready');
      expect(readyState.data, isNotNull);
      expect(readyState.data!.router, isA<GoRouter>());
    });
  });
}
