import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/env.dart';
import 'core/supabase_client.dart';
import 'ui/screens/landing_screen.dart';
import 'ui/screens/dashboard_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Load environment variables
  await dotenv.load(fileName: '.env');
  
  // Initialize Supabase
  await SupabaseService.initialize();
  
  // Check if user has onboarded
  final prefs = await SharedPreferences.getInstance();
  final hasOnboarded = prefs.getBool('hasOnboarded') ?? false;

  // Initialize Sentry for error tracking
  await SentryFlutter.init(
    (options) {
      options.dsn = Env.sentryDsn;
      options.environment = Env.sentryEnv;
      options.release = Env.sentryRelease;
      options.beforeSend = (event, hint) {
        // Filter out sensitive data in development
        if (Env.isDevelopment) {
          return event;
        }
        return event;
      };
    },
    appRunner: () => runApp(
      ProviderScope(
        child: MyOrbitApp(hasOnboarded: hasOnboarded),
      ),
    ),
  );
}

class MyOrbitApp extends ConsumerWidget {
  final bool hasOnboarded;

  const MyOrbitApp({super.key, required this.hasOnboarded});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
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
      // Will use go_router for navigation once we set it up
      home: hasOnboarded ? const DashboardScreen() : const LandingScreen(),
    );
  }
}
