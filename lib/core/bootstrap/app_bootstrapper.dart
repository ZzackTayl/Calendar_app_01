import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:myorbit_calendar/core/di/event_dependency_injection.dart';
import 'package:myorbit_calendar/core/di/injection_container.dart';
import 'package:myorbit_calendar/core/env.dart';
import 'package:myorbit_calendar/core/firebase_initializer.dart';
import 'package:myorbit_calendar/core/services/analytics_service.dart';
import 'package:myorbit_calendar/core/supabase_client.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/domain/repositories/auth_repository.dart';
import 'package:myorbit_calendar/domain/repositories/event_repository.dart';
import 'package:myorbit_calendar/domain/repositories/user_repository.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/logic/services/connectivity_service.dart';
import 'package:myorbit_calendar/logic/services/realtime_sync_service.dart';
import 'package:myorbit_calendar/logic/services/reminder_scheduling_service.dart';
import 'package:myorbit_calendar/logic/services/sync_queue_service.dart';
import 'package:myorbit_calendar/presentation/routes/app_router.dart';

class BootstrapProgress {
  const BootstrapProgress({
    required this.step,
    required this.totalSteps,
    required this.message,
  });

  final int step;
  final int totalSteps;
  final String message;
}

typedef BootstrapProgressCallback = void Function(BootstrapProgress progress);

class AppBootstrapData {
  AppBootstrapData({
    required this.router,
    required this.initialSettings,
    required this.hasCompletedOnboarding,
    required this.authRepository,
    required this.userRepository,
    required this.eventRepository,
  });

  final GoRouter router;
  final SettingsState initialSettings;
  final bool hasCompletedOnboarding;
  final AuthRepository authRepository;
  final UserRepository userRepository;
  final EventRepository eventRepository;
}

class AppBootstrapper {
  const AppBootstrapper();

  Future<AppBootstrapData> bootstrap({
    BootstrapProgressCallback? onProgress,
  }) async {
    debugPrint('🚀 Starting bootstrap sequence...');

    const totalSteps = 12;
    var currentStep = 0;

    Future<void> runStep(String message, FutureOr<void> Function() action) async {
      currentStep += 1;
      onProgress?.call(
        BootstrapProgress(
          step: currentStep.clamp(0, totalSteps),
          totalSteps: totalSteps,
          message: message,
        ),
      );
      await action();
    }

    await runStep('Initializing Firebase', _initializeFirebase);
    await runStep('Configuring dependency injection', _configureDependencyInjection);
    await runStep('Initializing analytics', _initializeAnalytics);
    await runStep('Initializing Supabase', _initializeSupabase);
    await runStep('Initializing timezone service', _initializeTimezoneService);
    await runStep('Loading sync queue', _loadSyncQueue);
    await runStep('Initializing connectivity service', _initializeConnectivity);
    await runStep('Initializing reminder scheduling', _initializeReminders);
    await runStep('Preparing real-time sync', _initializeRealtimeSync);

    late final bool hasOnboarded;
    await runStep('Loading onboarding status', () async {
      hasOnboarded = await _loadOnboardingStatus();
    });

    late final SettingsState initialSettings;
    await runStep('Loading persisted settings', () async {
      initialSettings = await _loadInitialSettings();
    });

    late final GoRouter router;
    await runStep('Building navigation router', () {
      router = buildAppRouter(hasOnboarded: hasOnboarded);
    });

    unawaited(
      AnalyticsService.logAppLaunch(
        hasCompletedOnboarding: hasOnboarded,
        isAuthenticated: SupabaseService.isAuthenticated,
      ),
    );

    return AppBootstrapData(
      router: router,
      initialSettings: initialSettings,
      hasCompletedOnboarding: hasOnboarded,
      authRepository: AuthDependencyInjection.authRepository,
      userRepository: UserDependencyInjection.userRepository,
      eventRepository: EventDependencyInjection.eventRepository,
    );
  }

  Future<void> _initializeFirebase() async {
    debugPrint('🔥 Initializing Firebase...');
    try {
      await FirebaseInitializer.initialize();
      debugPrint('✅ Firebase initialized');
    } catch (error) {
      debugPrint('⚠️  Firebase initialization failed: $error');
      debugPrint('ℹ️  App will continue without Firebase features');
    }
  }

