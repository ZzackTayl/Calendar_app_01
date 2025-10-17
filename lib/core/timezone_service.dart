import 'package:intl/intl.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

/// Centralized time zone utilities to support user-configurable scheduling.
class TimezoneService {
  TimezoneService._();

  static bool _initialized = false;

  static const String defaultDisplayName = 'UTC / GMT';

  static const Map<String, String> _displayToLocation = {
    // North America
    'Pacific Time (PST/PDT)': 'America/Los_Angeles',
    'Mountain Time (MST/MDT)': 'America/Denver',
    'Central Time (CST/CDT)': 'America/Chicago',
    'Eastern Time (EST/EDT)': 'America/New_York',
    'Atlantic Time (AST/ADT)': 'America/Halifax',
    
    // Europe
    'London (GMT/BST)': 'Europe/London',
    'Central European Time (CET/CEST)': 'Europe/Berlin',
    'Eastern European Time (EET/EEST)': 'Europe/Athens',
    'Moscow Time (MSK)': 'Europe/Moscow',
    
    // Asia
    'Tokyo (JST)': 'Asia/Tokyo',
    'Beijing (CST)': 'Asia/Shanghai',
    'Mumbai (IST)': 'Asia/Kolkata',
    'Dubai (GST)': 'Asia/Dubai',
    'Singapore (SGT)': 'Asia/Singapore',
    'Seoul (KST)': 'Asia/Seoul',
    
    // Australia & Pacific
    'Sydney (AEST/AEDT)': 'Australia/Sydney',
    'Melbourne (AEST/AEDT)': 'Australia/Melbourne',
    'Auckland (NZST/NZDT)': 'Pacific/Auckland',
    'Honolulu (HST)': 'Pacific/Honolulu',
    
    // South America
    'São Paulo (BRT)': 'America/Sao_Paulo',
    'Buenos Aires (ART)': 'America/Argentina/Buenos_Aires',
    
    // Africa
    'Cairo (EET)': 'Africa/Cairo',
    'Johannesburg (SAST)': 'Africa/Johannesburg',
    
    // UTC
    'UTC / GMT': 'Etc/UTC',
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

/// Automatic timezone detection and management
extension TimezoneDetection on TimezoneService {
  /// Get the device's current timezone as a display name
  static String getDeviceTimezone() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    
    // Try to find a matching display name from our supported list
    for (final entry in TimezoneService._displayToLocation.entries) {
      final location = tz.getLocation(entry.value);
      final tzNow = tz.TZDateTime.now(location);
      if (tzNow.timeZoneOffset == offset) {
        return entry.key;
      }
    }
    
    // If no exact match, try to find by offset
    final offsetHours = offset.inHours;
    final offsetMinutes = offset.inMinutes % 60;
    final offsetString = '${offsetHours >= 0 ? '+' : ''}${offsetHours.toString().padLeft(2, '0')}:${offsetMinutes.toString().padLeft(2, '0')}';
    
    // Return a generic timezone name based on offset
    return 'UTC$offsetString';
  }
  
  /// Get the device's current timezone as an IANA location string
  static String getDeviceTimezoneLocation() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    
    // Try to find a matching location from our supported list
    for (final entry in TimezoneService._displayToLocation.entries) {
      final location = tz.getLocation(entry.value);
      final tzNow = tz.TZDateTime.now(location);
      if (tzNow.timeZoneOffset == offset) {
        return entry.value;
      }
    }
    
    // Fallback to UTC if no match found
    return 'Etc/UTC';
  }
  
  /// Check if the current device timezone matches the given display name
  static bool isDeviceTimezone(String displayName) {
    final deviceTz = getDeviceTimezone();
    return deviceTz == displayName;
  }
  
  /// Get a user-friendly description of the device's current timezone
  static String getDeviceTimezoneDescription() {
    final now = DateTime.now();
    final offset = now.timeZoneOffset;
    final name = now.timeZoneName;
    final offsetHours = offset.inHours;
    final offsetMinutes = offset.inMinutes % 60;
    final offsetString = '${offsetHours >= 0 ? '+' : ''}${offsetHours.toString().padLeft(2, '0')}:${offsetMinutes.toString().padLeft(2, '0')}';
    
    return '$name (UTC$offsetString)';
  }
}
