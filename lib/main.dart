import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:go_router/go_router.dart';

import 'core/env.dart';
import 'core/supabase_client.dart';
import 'core/theme_constants.dart';
import 'core/timezone_service.dart';
import 'ui/screens/landing_screen.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/screens/dashboard_screen.dart';
import 'ui/screens/calendar_screen.dart';
import 'ui/screens/activity_screen.dart';
import 'ui/screens/people_groups_screen.dart';
import 'ui/screens/settings_screen.dart';
import 'ui/screens/create_event_screen.dart';
import 'ui/screens/events_list_screen.dart';
import 'ui/screens/add_contact_selection_screen.dart';
import 'ui/screens/updates_guides_screen.dart';
import 'ui/screens/signal_availability_flow.dart';
import 'ui/screens/signal_center_screen.dart';
import 'ui/screens/account_recovery_screen.dart';
import 'ui/screens/calendar_sharing_screen.dart';
import 'ui/screens/calendar_migration_screen.dart';
import 'ui/app_shell.dart';
import 'logic/providers/settings_providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  await dotenv.load(fileName: '.env');

  // Initialize Supabase
  await SupabaseService.initialize();
  await TimezoneService.initialize();

  final hasOnboarded = await _loadOnboardingStatus();
  final router = createAppRouter(hasOnboarded: hasOnboarded);

  // Initialize Sentry for error tracking (skip if no DSN provided)
  if (Env.sentryDsn.isNotEmpty && Env.sentryDsn != 'your-sentry-dsn-here') {
    await SentryFlutter.init(
      (options) {
        options.dsn = Env.sentryDsn;
        options.environment = Env.sentryEnv;
        options.release = Env.sentryRelease;
      },
      appRunner: () => runApp(
        ProviderScope(
          child: MyOrbitApp(router: router),
        ),
      ),
    );
  } else {
    // Run without Sentry if DSN not configured
    runApp(ProviderScope(child: MyOrbitApp(router: router)));
  }
}

Future<bool> _loadOnboardingStatus() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('hasOnboarded') ?? false;
}

GoRouter createAppRouter({required bool hasOnboarded}) {
  return GoRouter(
    initialLocation: hasOnboarded ? '/dashboard' : '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const LandingScreen(),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      // Main app with bottom navigation using ShellRoute
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
            path: '/signals',
            builder: (context, state) => const SignalCenterScreen(),
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
        ],
      ),
    ],
  );
}

class MyOrbitApp extends ConsumerWidget {
  const MyOrbitApp({super.key, required this.router});

  final GoRouter router;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsControllerProvider);
    final themeMode = settingsAsync.maybeWhen(
      data: (settings) =>
          settings.darkModeEnabled ? ThemeMode.dark : ThemeMode.light,
      orElse: () => ThemeMode.light,
    );

    return MaterialApp.router(
      routerConfig: router,
      title: 'MyOrbit',
      themeMode: themeMode,
      theme: AppThemes.light(),
      darkTheme: AppThemes.dark(),
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return child ?? Container();
      },
    );
  }
}
