part of 'config.dart';

class AppRouter {
  late final GoRouter _router;

  AppRouter() {
    _router = GoRouter(
      initialLocation: AppRoutes.splash,
      debugLogDiagnostics: kDebugMode,
      routes: _routes,
    );
  }

  GoRouter get router => _router;

  List<RouteBase> get _routes => <RouteBase>[
    GoRoute(
      name: AppRoutes.splash,
      path: AppRoutes.splash,
      builder: (context, state) => const SplashPage(),
    ),

    GoRoute(
      name: AppRoutes.onboarding,
      path: AppRoutes.onboarding,
      builder: (context, state) => const OnboardingPage(),
    ),
    GoRoute(
      name: AppRoutes.login,
      path: AppRoutes.login,
      builder: (context, state) => const AuthPage(),
    ),

    // GoRoute(
    //   name: AppRoutes.signup,
    //   path: AppRoutes.signup,
    //   builder: (context, state) => const AuthScreen(isSignup: true),
    // ),

    // GoRoute(
    //   name: AppRoutes.verifyEmail,
    //   path: AppRoutes.verifyEmail,
    //   builder: (context, state) => const VerifyEmailPage(),
    // ),
    GoRoute(
      name: AppRoutes.home,
      path: AppRoutes.home,
      builder: (context, state) => const HomePage(),
    ),
  ];
}
