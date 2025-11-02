part of 'di.dart';

/// Global service locator instance
final sl = GetIt.instance;

/// Initialize all dependencies
Future<void> initializeDependencies() async {
  // ==================== Core Services ====================

  // Shared Preferences - needs async initialization
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerSingleton<SharedPreferences>(sharedPreferences);

  // Analytics Service
  sl.registerLazySingleton<AnalyticsService>(() => AnalyticsServiceImpl());

  // ==================== Data Sources ====================

  sl.registerLazySingleton<HomeRemoteDataSource>(
    () => HomeFirebaseDataSource(), // Register the implementation
  );

  // ==================== Repositories ====================

  sl.registerLazySingleton<HomeRepo>(
    () => HomeRepositoryImpl(remoteDataSource: sl<HomeRemoteDataSource>()),
  );

  sl.registerLazySingleton<AuthRepo>(() => AuthRepoImpl());

  // ==================== BLoC/Cubit ====================

  sl.registerFactory<AuthCubit>(() => AuthCubit(sl<AuthRepo>()));
  sl.registerFactory<SplashCubit>(() => SplashCubit(prefs: sl()));
  sl.registerFactory<OnboardingCubit>(
    () => OnboardingCubit(prefs: sl<SharedPreferences>()),
  );

  // Use factory for HomeCubit since it needs user-specific data
  sl.registerFactoryParam<HomeCubit, String, void>(
    (userId, _) => HomeCubit(repository: sl<HomeRepo>(), userId: userId),
  );
}
