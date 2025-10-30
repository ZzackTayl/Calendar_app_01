import 'package:go_router/go_router.dart';

import '../../core/services/analytics_service.dart';
import '../../ui/app_shell.dart';
import '../../ui/screens/account_recovery_screen.dart';
import '../../ui/screens/activity_screen.dart';
import '../../ui/screens/add_contact_selection_screen.dart';
import '../../ui/screens/auth_screen.dart';
import '../../ui/screens/calendar_migration_screen.dart';
import '../../ui/screens/calendar_screen.dart';
import '../../ui/screens/calendar_sharing_screen.dart';
import '../../ui/screens/create_event_screen.dart';
import '../../ui/screens/dashboard_screen.dart';
import '../../ui/screens/email_verification_screen.dart';
import '../../ui/screens/events_list_screen.dart';
import '../../ui/screens/landing_screen.dart';
import '../../ui/screens/notifications_screen.dart';
import '../../ui/screens/onboarding_screen.dart';
import '../../ui/screens/people_groups_screen.dart';
import '../../ui/screens/settings_screen.dart';
import '../../ui/screens/signal_availability_flow.dart';
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
        builder: (context, state, child) => AppShell(child: child),
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
            builder: (context, state) => const CalendarMigrationScreen(),
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
            builder: (context, state) => const AddContactSelectionScreen(),
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
            builder: (context, state) => const NotificationsScreen(),
          ),
        ],
      ),
    ],
  );
}
