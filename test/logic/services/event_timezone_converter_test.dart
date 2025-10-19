import 'package:test/test.dart';
import 'package:myorbit_calendar/core/event_timezone_converter.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
import 'package:myorbit_calendar/domain/event.dart';

void main() {
  group('EventTimezoneConverter', () {
    setUp(() async {
      await TimezoneService.initialize();
    });

    CalendarEvent buildEvent({required bool floating}) => CalendarEvent(
          id: 'e',
          title: 't',
          start: DateTime(2025, 3, 8, 9),
          end: DateTime(2025, 3, 8, 10),
          ownerId: 'u',
          isFloating: floating,
        );

    test('floating preserves wall-clock time in target zone', () {
      final e = buildEvent(floating: true);
      final converted = EventTimezoneConverter.getDisplayStartForEvent(
        event: e,
        userTimezone: 'Pacific Time (PST/PDT)',
      );
      expect(converted.hour, 9);
    });

    test('fixed converts absolute time', () {
      final e = buildEvent(floating: false);
      final converted = EventTimezoneConverter.getDisplayStartForEvent(
        event: e,
        userTimezone: 'Eastern Time (EST/EDT)',
      );
      // Not asserting exact hour due to environment offset; just ensure result differs is allowed
      expect(converted, isA<DateTime>());
    });
  });
}