  void _configureDependencyInjection() {
    if (!FirebaseInitializer.isInitialized) {
      debugPrint('ℹ️  Firebase not initialized; keeping mock data sources active.');
      return;
    }

    final shouldUseFirestore = Env.useFirestoreDataSource;
    try {
      UserDependencyInjection.useFirestore = shouldUseFirestore;
      debugPrint('🧩 User data source set to ${shouldUseFirestore ? 'Firestore' : 'mock'}');
    } catch (error) {
      debugPrint('⚠️  Failed to configure user data source: $error');
    }

    final shouldUseFirebaseAuth = Env.useFirebaseAuth;
    try {
      AuthDependencyInjection.useFirebaseAuth = shouldUseFirebaseAuth;
      debugPrint('🔐 Auth provider set to ${shouldUseFirebaseAuth ? 'FirebaseAuth' : 'mock'}');
    } catch (error) {
      debugPrint('⚠️  Failed to configure authentication provider: $error');
    }
  }

  Future<void> _initializeAnalytics() async {
    final analyticsEnabled =
        Env.analyticsEnabled && (!kDebugMode || Env.analyticsEnabledInDebug);
    debugPrint('📊 Initializing AnalyticsService (enabled: $analyticsEnabled)...');
    await AnalyticsService.initialize(
      enableCollection: analyticsEnabled,
    );
  }

  Future<void> _initializeSupabase() async {
    debugPrint('📡 Initializing SupabaseService...');
    try {
      await SupabaseService.initialize();
      debugPrint('✅ SupabaseService initialized');
    } catch (error) {
      debugPrint('⚠️  SupabaseService initialization failed: $error');
    }
  }

  Future<void> _initializeTimezoneService() async {
    debugPrint('🌍 Initializing TimezoneService...');
    try {
      await TimezoneService.initialize();
      debugPrint('✅ TimezoneService initialized');
    } catch (error) {
      debugPrint('⚠️  TimezoneService initialization failed: $error');
    }
  }

  Future<void> _loadSyncQueue() async {
    debugPrint('📋 Loading sync queue...');
    try {
      await SyncQueueService.loadQueue();
      debugPrint('✅ Sync queue loaded successfully');
    } catch (error) {
      debugPrint('⚠️  Sync queue load encountered an error: $error');
      debugPrint('ℹ️  Starting with empty queue');
    }
  }

  Future<void> _initializeConnectivity() async {
    debugPrint('📶 Initializing ConnectivityService...');
    try {
      await ConnectivityService.initialize();
      debugPrint('✅ ConnectivityService initialized');
    } catch (error) {
      debugPrint('⚠️  ConnectivityService initialization failed: $error');
    }
  }

  Future<void> _initializeReminders() async {
    debugPrint('🔔 Initializing ReminderSchedulingService...');
    try {
      await ReminderSchedulingService.initialize();
      debugPrint('✅ ReminderSchedulingService initialized');
    } catch (error) {
      debugPrint('⚠️  ReminderSchedulingService initialization failed: $error');
    }
  }

  Future<void> _initializeRealtimeSync() async {
    if (!SupabaseService.isAuthenticated) {
      debugPrint('👤 User not authenticated, skipping real-time sync');
      return;
    }

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
  }

  Future<bool> _loadOnboardingStatus() async {
    debugPrint('📱 Loading onboarding status...');
    final prefs = await SharedPreferences.getInstance();
    final hasOnboarded = prefs.getBool('hasOnboarded') ?? false;
    debugPrint('✅ Onboarding status loaded: $hasOnboarded');
    return hasOnboarded;
  }

  Future<SettingsState> _loadInitialSettings() async {
    debugPrint('🎨 Loading persisted theme settings...');
    const prefsKey = 'settings_state_v1';
    final prefs = await SharedPreferences.getInstance();
    final jsonString = prefs.getString(prefsKey);
    if (jsonString == null) {
      debugPrint('ℹ️  No persisted settings found. Using defaults.');
      return const SettingsState();
    }

    try {
      final decoded = jsonDecode(jsonString) as Map<String, dynamic>;
      final settings = SettingsState.fromJson(decoded);
      debugPrint('✅ Theme settings loaded (darkMode: ${settings.darkModeEnabled})');
      return settings;
    } catch (error) {
      debugPrint('⚠️  Failed to decode settings. Falling back to defaults.');
      return const SettingsState();
    }
  }
}

class PreloadedSettingsController extends SettingsController {
  PreloadedSettingsController(this._initial);

  final SettingsState _initial;

  @override
  Future<SettingsState> build() async => _initial;
}
