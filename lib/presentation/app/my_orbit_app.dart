import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/l10n/app_localizations.dart';
import 'package:myorbit_calendar/logic/providers/auth_providers.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/ui/screens/authentication_flow_screen.dart';

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
    } catch (error, stackTrace) {
      debugPrint('❌ Error building MyOrbitApp: $error\n$stackTrace');
      return MaterialApp(
        onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        supportedLocales: AppLocalizations.supportedLocales,
        home: Scaffold(
          body: Center(
            child: SingleChildScrollView(
              child: Text('Error: $error\n\n$stackTrace'),
            ),
          ),
        ),
      );
    }
  }
}
