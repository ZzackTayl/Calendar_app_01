import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

import 'core/bootstrap/app_bootstrapper.dart';
import 'core/bootstrap/bootstrap_app.dart';
import 'core/bootstrap/bootstrap_controller.dart';
import 'core/observers/app_bloc_observer.dart';
import 'core/performance/frame_time_monitor.dart';

Future<void> _initializeEnvironment() async {
  final overrides = <String, String>{};

  void initializeDotEnv(Map<String, String> values) {
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
  addOverride(
      'SENTRY_RELEASE', const String.fromEnvironment('SENTRY_RELEASE'));
  addOverride('GOOGLE_OAUTH_CLIENT_ID_IOS',
      const String.fromEnvironment('GOOGLE_OAUTH_CLIENT_ID_IOS'));
  addOverride('GOOGLE_OAUTH_CLIENT_ID_ANDROID',
      const String.fromEnvironment('GOOGLE_OAUTH_CLIENT_ID_ANDROID'));
  addOverride(
      'APPLE_SERVICES_ID', const String.fromEnvironment('APPLE_SERVICES_ID'));

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
  options.tracesSampleRate = 1.0;
  options.profilesSampleRate = 1.0;
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
      WidgetsFlutterBinding.ensureInitialized();
      Bloc.observer = const AppBlocObserver();
      assert(() {
        FrameTimeMonitor.instance.start();
        return true;
      }());

      await _initializeEnvironment();

      const bootstrapper = AppBootstrapper();
      final appRoot = ProviderScope(
        overrides: [
          appBootstrapperProvider.overrideWithValue(bootstrapper),
        ],
        child: const BootstrapApp(),
      );

      final sentryStarted = await _startAppWithSentry(appRoot);
      if (!sentryStarted) {
        debugPrint('ℹ️  Starting app without Sentry.');
        runApp(appRoot);
      }
    },
    (error, stackTrace) {
      debugPrint('❌ Unhandled error: $error');
      debugPrint('Stack trace: $stackTrace');
    },
  );
}
