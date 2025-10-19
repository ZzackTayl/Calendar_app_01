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
      // For floating events, preserve the original local time in the user's timezone
      // Convert the original time to its local components, then build in the new timezone
      final originalLocation = TimezoneService.resolveLocation(
        TimezoneService.normalizeDisplayName(userTimezone)
      );
      final originalTzTime = tz.TZDateTime.from(eventTime, originalLocation);
      
      // Extract the local time components (year, month, day, hour, minute, etc.) 
      // and build a new time in the destination timezone
      return TimezoneService.buildInTimeZone(
        displayName: userTimezone,
        year: originalTzTime.year,
        month: originalTzTime.month,
        day: originalTzTime.day,
        hour: originalTzTime.hour,
        minute: originalTzTime.minute,
        second: originalTzTime.second,
        millisecond: originalTzTime.millisecond,
        microsecond: originalTzTime.microsecond,
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