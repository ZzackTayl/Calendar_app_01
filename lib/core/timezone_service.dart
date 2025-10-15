import 'package:intl/intl.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Centralized time zone utilities to support user-configurable scheduling.
class TimezoneService {
  TimezoneService._();

  static bool _initialized = false;

  static const String defaultDisplayName = 'UTC / GMT';

  static const Map<String, String> _displayToLocation = {
    'Pacific Time (PST)': 'America/Los_Angeles',
    'Mountain Time (MST)': 'America/Denver',
    'Central Time (CST)': 'America/Chicago',
    'Eastern Time (EST)': 'America/New_York',
    'UTC / GMT': 'Etc/UTC',
    'Central European Time (CET)': 'Europe/Berlin',
  };

  /// Initialize the timezone database.
  static Future<void> initialize() async {
    if (_initialized) {
      return;
    }
    tzdata.initializeTimeZones();
    _initialized = true;
  }

  /// Available display names in preferred order.
  static List<String> get displayNames =>
      _displayToLocation.keys.toList(growable: false);

  /// Resolve a display name to a tz location identifier.
  static String _locationNameFor(String displayName) {
    final normalized = _displayToLocation[displayName];
    if (normalized != null) {
      return normalized;
    }
    return _displayToLocation[defaultDisplayName]!;
  }

  static tz.Location _location(String displayName) {
    if (!_initialized) {
      throw StateError(
          'TimezoneService.initialize must be called before usage.');
    }
    final locationName = _locationNameFor(displayName);
    return tz.getLocation(locationName);
  }

  /// Expose the underlying [tz.Location] for advanced scenarios.
  static tz.Location resolveLocation(String displayName) =>
      _location(displayName);

  /// Current DateTime in the provided timezone.
  static DateTime nowIn(String displayName) =>
      tz.TZDateTime.now(_location(displayName));

  /// Construct a DateTime in the provided timezone from calendar components.
  static DateTime buildInTimeZone({
    required String displayName,
    required int year,
    required int month,
    required int day,
    int hour = 0,
    int minute = 0,
    int second = 0,
    int millisecond = 0,
    int microsecond = 0,
  }) {
    final location = _location(displayName);
    return tz.TZDateTime(
      location,
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
    );
  }

  static tz.TZDateTime _toTzDateTime(DateTime dateTime, tz.Location location) {
    if (dateTime.isUtc) {
      return tz.TZDateTime.from(dateTime, location);
    }
    return tz.TZDateTime(
      location,
      dateTime.year,
      dateTime.month,
      dateTime.day,
      dateTime.hour,
      dateTime.minute,
      dateTime.second,
      dateTime.millisecond,
      dateTime.microsecond,
    );
  }

  /// Convert a [DateTime] into the configured timezone, preserving the instant.
  static tz.TZDateTime convert(DateTime dateTime, String displayName) {
    final location = _location(displayName);
    return _toTzDateTime(dateTime, location);
  }

  /// Convert a user-entered local [DateTime] to UTC using the target timezone.
  static DateTime toUtc(DateTime localDateTime, String displayName) {
    final location = _location(displayName);
    final tzDateTime = tz.TZDateTime(
      location,
      localDateTime.year,
      localDateTime.month,
      localDateTime.day,
      localDateTime.hour,
      localDateTime.minute,
      localDateTime.second,
      localDateTime.millisecond,
      localDateTime.microsecond,
    );
    return tzDateTime.toUtc();
  }

  /// Provide an abbreviation (e.g., PST/PDT) for the display name.
  static String abbreviationFor(String displayName, {DateTime? reference}) {
    final location = _location(displayName);
    final referenceDate = reference ?? DateTime.now();
    final tzDateTime = _toTzDateTime(referenceDate, location);
    return tzDateTime.timeZoneName;
  }

  /// Friendly formatting for list/detail views.
  static FormattedEventTime formatEventWindow({
    required DateTime start,
    required DateTime end,
    required String displayName,
    String datePattern = 'EEE, MMM d',
    String timePattern = 'h:mm a',
  }) {
    final location = _location(displayName);
    final tzStart = _toTzDateTime(start, location);
    final tzEnd = _toTzDateTime(end, location);

    final dateFormatter = DateFormat(datePattern);
    final timeFormatter = DateFormat(timePattern);

    final sameDay = tzStart.year == tzEnd.year &&
        tzStart.month == tzEnd.month &&
        tzStart.day == tzEnd.day;

    late final String dateLabel;
    late final String timeLabel;

    if (sameDay) {
      dateLabel = dateFormatter.format(tzStart);
      timeLabel =
          '${timeFormatter.format(tzStart)} – ${timeFormatter.format(tzEnd)} ${tzStart.timeZoneName}';
    } else {
      dateLabel =
          '${dateFormatter.format(tzStart)} → ${dateFormatter.format(tzEnd)}';
      timeLabel =
          '${timeFormatter.format(tzStart)} ${tzStart.timeZoneName} → ${timeFormatter.format(tzEnd)} ${tzEnd.timeZoneName}';
    }

    return FormattedEventTime(dateLabel: dateLabel, timeLabel: timeLabel);
  }
}

/// Structured labels for displaying an event window.
class FormattedEventTime {
  const FormattedEventTime({
    required this.dateLabel,
    required this.timeLabel,
  });

  final String dateLabel;
  final String timeLabel;
}
