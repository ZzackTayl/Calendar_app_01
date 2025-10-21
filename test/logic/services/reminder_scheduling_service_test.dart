import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;

import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/logic/services/reminder_scheduling_service.dart';

import 'reminder_scheduling_service_test.mocks.dart';

@GenerateNiceMocks([
  MockSpec<FlutterLocalNotificationsPlugin>(),
])
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  tz_data.initializeTimeZones();

  late MockFlutterLocalNotificationsPlugin plugin;

  setUp(() {
    plugin = MockFlutterLocalNotificationsPlugin();
    when(plugin.initialize(
      any,
      onDidReceiveNotificationResponse:
          anyNamed('onDidReceiveNotificationResponse'),
      onDidReceiveBackgroundNotificationResponse:
          anyNamed('onDidReceiveBackgroundNotificationResponse'),
    )).thenAnswer((_) async => true);
    when(plugin.zonedSchedule(
      any,
      any,
      any,
      any,
      any,
      androidScheduleMode: anyNamed('androidScheduleMode'),
      payload: anyNamed('payload'),
      matchDateTimeComponents: anyNamed('matchDateTimeComponents'),
    )).thenAnswer((_) async {});
    when(plugin.cancelAll()).thenAnswer((_) async {});

    ReminderSchedulingService.debugConfigure(
      pluginOverride: plugin,
      supportsNativeOverride: true,
    );
  });

  tearDown(() {
    ReminderSchedulingService.resetDebugConfiguration();
    resetMockitoState();
  });

  CalendarEvent event({
    required String id,
    required DateTime start,
    required DateTime end,
    String title = 'Test Event',
  }) {
    return CalendarEvent(
      id: id,
      title: title,
      start: start,
      end: end,
      ownerId: 'owner',
      privacyLevel: EventPrivacyLevel.normal,
    );
  }

  test('initialize delegates to notifications plugin', () async {
    await ReminderSchedulingService.initialize();

    verify(plugin.initialize(
      any,
      onDidReceiveNotificationResponse:
          anyNamed('onDidReceiveNotificationResponse'),
      onDidReceiveBackgroundNotificationResponse:
          anyNamed('onDidReceiveBackgroundNotificationResponse'),
    )).called(1);
  });

  test('scheduleReminders groups nearby events into single notification',
      () async {
    await ReminderSchedulingService.initialize();

    final now = DateTime.now().add(const Duration(hours: 2));
    final events = [
      event(
        id: 'event-1',
        start: now,
        end: now.add(const Duration(hours: 1)),
      ),
      event(
        id: 'event-2',
        start: now.add(const Duration(minutes: 20)),
        end: now.add(const Duration(hours: 1, minutes: 20)),
      ),
    ];

    await ReminderSchedulingService.scheduleReminders(
      events: events,
      reminderMinutesBefore: 30,
      isEnabled: true,
    );

    verify(plugin.zonedSchedule(
      any,
      any,
      any,
      any,
      any,
      androidScheduleMode: anyNamed('androidScheduleMode'),
      payload: anyNamed('payload'),
      matchDateTimeComponents: anyNamed('matchDateTimeComponents'),
    )).called(1);
  });

  test('scheduleReminders cancels notifications when disabled', () async {
    await ReminderSchedulingService.scheduleReminders(
      events: [],
      reminderMinutesBefore: 15,
      isEnabled: false,
    );

    verify(plugin.cancelAll()).called(1);
    verifyNever(plugin.zonedSchedule(
      any,
      any,
      any,
      any,
      any,
      androidScheduleMode: anyNamed('androidScheduleMode'),
      payload: anyNamed('payload'),
      matchDateTimeComponents: anyNamed('matchDateTimeComponents'),
    ));
  });

  test('cancelAllReminders delegates to notifications plugin', () async {
    await ReminderSchedulingService.cancelAllReminders();

    verify(plugin.cancelAll()).called(1);
  });
}
