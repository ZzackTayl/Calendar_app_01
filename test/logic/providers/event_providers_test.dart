import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/logic/providers/event_providers.dart';
import 'package:myorbit_calendar/logic/providers/calendar_providers.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';

class _StubEventList extends EventList {
  _StubEventList(this._events);

  final List<CalendarEvent> _events;

  @override
  Future<List<CalendarEvent>> build() async => _events;
}

CalendarEvent _buildEvent({
  required String id,
  required DateTime start,
  required String calendarId,
}) {
  return CalendarEvent(
    id: id,
    title: 'Event $id',
    start: start,
    end: start.add(const Duration(hours: 1)),
    ownerId: DevDataService.currentUserId,
    invitedPartnerIds: const [],
    calendarId: calendarId,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('eventsForDateProvider respects calendar visibility', () async {
    final targetDate = DateTime(2025, 1, 5, 9);
    final primaryEvent = _buildEvent(
      id: 'event-primary',
      start: targetDate,
      calendarId: DevDataService.primaryCalendarId,
    );
    final secondaryEvent = _buildEvent(
      id: 'event-secondary',
      start: targetDate.add(const Duration(hours: 2)),
      calendarId: DevDataService.familyCalendarId,
    );

    final container = ProviderContainer(
      overrides: [
        eventListProvider.overrideWith(
          () => _StubEventList([primaryEvent, secondaryEvent]),
        ),
      ],
    );

    addTearDown(container.dispose);

    await container.read(eventListProvider.future);
    await container.read(calendarListProvider.future);
    await container.read(visibleCalendarsProvider.future);

    final eventsWithDefaults =
        container.read(eventsForDateProvider(targetDate));
    expect(eventsWithDefaults, hasLength(1));
    expect(eventsWithDefaults.first.id, equals(primaryEvent.id));

    await container
        .read(visibleCalendarsProvider.notifier)
        .toggleCalendar(DevDataService.familyCalendarId);
    final eventsWithSecondaries =
        container.read(eventsForDateProvider(targetDate));
    expect(eventsWithSecondaries, hasLength(2));
    expect(
      eventsWithSecondaries.map((event) => event.id),
      containsAll(<String>[primaryEvent.id, secondaryEvent.id]),
    );
  });

  test('eventsForWeekProvider filters hidden calendar events', () async {
    final weekStart = DateTime(2025, 1, 1);
    final primaryEvent = _buildEvent(
      id: 'week-primary',
      start: weekStart.add(const Duration(days: 1, hours: 10)),
      calendarId: DevDataService.primaryCalendarId,
    );
    final workEvent = _buildEvent(
      id: 'week-work',
      start: weekStart.add(const Duration(days: 2, hours: 14)),
      calendarId: DevDataService.workCalendarId,
    );

    final container = ProviderContainer(
      overrides: [
        eventListProvider.overrideWith(
          () => _StubEventList([primaryEvent, workEvent]),
        ),
      ],
    );
    addTearDown(container.dispose);

    await container.read(eventListProvider.future);
    await container.read(calendarListProvider.future);
    await container.read(visibleCalendarsProvider.future);

    final initialWeekEvents = container.read(eventsForWeekProvider(weekStart));
    expect(initialWeekEvents.map((event) => event.id).toList(),
        equals([primaryEvent.id]));

    await container
        .read(visibleCalendarsProvider.notifier)
        .setAllSecondaryVisible(true);

    final allWeekEvents = container.read(eventsForWeekProvider(weekStart));
    expect(allWeekEvents.map((event) => event.id), contains(workEvent.id));
  });
}
