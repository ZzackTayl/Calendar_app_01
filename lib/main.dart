import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:go_router/go_router.dart';

import 'core/env.dart';
import 'core/supabase_client.dart';
import 'ui/screens/landing_screen.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/screens/dashboard_screen.dart';
import 'ui/screens/calendar_screen.dart';
import 'ui/screens/activity_screen.dart';
import 'ui/screens/people_groups_screen.dart';
import 'ui/screens/settings_screen.dart';
import 'ui/app_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment variables
  await dotenv.load(fileName: '.env');

  // Initialize Supabase
  await SupabaseService.initialize();

  // Initialize Sentry for error tracking (skip if no DSN provided)
  if (Env.sentryDsn.isNotEmpty && Env.sentryDsn != 'your-sentry-dsn-here') {
    await SentryFlutter.init(
      (options) {
        options.dsn = Env.sentryDsn;
        options.environment = Env.sentryEnv;
        options.release = Env.sentryRelease;
      },
      appRunner: () => runApp(
        const ProviderScope(
          child: MyOrbitApp(),
        ),
      ),
    );
  } else {
    // Run without Sentry if DSN not configured
    runApp(
      const ProviderScope(
        child: MyOrbitApp(),
      ),
    );
  }
}

// Router configuration with ShellRoute for proper nested navigation
final _router = GoRouter(
  initialLocation: '/',
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
      ],
    ),
  ],
);

class MyOrbitApp extends ConsumerWidget {
  const MyOrbitApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      routerConfig: _router,
      title: 'MyOrbit',
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00D4FF), // Cyan from specification
          brightness: Brightness.light,
        ),
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF00D4FF),
          brightness: Brightness.dark,
        ),
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
    );
  }
}
