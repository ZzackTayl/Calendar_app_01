// Main application widget for MyOrbit Calendar.
//
// This widget serves as the root of the application and configures:
// - Theme (light and dark mode support)
// - Routing using GoRouter
// - Global BLoC providers
// - Localization settings
//
// The app supports dynamic theme switching based on user preferences
// and provides a consistent navigation experience throughout.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:myorbit_calender/core/cubit/cubit.dart';
import 'package:myorbit_calender/core/di/di.dart';
import 'package:myorbit_calender/core/theme/theme.dart';
import 'package:myorbit_calender/features/onboarding/presentation/cubit/cubit.dart';
import 'package:myorbit_calender/features/splash/presentation/cubit/cubit.dart';

import 'core/config/config.dart';
import 'features/auth/presentation/cubit/cubit.dart';

class MyOrbitApp extends StatelessWidget {
  const MyOrbitApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        // Auth BLoC - manages authentication state globally
        BlocProvider(create: (_) => sl<AuthCubit>()),
        BlocProvider(create: (_) => sl<SplashCubit>()),
        BlocProvider(create: (_) => sl<OnboardingCubit>()),
        BlocProvider<ThemeCubit>(create: (_) => ThemeCubit()),
      ],
      child: BlocBuilder<AuthCubit, AuthState>(
        builder: (context, authState) {
          return MaterialApp.router(
            title: 'MyOrbit Calendar',
            debugShowCheckedModeBanner: false,

            // ==================== THEME CONFIG ====================
            theme: AppThemes.light(),
            darkTheme: AppThemes.dark(),
            themeMode: ThemeMode.system,

            // ==================== ROUTER CONFIG ====================
            routerConfig: AppRouter().router,

            // ==================== BUILDER ====================
            builder: (context, child) {
              return MediaQuery(
                data: MediaQuery.of(
                  context,
                ).copyWith(textScaler: TextScaler.noScaling),
                child: child ?? const SizedBox.shrink(),
              );
            },
          );
        },
      ),
    );
  }
}
