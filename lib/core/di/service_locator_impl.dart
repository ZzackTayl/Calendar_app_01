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

  // ==================== Calendar Use Cases ====================

  sl.registerLazySingleton<GetCalendars>(
    () => GetCalendars(sl()),
  );

  sl.registerLazySingleton<GetVisibleCalendarIds>(
    () => GetVisibleCalendarIds(sl()),
  );

  sl.registerLazySingleton<CreateCalendar>(
    () => CreateCalendar(sl()),
  );

  sl.registerLazySingleton<UpdateCalendar>(
    () => UpdateCalendar(sl()),
  );

  sl.registerLazySingleton<DeleteCalendar>(
    () => DeleteCalendar(sl()),
  );

  sl.registerLazySingleton<UpdateVisibleCalendarIds>(
    () => UpdateVisibleCalendarIds(sl()),
  );

  sl.registerLazySingleton<EnsurePrimaryCalendar>(
    () => EnsurePrimaryCalendar(sl()),
  );

  // ==================== Contact Data Sources ====================

  sl.registerLazySingleton<ContactRemoteDataSource>(
    () => ContactFirestoreDataSource(),
  );

  // ==================== Contact Repositories ====================

  sl.registerLazySingleton<ContactRepository>(
    () => ContactRepositoryImpl(remoteDataSource: sl()),
  );

  // ==================== Contact Use Cases ====================

  sl.registerLazySingleton<GetContacts>(
    () => GetContacts(sl()),
  );

  sl.registerLazySingleton<GetContact>(
    () => GetContact(sl()),
  );

  sl.registerLazySingleton<CreateContact>(
    () => CreateContact(sl()),
  );

  sl.registerLazySingleton<UpdateContact>(
    () => UpdateContact(sl()),
  );

  sl.registerLazySingleton<DeleteContact>(
    () => DeleteContact(sl()),
  );

  sl.registerLazySingleton<GetPendingInvitations>(
    () => GetPendingInvitations(sl()),
  );

  sl.registerLazySingleton<SendInvitation>(
    () => SendInvitation(sl()),
  );

  sl.registerLazySingleton<AcceptInvitation>(
    () => AcceptInvitation(sl()),
  );

  sl.registerLazySingleton<RejectInvitation>(
    () => RejectInvitation(sl()),
  );

  // ==================== Cubits ====================

  // Auth Cubit
  sl.registerFactory<AuthCubit>(
    () => AuthCubit(repository: sl<AuthRepository>()),
  );

  // Calendar Cubits
  sl.registerFactory<CalendarCubit>(
    () => CalendarCubit(
      getCalendars: sl<GetCalendars>(),
      getVisibleCalendarIds: sl<GetVisibleCalendarIds>(),
      createCalendar: sl<CreateCalendar>(),
      updateCalendar: sl<UpdateCalendar>(),
      deleteCalendar: sl<DeleteCalendar>(),
      updateVisibleCalendarIds: sl<UpdateVisibleCalendarIds>(),
    ),
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
    () => ContactCubit(
      getContacts: sl<GetContacts>(),
      getPendingInvitations: sl<GetPendingInvitations>(),
      createContact: sl<CreateContact>(),
      updateContact: sl<UpdateContact>(),
      deleteContact: sl<DeleteContact>(),
      sendInvitation: sl<SendInvitation>(),
      acceptInvitation: sl<AcceptInvitation>(),
      rejectInvitation: sl<RejectInvitation>(),
    ),
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

  // ==================== External Calendar Use Cases ====================

  sl.registerLazySingleton<CheckExternalCalendarPermission>(
    () => CheckExternalCalendarPermission(
      sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<CheckExternalCalendarPermission>(
    () => CheckExternalCalendarPermission(
      sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  sl.registerLazySingleton<RequestExternalCalendarPermission>(
    () => RequestExternalCalendarPermission(
      sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<RequestExternalCalendarPermission>(
    () => RequestExternalCalendarPermission(
      sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  sl.registerLazySingleton<GetExternalCalendars>(
    () => GetExternalCalendars(
      sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<GetExternalCalendars>(
    () => GetExternalCalendars(
      sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  sl.registerLazySingleton<ImportExternalCalendarEvents>(
    () => ImportExternalCalendarEvents(
      sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<ImportExternalCalendarEvents>(
    () => ImportExternalCalendarEvents(
      sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  sl.registerLazySingleton<IsExternalCalendarPlatformSupported>(
    () => IsExternalCalendarPlatformSupported(
      sl<ExternalCalendarRepository>(instanceName: 'google'),
    ),
    instanceName: 'google',
  );

  sl.registerLazySingleton<IsExternalCalendarPlatformSupported>(
    () => IsExternalCalendarPlatformSupported(
      sl<ExternalCalendarRepository>(instanceName: 'apple'),
    ),
    instanceName: 'apple',
  );

  // ==================== External Calendar Cubits ====================

  sl.registerFactory<ExternalCalendarCubit>(
    () => ExternalCalendarCubit(
      checkPermission:
          sl<CheckExternalCalendarPermission>(instanceName: 'google'),
      requestPermission:
          sl<RequestExternalCalendarPermission>(instanceName: 'google'),
      getExternalCalendars: sl<GetExternalCalendars>(instanceName: 'google'),
      importExternalEvents:
          sl<ImportExternalCalendarEvents>(instanceName: 'google'),
      isPlatformSupported: sl<IsExternalCalendarPlatformSupported>(
        instanceName: 'google',
      ),
    ),
    instanceName: 'google',
  );

  sl.registerFactory<ExternalCalendarCubit>(
    () => ExternalCalendarCubit(
      checkPermission:
          sl<CheckExternalCalendarPermission>(instanceName: 'apple'),
      requestPermission:
          sl<RequestExternalCalendarPermission>(instanceName: 'apple'),
      getExternalCalendars: sl<GetExternalCalendars>(instanceName: 'apple'),
      importExternalEvents:
          sl<ImportExternalCalendarEvents>(instanceName: 'apple'),
      isPlatformSupported: sl<IsExternalCalendarPlatformSupported>(
        instanceName: 'apple',
      ),
    ),
    instanceName: 'apple',
  );

  sl.registerFactory<CalendarMigrationCubit>(
    () => CalendarMigrationCubit(
      importGoogleEvents:
          sl<ImportExternalCalendarEvents>(instanceName: 'google'),
      importAppleEvents:
          sl<ImportExternalCalendarEvents>(instanceName: 'apple'),
    ),
  );

  // ==================== Notification Data Sources ====================

  sl.registerLazySingleton<NotificationRemoteDataSource>(
    () => NotificationRemoteDataSource(),
  );

  sl.registerLazySingleton<NotificationLocalDataSource>(
    () => NotificationLocalDataSource(
      sharedPreferences: sl<SharedPreferences>(),
    ),
  );

  // ==================== Notification Repositories ====================

  sl.registerLazySingleton<NotificationRepository>(
    () => NotificationRepositoryImpl(
      remoteDataSource: sl<NotificationRemoteDataSource>(),
      localDataSource: sl<NotificationLocalDataSource>(),
    ),
  );

  // ==================== Notification Use Cases ====================

  sl.registerLazySingleton<GetNotificationsUseCase>(
    () => GetNotificationsUseCase(sl()),
  );

  sl.registerLazySingleton<MarkNotificationAsReadUseCase>(
    () => MarkNotificationAsReadUseCase(sl()),
  );

  sl.registerLazySingleton<MarkAllAsReadUseCase>(
    () => MarkAllAsReadUseCase(sl()),
  );

  sl.registerLazySingleton<DismissNotificationUseCase>(
    () => DismissNotificationUseCase(sl()),
  );

  sl.registerLazySingleton<RestoreNotificationUseCase>(
    () => RestoreNotificationUseCase(sl()),
  );

  sl.registerLazySingleton<DeleteNotificationUseCase>(
    () => DeleteNotificationUseCase(sl()),
  );

  sl.registerLazySingleton<AddNotificationUseCase>(
    () => AddNotificationUseCase(sl()),
  );

  sl.registerLazySingleton<DismissAllNotificationsUseCase>(
    () => DismissAllNotificationsUseCase(sl()),
  );

  sl.registerLazySingleton<HideBannerUseCase>(
    () => HideBannerUseCase(sl()),
  );

  // ==================== Notification Cubits ====================

  sl.registerFactory<NotificationCubit>(
    () => NotificationCubit(
      getNotifications: sl<GetNotificationsUseCase>(),
      markAsRead: sl<MarkNotificationAsReadUseCase>(),
      markAllAsRead: sl<MarkAllAsReadUseCase>(),
      dismissNotification: sl<DismissNotificationUseCase>(),
      restoreNotification: sl<RestoreNotificationUseCase>(),
      deleteNotification: sl<DeleteNotificationUseCase>(),
      dismissAll: sl<DismissAllNotificationsUseCase>(),
      hideBanner: sl<HideBannerUseCase>(),
      addNotification: sl<AddNotificationUseCase>(),
    ),
  );
}
