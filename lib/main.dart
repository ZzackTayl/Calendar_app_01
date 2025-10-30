import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:go_router/go_router.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';

import 'core/supabase_client.dart';
import 'core/theme_constants.dart';
import 'core/timezone_service.dart';
import 'core/env.dart';
import 'core/firebase_initializer.dart';
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
import 'ui/screens/account_recovery_screen.dart';
import 'ui/screens/calendar_sharing_screen.dart';
import 'ui/screens/calendar_migration_screen.dart';
import 'ui/screens/notifications_screen.dart';
import 'ui/screens/authentication_flow_screen.dart';
import 'ui/app_shell.dart';
import 'logic/providers/settings_providers.dart';
import 'logic/providers/auth_providers.dart';
import 'logic/services/reminder_scheduling_service.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'core/di/injection_container.dart';
import 'core/di/event_dependency_injection.dart';
import 'domain/repositories/auth_repository.dart';
import 'domain/repositories/user_repository.dart';
import 'domain/repositories/event_repository.dart';
import 'presentation/bloc/user/user_bloc.dart';
import 'presentation/bloc/event/event_bloc.dart';
import 'core/observers/app_bloc_observer.dart';
import 'core/services/analytics_service.dart';

Future<void> _initializeEnvironment() async {
  final overrides = <String, String>{};

  void initializeDotEnv(Map<String, String> values) {
    // Load empty string content to initialize dotenv with provided values
    dotenv.loadFromString(
      mergeWith: values.isEmpty ? const <String, String>{} : values,
    );
  }

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
    debugPrint(
        'ℹ️  Running on web - using dart-define environment variables only');
    initializeDotEnv(overrides);
    return;
  }

  void mergeOverrides() {
    initializeDotEnv(overrides);
  }

  try {
    await dotenv.load(fileName: '.env', mergeWith: overrides);
  } on FlutterError catch (error) {
    if (overrides.isEmpty) {
      debugPrint(
        '⚠️  Environment file ".env" not found and no dart-define overrides provided. (${error.message})',
      );
      initializeDotEnv(const <String, String>{});
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
    } else {
      // Ensure dotenv is marked as initialized so downstream reads return null
      initializeDotEnv(const <String, String>{});
    }
  }
}

String? _readEnv(String key) {
  final value = dotenv.env[key];
  if (value == null) {
    return null;
  }
  final trimmed = value.trim();
  return trimmed.isEmpty ? null : trimmed;
}

void _configureSentryOptions(SentryFlutterOptions options) {
  final dsn = _readEnv('SENTRY_DSN');
  if (dsn == null) {
    debugPrint(
      '⚠️  SENTRY_DSN is not configured. Sentry will run in disabled mode.',
    );
  }

  options.dsn = dsn;
  options.sendDefaultPii = true;
  options.enableLogs = true;
  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  options.tracesSampleRate = 1.0;
  // The sampling rate for profiling is relative to tracesSampleRate
  // Setting to 1.0 will profile 100% of sampled transactions:
  options.profilesSampleRate = 1.0;
  // Configure Session Replay
  options.replay.sessionSampleRate = 0.1;
  options.replay.onErrorSampleRate = 1.0;

  options.environment =
      _readEnv('SENTRY_ENV') ?? _readEnv('FLUTTER_ENV') ?? 'development';
  options.release = _readEnv('SENTRY_RELEASE') ?? '1.0.0';
}

Future<bool> _startAppWithSentry(Widget appRoot) async {
  final hasSentryDsn = _readEnv('SENTRY_DSN');
  if (hasSentryDsn == null || hasSentryDsn.isEmpty) {
    debugPrint('ℹ️  No SENTRY_DSN found. Skipping Sentry initialization.');
    return false;
  }

  try {
    await SentryFlutter.init(
      _configureSentryOptions,
      appRunner: () => runApp(SentryWidget(child: appRoot)),
    );
    debugPrint('✅ Sentry initialized successfully.');
    return true;
  } catch (error, stackTrace) {
    debugPrint('⚠️  Failed to initialize Sentry: $error');
    debugPrint('Stack trace: $stackTrace');
    return false;
  }
}

