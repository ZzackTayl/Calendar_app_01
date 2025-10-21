import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';

import 'core/supabase_client.dart';
import 'core/theme_constants.dart';
import 'core/timezone_service.dart';
import 'logic/services/realtime_sync_service.dart';
import 'logic/services/connectivity_service.dart';
import 'logic/services/sync_queue_service.dart';
import 'ui/screens/landing_screen.dart';
import 'ui/screens/onboarding_screen.dart';
import 'ui/screens/auth_screen.dart';
import 'ui/screens/email_verification_screen.dart';
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
import 'ui/screens/notifications_screen.dart';
import 'ui/app_shell.dart';
import 'logic/providers/settings_providers.dart';
import 'logic/providers/auth_providers.dart';
import 'logic/services/reminder_scheduling_service.dart';

Future<void> _initializeEnvironment() async {
  final overrides = <String, String>{};

  void addOverride(String key, String value) {
    if (value.isNotEmpty) {
      overrides[key] = value;
    }
  }

  addOverride('FLUTTER_ENV', const String.fromEnvironment('FLUTTER_ENV'));
  addOverride(
      'DEV_SUPABASE_URL', const String.fromEnvironment('DEV_SUPABASE_URL'));
  addOverride('DEV_SUPABASE_ANON_KEY',
      const String.fromEnvironment('DEV_SUPABASE_ANON_KEY'));
  addOverride('STAGING_SUPABASE_URL',
      const String.fromEnvironment('STAGING_SUPABASE_URL'));
  addOverride('STAGING_SUPABASE_ANON_KEY',
      const String.fromEnvironment('STAGING_SUPABASE_ANON_KEY'));
  addOverride(
      'PROD_SUPABASE_URL', const String.fromEnvironment('PROD_SUPABASE_URL'));
  addOverride('PROD_SUPABASE_ANON_KEY',
      const String.fromEnvironment('PROD_SUPABASE_ANON_KEY'));
  addOverride('SENTRY_DSN', const String.fromEnvironment('SENTRY_DSN'));
  addOverride('SENTRY_ENV', const String.fromEnvironment('SENTRY_ENV'));
  addOverride('SENTRY_RELEASE', const String.fromEnvironment('SENTRY_RELEASE'));
  addOverride('GOOGLE_OAUTH_CLIENT_ID_IOS',
      const String.fromEnvironment('GOOGLE_OAUTH_CLIENT_ID_IOS'));
  addOverride('GOOGLE_OAUTH_CLIENT_ID_ANDROID',
      const String.fromEnvironment('GOOGLE_OAUTH_CLIENT_ID_ANDROID'));
  addOverride(
      'APPLE_SERVICES_ID', const String.fromEnvironment('APPLE_SERVICES_ID'));

  // Skip .env loading on web - only use dart-define values
  if (kIsWeb) {
    debugPrint('ℹ️  Running on web - using dart-define environment variables only');
    for (final MapEntry(key: key, value: value) in overrides.entries) {
      dotenv.env[key] = value;
    }
    return;
  }

  void mergeOverrides() {
    for (final MapEntry(key: key, value: value) in overrides.entries) {
      dotenv.env[key] = value;
    }
  }

  try {
    await dotenv.load(fileName: '.env', mergeWith: overrides);
  } on FlutterError catch (error) {
    if (overrides.isEmpty) {
      debugPrint(
        '⚠️  Environment file ".env" not found and no dart-define overrides provided. (${error.message})',
      );
    } else {
      debugPrint(
        '⚠️  Environment file ".env" not found, using dart-define overrides instead.',
      );
      mergeOverrides();
    }
  } catch (error, stackTrace) {
    debugPrint(
      '⚠️  Failed to load environment file: $error',
    );
    debugPrint('Stack trace: $stackTrace');
    if (overrides.isNotEmpty) {
      debugPrint(
        'ℹ️  Applying dart-define overrides despite load failure.',
      );
      mergeOverrides();
    }
  }
}

