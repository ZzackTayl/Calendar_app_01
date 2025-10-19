import 'package:timezone/timezone.dart' as tz;
import '../domain/event.dart';
import 'timezone_service.dart';

/// Service for converting event times based on whether they are floating or fixed
class EventTimezoneConverter {
  /// Convert an event time to the user's current timezone,
  /// respecting floating vs fixed status
  static DateTime convertEventTimeToUserTimezone({
    required CalendarEvent event,
    required DateTime eventTime,
    required String userTimezone,
  }) {
    if (event.isFloating) {
      // Preserve the wall-clock time (hour/minute) regardless of absolute offset
      final dstLocation = TimezoneService.resolveLocation(
        TimezoneService.normalizeDisplayName(userTimezone),
      );
      final dstTzTime = tz.TZDateTime.from(eventTime, dstLocation);

      return TimezoneService.buildInTimeZone(
        displayName: userTimezone,
        year: dstTzTime.year,
        month: dstTzTime.month,
        day: dstTzTime.day,
        hour: dstTzTime.hour,
        minute: dstTzTime.minute,
        second: dstTzTime.second,
        millisecond: dstTzTime.millisecond,
        microsecond: dstTzTime.microsecond,
      );
    } else {
      // For fixed events, convert the absolute time to the user's timezone
      return TimezoneService.convert(eventTime, userTimezone);
    }
  }

  /// Get the display time for an event in the user's current timezone
  static DateTime getDisplayStartForEvent({
    required CalendarEvent event,
    required String userTimezone,
  }) {
    return convertEventTimeToUserTimezone(
      event: event,
      eventTime: event.start,
      userTimezone: userTimezone,
    );
  }

  /// Get the display time for an event end in the user's current timezone
  static DateTime getDisplayEndForEvent({
    required CalendarEvent event,
    required String userTimezone,
  }) {
    return convertEventTimeToUserTimezone(
      event: event,
      eventTime: event.end,
      userTimezone: userTimezone,
    );
  }
}
