import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app_bootstrapper.dart';
import 'bootstrap_controller.dart';
import 'bootstrap_status.dart';
import 'bootstrap_status_screen.dart';
import 'package:myorbit_calendar/domain/repositories/auth_repository.dart';
import 'package:myorbit_calendar/domain/repositories/event_repository.dart';
import 'package:myorbit_calendar/domain/repositories/user_repository.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/presentation/app/my_orbit_app.dart';
import 'package:myorbit_calendar/presentation/bloc/event/event_bloc.dart';
import 'package:myorbit_calendar/presentation/bloc/user/user_bloc.dart';

class BootstrapApp extends ConsumerWidget {
  const BootstrapApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<BootstrapState>(bootstrapControllerProvider, (previous, next) {
      if (next.phase == BootstrapPhase.error && next.error != null && Sentry.isEnabled) {
        unawaited(
          Sentry.captureException(
            next.error!,
            stackTrace: next.stackTrace ?? StackTrace.current,
          ),
        );
      }
    });

    final state = ref.watch(bootstrapControllerProvider);

    switch (state.phase) {
      case BootstrapPhase.loading:
        return BootstrapStatusScreen(
          message: state.message,
          progress: state.progress,
          completedSteps: state.completedSteps,
          totalSteps: state.totalSteps,
        );
      case BootstrapPhase.error:
        return BootstrapErrorScreen(
          message: state.message,
          error: state.error,
          stackTrace: state.stackTrace,
          onRetry: () => ref.read(bootstrapControllerProvider.notifier).retry(),
        );
      case BootstrapPhase.ready:
        final data = state.data;
        if (data == null) {
          return BootstrapErrorScreen(
            message: 'Bootstrap produced no data',
            error: state.error,
            stackTrace: state.stackTrace,
            onRetry: () => ref.read(bootstrapControllerProvider.notifier).retry(),
          );
        }

        return MultiRepositoryProvider(
          providers: [
            RepositoryProvider<AuthRepository>.value(value: data.authRepository),
            RepositoryProvider<UserRepository>.value(value: data.userRepository),
            RepositoryProvider<EventRepository>.value(value: data.eventRepository),
          ],
          child: MultiBlocProvider(
            providers: [
              BlocProvider<UserBloc>(
                create: (_) => UserBloc(userRepository: data.userRepository),
              ),
              BlocProvider<EventBloc>(
                create: (_) => EventBloc(eventRepository: data.eventRepository),
              ),
            ],
            child: ProviderScope(
              overrides: [
                settingsControllerProvider.overrideWith(
                  () => PreloadedSettingsController(data.initialSettings),
                ),
              ],
              child: MyOrbitApp(
                router: data.router,
                hasCompletedOnboarding: data.hasCompletedOnboarding,
              ),
            ),
          ),
        );
    }
  }
}