Future<void> main() async {
  await runZonedGuarded<Future<void>>(
    () async {
      WidgetsFlutterBinding.ensureInitialized();
      await _initializeEnvironment();
      await _bootstrapApp();
    },
    (error, stackTrace) {
      debugPrint('❌ Unhandled error: $error');
      debugPrint('Stack trace: $stackTrace');
    },
  );
}

Future<void> _bootstrapApp() async {
  try {
    debugPrint('🚀 Starting bootstrapApp...');

    // Temporarily comment out heavy initialization to isolate the issue
    debugPrint('📡 Initializing SupabaseService...');
    try {
      await SupabaseService.initialize();
      debugPrint('✅ SupabaseService initialized');
    } catch (e) {
      debugPrint('⚠️  SupabaseService initialization failed: $e');
    }

    debugPrint('🌍 Initializing TimezoneService...');
    try {
      await TimezoneService.initialize();
      debugPrint('✅ TimezoneService initialized');
    } catch (e) {
      debugPrint('⚠️  TimezoneService initialization failed: $e');
    }

    debugPrint('📋 Loading sync queue...');
    try {
      await SyncQueueService.loadQueue();
      debugPrint('✅ Sync queue loaded successfully');
    } catch (e) {
      debugPrint('⚠️  Sync queue load encountered an error: $e - starting with empty queue');
    }

    debugPrint('📶 Initializing ConnectivityService...');
    try {
      await ConnectivityService.initialize();
      debugPrint('✅ ConnectivityService initialized');
    } catch (e) {
      debugPrint('⚠️  ConnectivityService initialization failed: $e');
    }

    debugPrint('🔔 Initializing ReminderSchedulingService...');
    try {
      await ReminderSchedulingService.initialize();
      debugPrint('✅ ReminderSchedulingService initialized');
    } catch (e) {
      debugPrint('⚠️  ReminderSchedulingService initialization failed: $e');
    }

    // Initialize real-time sync if user is authenticated
    if (SupabaseService.isAuthenticated) {
      debugPrint('🔄 User authenticated, setting up real-time sync...');
      await RealtimeSyncService.subscribeToEvents();
      debugPrint('✅ Events subscription active');

      await RealtimeSyncService.subscribeToContacts();
      debugPrint('✅ Contacts subscription active');

      await RealtimeSyncService.subscribeToSignals();
      debugPrint('✅ Signals subscription active');

      await RealtimeSyncService.subscribeToShares();
      debugPrint('✅ Shares subscription active');

      debugPrint('⚡ Processing sync queue...');
      await SyncQueueService.processQueue();
      debugPrint('✅ Sync queue processed');
    } else {
      debugPrint('👤 User not authenticated, skipping real-time sync');
    }

    debugPrint('📱 Loading onboarding status...');
    final hasOnboarded = await _loadOnboardingStatus();
    debugPrint('✅ Onboarding status loaded: $hasOnboarded');

    debugPrint('🛣️ Creating app router...');
    final router = createAppRouter(hasOnboarded: hasOnboarded);
    debugPrint('✅ App router created');

    debugPrint('🎬 Starting app...');
    runApp(
      ProviderScope(
        child: MyOrbitApp(router: router),
      ),
    );
    debugPrint('✅ App started successfully!');
  } catch (e, stackTrace) {
    debugPrint('❌ Fatal error in bootstrapApp: $e');
    debugPrint('Stack trace: $stackTrace');
    runApp(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Startup Error:\n\n$e\n\n$stackTrace'),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

Future<bool> _loadOnboardingStatus() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('hasOnboarded') ?? false;
}

GoRouter createAppRouter({required bool hasOnboarded}) {
  return GoRouter(
    initialLocation: hasOnboarded ? '/dashboard' : '/auth',
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
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
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
    try {
      // Ensure auth controller stays initialized to keep auth state in sync.
      ref.watch(authControllerProvider);
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
    } catch (e, stackTrace) {
      debugPrint('❌ Error building MyOrbitApp: $e\n$stackTrace');
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: SingleChildScrollView(
              child: Text('Error: $e\n\n$stackTrace'),
            ),
          ),
        ),
      );
    }
  }
}
