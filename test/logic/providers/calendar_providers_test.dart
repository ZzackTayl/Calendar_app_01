import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:myorbit_calendar/logic/providers/calendar_providers.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('calendarListProvider loads offline calendars when supabase disabled',
      () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final calendars = await container.read(calendarListProvider.future);

    expect(calendars.length, 3);
    expect(
      calendars.where((calendar) => calendar.isPrimary),
      hasLength(1),
    );
  });

  test('visibleCalendarsProvider defaults to primary calendar only', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final visible = await container.read(visibleCalendarsProvider.future);

    expect(visible, contains(DevDataService.primaryCalendarId));
    expect(visible.length, 1);
  });

  test('visibleCalendarsProvider toggles secondary calendars', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container.read(visibleCalendarsProvider.future);
    await container
        .read(visibleCalendarsProvider.notifier)
        .toggleCalendar(DevDataService.familyCalendarId);

    final updated = container.read(visibleCalendarsProvider).maybeWhen(
          data: (value) => value,
          orElse: () => <String>{},
        );

    expect(
        updated,
        containsAll(<String>{
          DevDataService.primaryCalendarId,
          DevDataService.familyCalendarId,
        }));
  });

  test('setAllSecondaryVisible toggles all secondary calendars at once',
      () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    await container.read(visibleCalendarsProvider.future);
    await container
        .read(visibleCalendarsProvider.notifier)
        .setAllSecondaryVisible(true);

    var updated = container.read(visibleCalendarsProvider).maybeWhen(
          data: (value) => value,
          orElse: () => <String>{},
        );
    expect(
        updated,
        containsAll(<String>{
          DevDataService.primaryCalendarId,
          DevDataService.familyCalendarId,
          DevDataService.workCalendarId,
        }));

    await container
        .read(visibleCalendarsProvider.notifier)
        .setAllSecondaryVisible(false);
    updated = container.read(visibleCalendarsProvider).maybeWhen(
          data: (value) => value,
          orElse: () => <String>{},
        );

    expect(updated, contains(DevDataService.primaryCalendarId));
    expect(updated.contains(DevDataService.familyCalendarId), isFalse);
    expect(updated.contains(DevDataService.workCalendarId), isFalse);
  });
}
