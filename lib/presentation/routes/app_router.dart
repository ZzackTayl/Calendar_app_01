import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/di/service_locator.dart';
import '../../core/services/analytics_service.dart';
import '../../features/external_calendar/presentation/cubit/calendar_migration_cubit.dart';
import '../../features/external_calendar/presentation/pages/calendar_migration_screen.dart';
import '../../features/notifications/presentation/cubit/notification_cubit.dart';
import '../../ui/app_shell.dart';
import '../../ui/screens/archived_riverpod/account_recovery_screen.dart';
import 'package:myorbit_calendar/features/notifications/presentation/pages/activity_page.dart';
import 'package:myorbit_calendar/features/contacts/presentation/pages/add_contact_selection_page.dart';
import 'package:myorbit_calendar/features/auth/presentation/pages/auth_page.dart';
import 'package:myorbit_calendar/features/calendar/presentation/pages/calendar_page.dart';
import 'package:myorbit_calendar/features/calendar_sharing/presentation/pages/calendar_sharing_page.dart';
import 'package:myorbit_calendar/features/calendar/presentation/pages/create_event_page.dart';
import 'package:myorbit_calendar/features/my_orbit/presentation/pages/dashboard_page.dart';
import 'package:myorbit_calendar/features/auth/presentation/pages/email_verification_page.dart';
import '../../ui/screens/events_list_screen_bloc.dart';
import '../../ui/screens/landing_screen.dart';
import '../../features/notifications/presentation/pages/notifications_page.dart';
import '../../ui/screens/archived_riverpod/onboarding_screen.dart';
import '../../ui/screens/people_groups_screen_bloc.dart';
import '../../ui/screens/settings_screen.dart';
import '../../ui/screens/signal_availability_flow_bloc.dart';
import '../../ui/screens/updates_guides_screen.dart';

GoRouter buildAppRouter({required bool hasOnboarded}) {
  return GoRouter(
    initialLocation: hasOnboarded ? '/dashboard' : '/auth',
    observers: AnalyticsService.navigatorObservers,
    routes: [
      GoRoute(
        path: '/auth',
        builder: (context, state) => const AuthScreen(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final email = state.extra as String?;
          if (email == null) {
            return const AuthScreen();
          }
          return EmailVerificationScreen(email: email);
        },
      ),
      GoRoute(
        path: '/',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => BlocProvider<NotificationCubit>(
          create: (_) => sl<NotificationCubit>()..loadNotifications(),
          child: AppShell(child: child),
        ),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/calendar',
            builder: (context, state) => const CalendarScreen(),
          ),
          GoRoute(
            path: '/activity',
            builder: (context, state) => const ActivityScreen(),
          ),
          GoRoute(
            path: '/people',
            builder: (context, state) => const PeopleGroupsScreen(),
          ),
          GoRoute(
            path: '/settings',
            builder: (context, state) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/account-recovery',
            builder: (context, state) => const AccountRecoveryScreen(),
          ),
          GoRoute(
            path: '/calendar-sharing',
            builder: (context, state) => const CalendarSharingScreen(),
          ),
          GoRoute(
            path: '/calendar-migration',
            builder: (context, state) => BlocProvider(
              create: (_) => sl<CalendarMigrationCubit>(),
              child: const CalendarMigrationScreen(),
            ),
          ),
          GoRoute(
            path: '/create-event',
            builder: (context, state) => const CreateEventScreen(),
          ),
          GoRoute(
            path: '/events',
            builder: (context, state) => const EventsListScreen(),
          ),
          GoRoute(
            path: '/add-contact',
            builder: (context, state) => const AddContactSelectionScreenBloc(),
          ),
          GoRoute(
            path: '/updates-guides',
            builder: (context, state) => const UpdatesGuidesScreen(),
          ),
          GoRoute(
            path: '/signal-availability',
            builder: (context, state) {
              final initialDate = state.extra is DateTime
                  ? state.extra as DateTime
                  : DateTime.now();
              return SignalAvailabilityFlowScreen(initialDate: initialDate);
            },
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsPage(),
          ),
        ],
      ),
    ],
  );
}
