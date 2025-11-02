import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'app_bootstrapper.dart';
import 'bootstrap_cubit.dart';
import 'bootstrap_status.dart';
import 'bootstrap_status_screen.dart';
import 'package:myorbit_calendar/domain/repositories/auth_repository.dart';
import 'package:myorbit_calendar/domain/repositories/event_repository.dart';
import 'package:myorbit_calendar/domain/repositories/user_repository.dart';
import 'package:myorbit_calendar/presentation/app/my_orbit_app.dart';
import 'package:myorbit_calendar/presentation/bloc/event/event_bloc.dart';
import 'package:myorbit_calendar/presentation/bloc/user/user_bloc.dart';
import 'package:myorbit_calendar/presentation/cubit/auth/auth_cubit.dart';
import 'package:myorbit_calendar/presentation/cubit/calendar/calendars_cubit.dart';
import 'package:myorbit_calendar/presentation/cubit/onboarding/onboarding_cubit.dart';
import 'package:myorbit_calendar/presentation/cubit/profile/user_profile_cubit.dart';
import 'package:myorbit_calendar/presentation/cubit/settings/settings_cubit.dart';
import 'package:myorbit_calendar/features/calendar/presentation/cubit/calendar_view_cubit.dart';
import 'package:myorbit_calendar/features/calendar/presentation/cubit/event_cubit.dart';
import 'package:myorbit_calendar/features/calendar/presentation/cubit/shared_calendar_cubit.dart';
import 'package:myorbit_calendar/features/signals/presentation/cubit/signal_cubit.dart';
import 'package:myorbit_calendar/features/contacts/presentation/cubit/contact_cubit.dart';
import 'package:myorbit_calendar/features/notifications/presentation/cubit/notification_cubit.dart';
import 'package:myorbit_calendar/core/di/service_locator.dart';

class BootstrapAppBloc extends StatelessWidget {
  const BootstrapAppBloc({super.key, this.bootstrapper = const AppBootstrapper()});

  final AppBootstrapper bootstrapper;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => BootstrapCubit(bootstrapper: bootstrapper),
      child: BlocListener<BootstrapCubit, BootstrapState>(
        listenWhen: (prev, next) => prev.phase != next.phase && next.phase == BootstrapPhase.error,
        listener: (context, state) {
          if (state.phase == BootstrapPhase.error && state.error != null && Sentry.isEnabled) {
            unawaited(
              Sentry.captureException(
                state.error!,
                stackTrace: state.stackTrace ?? StackTrace.current,
              ),
            );
          }
        },
        child: BlocBuilder<BootstrapCubit, BootstrapState>(
          builder: (context, state) {
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
                  onRetry: () => context.read<BootstrapCubit>().retry(),
                );
              case BootstrapPhase.ready:
                final data = state.data;
                if (data == null) {
                  return BootstrapErrorScreen(
                    message: 'Bootstrap produced no data',
                    error: state.error,
                    stackTrace: state.stackTrace,
                    onRetry: () => context.read<BootstrapCubit>().retry(),
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
                      BlocProvider<SettingsCubit>(
                        create: (_) => SettingsCubit(initialSettings: data.initialSettings),
                      ),
                      BlocProvider<UserProfileCubit>(
                        create: (_) => UserProfileCubit(),
                      ),
                      BlocProvider<AuthCubit>(
                        create: (context) =>
                            AuthCubit(repository: context.read<AuthRepository>()),
                      ),
                      BlocProvider<CalendarsCubit>(
                        create: (_) => CalendarsCubit(),
                      ),
                      BlocProvider<OnboardingCubit>(
                        create: (_) => OnboardingCubit(),
                      ),
                      BlocProvider<CalendarViewCubit>(
                        create: (_) => CalendarViewCubit(),
                      ),
                      BlocProvider<EventCubit>(
                        create: (_) => sl<EventCubit>(),
                      ),
                      BlocProvider<SignalCubit>(
                        create: (_) => sl<SignalCubit>(),
                      ),
                      BlocProvider<ContactCubit>(
                        create: (_) => sl<ContactCubit>(),
                      ),
                      BlocProvider<SharedCalendarCubit>(
                        create: (_) => SharedCalendarCubit(),
                      ),
                      BlocProvider<NotificationCubit>(
                        create: (_) => sl<NotificationCubit>(),
                      ),
                    ],
                    child: ProviderScope(
                      child: MyOrbitApp(
                        router: data.router,
                        hasCompletedOnboarding: data.hasCompletedOnboarding,
                      ),
                    ),
                  ),
                );
            }
          },
        ),
      ),
    );
  }
}