Future<void> main() async {
  await runZonedGuarded<Future<void>>(
    () async {
      Bloc.observer = const AppBlocObserver();
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

    // Initialize Firebase first
    debugPrint('🔥 Initializing Firebase...');
    try {
      await FirebaseInitializer.initialize();
      debugPrint('✅ Firebase initialized');
    } catch (e) {
      debugPrint('⚠️  Firebase initialization failed: $e');
      debugPrint('ℹ️  App will continue without Firebase features');
      // Continue app initialization even if Firebase fails
      // This allows the app to work with Supabase only if Firebase isn't configured
    }

    final analyticsEnabled =
        Env.analyticsEnabled && (!kDebugMode || Env.analyticsEnabledInDebug);
    debugPrint('📊 Initializing AnalyticsService (enabled: $analyticsEnabled)...');
    await AnalyticsService.initialize(
      enableCollection: analyticsEnabled,
    );

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
      debugPrint(
          '⚠️  Sync queue load encountered an error: $e - starting with empty queue');
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

    debugPrint('🎨 Loading persisted theme settings...');
    final initialSettings = await _loadInitialSettings();
    debugPrint(
        '✅ Theme settings loaded (darkMode: ${initialSettings.darkModeEnabled})');

    unawaited(
      AnalyticsService.logAppLaunch(
        hasCompletedOnboarding: hasOnboarded,
        isAuthenticated: SupabaseService.isAuthenticated,
      ),
    );

    final authRepository = AuthDependencyInjection.authRepository;
    final userRepository = UserDependencyInjection.userRepository;
    final eventRepository = EventDependencyInjection.eventRepository;

    final appRoot = MultiRepositoryProvider(
      providers: [
        RepositoryProvider<AuthRepository>.value(
          value: authRepository,
        ),
        RepositoryProvider<UserRepository>.value(
          value: userRepository,
        ),
        RepositoryProvider<EventRepository>.value(
          value: eventRepository,
        ),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider<UserBloc>(
            create: (_) => UserBloc(userRepository: userRepository),
          ),
          BlocProvider<EventBloc>(
            create: (_) => EventBloc(eventRepository: eventRepository),
          ),
        ],
        child: ProviderScope(
          overrides: [
            settingsControllerProvider.overrideWith(
              () => _PreloadedSettingsController(initialSettings),
            ),
          ],
          child: MyOrbitApp(
            router: router,
            hasCompletedOnboarding: hasOnboarded,
          ),
        ),
      ),
    );

    debugPrint('🎬 Starting app...');
    final sentryStarted = await _startAppWithSentry(appRoot);
    if (!sentryStarted) {
      debugPrint('ℹ️  Starting app without Sentry.');
      runApp(appRoot);
    }
    debugPrint('✅ App started successfully!');
  } catch (e, stackTrace) {
    debugPrint('❌ Fatal error in bootstrapApp: $e');
    debugPrint('Stack trace: $stackTrace');

    try {
      if (Sentry.isEnabled) {
        await Sentry.captureException(e, stackTrace: stackTrace);
      }
    } catch (captureError, captureStack) {
      debugPrint('⚠️  Failed to report bootstrap error to Sentry: $captureError');
      debugPrint('Stack trace: $captureStack');
    }

    runApp(MaterialApp(
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
    ));
  }
}

Future<bool> _loadOnboardingStatus() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool('hasOnboarded') ?? false;
}

Future<SettingsState> _loadInitialSettings() async {
  const prefsKey = 'settings_state_v1';
  final prefs = await SharedPreferences.getInstance();
  final jsonString = prefs.getString(prefsKey);
  if (jsonString == null) {
    return const SettingsState();
  }

  try {
    final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
    return SettingsState.fromJson(decoded);
  } catch (_) {
    return const SettingsState();
  }
}

GoRouter createAppRouter({required bool hasOnboarded}) {
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

class _PreloadedSettingsController extends SettingsController {
  _PreloadedSettingsController(this._initial);

  final SettingsState _initial;

  @override
  Future<SettingsState> build() async => _initial;
}

class MyOrbitApp extends ConsumerWidget {
  const MyOrbitApp({
    super.key,
    required this.router,
    required this.hasCompletedOnboarding,
  });

  final GoRouter router;
  final bool hasCompletedOnboarding;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    try {
      // Ensure auth controller stays initialized to keep auth state in sync.
      ref.watch(authControllerProvider);
      final settingsAsync = ref.watch(settingsControllerProvider);
      final themeMode = settingsAsync.maybeWhen(
        data: (settings) =>
            settings.darkModeEnabled ? ThemeMode.dark : ThemeMode.light,
        orElse: () => ThemeMode.dark,
      );

      return MaterialApp.router(
        routerConfig: router,
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        themeMode: themeMode,
        color: themeMode == ThemeMode.dark
            ? AppColors.backgroundDark
            : AppColors.backgroundLight,
        themeAnimationDuration: Duration.zero,
        themeAnimationCurve: Curves.linear,
        theme: AppThemes.light(),
        darkTheme: AppThemes.dark(),
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        debugShowCheckedModeBanner: false,
        builder: (context, child) => AuthenticationFlowScreen(
          hasCompletedOnboarding: hasCompletedOnboarding,
          router: router,
          child: child ?? const SizedBox.shrink(),
        ),
      );
    } catch (e, stackTrace) {
      debugPrint('❌ Error building MyOrbitApp: $e\n$stackTrace');
      return MaterialApp(
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
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
