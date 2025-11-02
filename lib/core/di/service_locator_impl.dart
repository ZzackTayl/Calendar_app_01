part of 'service_locator.dart';

/// Global service locator instance
final sl = GetIt.instance;

/// Initialize all dependencies
/// Call this in main.dart before runApp()
Future<void> initializeDependencies() async {
  // ==================== Core Services ====================

  // Shared Preferences - needs async initialization
  final sharedPreferences = await SharedPreferences.getInstance();
  sl.registerSingleton<SharedPreferences>(sharedPreferences);

  // Analytics Service (singleton - already exists in app)
  // Note: AnalyticsService is a static class, no need to register

  // ==================== Data Sources ====================

  // Auth Data Sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => FirebaseAuthRemoteDataSource(),
  );

  // User Data Sources
  sl.registerLazySingleton<UserRemoteDataSource>(
    () => UserFirestoreDataSource(),
  );

  // ==================== Repositories ====================

  // Auth Repository
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(remoteDataSource: sl<AuthRemoteDataSource>()),
  );

  // User Repository
  sl.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(remoteDataSource: sl<UserRemoteDataSource>()),
  );

  // ==================== Calendar & Event Data Sources ====================

  sl.registerLazySingleton<CalendarRemoteDataSource>(
    () => CalendarFirestoreDataSource(),
  );

  sl.registerLazySingleton<EventRemoteDataSource>(
    () => EventFirestoreDataSource(),
  );

  // ==================== Calendar & Event Repositories ====================

  sl.registerLazySingleton<CalendarRepository>(
    () => CalendarRepositoryImpl(remoteDataSource: sl()),
  );

  sl.registerLazySingleton<EventRepository>(
    () => EventRepositoryImpl(remoteDataSource: sl()),
  );

  // ==================== Contact Data Sources ====================

  sl.registerLazySingleton<ContactRemoteDataSource>(
    () => ContactFirestoreDataSource(),
  );

  // ==================== Contact Repositories ====================

  sl.registerLazySingleton<ContactRepository>(
    () => ContactRepositoryImpl(remoteDataSource: sl()),
  );

  // ==================== Cubits ====================

  // Auth Cubit
  sl.registerFactory<AuthCubit>(
    () => AuthCubit(repository: sl<AuthRepository>()),
  );

  // Calendar Cubits
  sl.registerFactory<CalendarCubit>(
    () => CalendarCubit(repository: sl<CalendarRepository>()),
  );

  sl.registerFactory<EventCubit>(
    () => EventCubit(repository: sl<EventRepository>()),
  );

  sl.registerFactory<SharedCalendarCubit>(
    () => SharedCalendarCubit(),
  );

  sl.registerFactory<EventInviteCubit>(
    () => EventInviteCubit(
      eventRepository: sl<EventRepository>(),
      contactRepository: sl<ContactRepository>(),
    ),
  );

  sl.registerFactory<CalendarSelectionCubit>(
    () => CalendarSelectionCubit(),
  );

  // Contact Cubits
  sl.registerFactory<ContactCubit>(
    () => ContactCubit(repository: sl<ContactRepository>()),
  );

  // ==================== Signal Data Sources ====================

  sl.registerLazySingleton<SignalRemoteDataSource>(
    () => SignalFirestoreDataSource(),
  );

  sl.registerLazySingleton<SignalShareRemoteDataSource>(
    () => SignalShareFirestoreDataSource(),
  );

  // ==================== Signal Repositories ====================

  sl.registerLazySingleton<SignalRepository>(
    () => SignalRepositoryImpl(remoteDataSource: sl()),
  );

  sl.registerLazySingleton<SignalShareRepository>(
    () => SignalShareRepositoryImpl(remoteDataSource: sl()),
  );

  // ==================== Signal Cubits ====================

  sl.registerFactory<SignalCubit>(
    () => SignalCubit(repository: sl<SignalRepository>()),
  );

  sl.registerFactory<SignalShareCubit>(
    () => SignalShareCubit(
      shareRepository: sl<SignalShareRepository>(),
      signalRepository: sl<SignalRepository>(),
    ),
  );

  // ==================== Settings Data Sources ====================

  sl.registerLazySingleton<PreferencesRemoteDataSource>(
    () => PreferencesFirestoreDataSource(),
  );

  sl.registerLazySingleton<PreferencesLocalDataSource>(
    () => PreferencesSharedPrefsDataSource(
      sharedPreferences: sl<SharedPreferences>(),
    ),
  );

  // ==================== Settings Repositories ====================

  sl.registerLazySingleton<PreferencesRepository>(
    () => PreferencesRepositoryImpl(
      remoteDataSource: sl<PreferencesRemoteDataSource>(),
      localDataSource: sl<PreferencesLocalDataSource>(),
    ),
  );

  // ==================== Settings Cubits ====================

  sl.registerFactory<SettingsCubit>(
    () => SettingsCubit(repository: sl<PreferencesRepository>()),
  );

  // ==================== External Calendar Data Sources ====================

  sl.registerLazySingleton<GoogleCalendarDataSource>(
    () => GoogleCalendarDataSourceImpl(),
  );

  sl.registerLazySingleton<AppleCalendarDataSource>(
    () => AppleCalendarDataSourceImpl(),
  );

  // ==================== External Calendar Repositories ====================

  sl.registerLazySingleton<ExternalCalendarRepository>(
    () => GoogleCalendarRepositoryImpl(
      dataSource: sl<GoogleCalendarDataSource>(),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<ExternalCalendarRepository>(
    () => AppleCalendarRepositoryImpl(
      dataSource: sl<AppleCalendarDataSource>(),
    ),
    instanceName: 'apple',
  );

  // ==================== External Calendar Cubits ====================

  sl.registerFactory<ExternalCalendarCubit>(
    () => ExternalCalendarCubit(
      repository: sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerFactory<ExternalCalendarCubit>(
    () => ExternalCalendarCubit(
      repository: sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  // ==================== Notification Repositories ====================

  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepositoryImpl(),
  );

  // ==================== Notification Cubits ====================

  sl.registerFactory<NotificationCubit>(
    () => NotificationCubit(repository: sl<NotificationRepository>()),
  );
}

