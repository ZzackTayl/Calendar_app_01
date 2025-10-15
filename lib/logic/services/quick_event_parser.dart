import 'dart:math';

import 'package:timezone/timezone.dart' as tz;

import '../../core/timezone_service.dart';

const _monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

class QuickEventDraft {
  const QuickEventDraft({
    required this.title,
    required this.start,
    required this.end,
    required this.duration,
    required this.explicitDate,
    required this.explicitTime,
  });

  final String title;
  final DateTime start;
  final DateTime end;
  final Duration duration;
  final bool explicitDate;
  final bool explicitTime;
}

class QuickEventParseResult {
  QuickEventParseResult({
    this.draft,
    List<String>? warnings,
    List<String>? errors,
  })  : warnings = warnings ?? const [],
        errors = errors ?? const [];

  final QuickEventDraft? draft;
  final List<String> warnings;
  final List<String> errors;

  bool get isValid => draft != null && errors.isEmpty;
}

class QuickEventParser {
  QuickEventParseResult parse(
    String input, {
    String timeZone = TimezoneService.defaultDisplayName,
    DateTime? reference,
  }) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      return QuickEventParseResult(
        errors: const ['Describe your event to create it quickly.'],
      );
    }

    final location = TimezoneService.resolveLocation(timeZone);
    final tzNow = reference != null
        ? tz.TZDateTime.from(reference, location)
        : TimezoneService.nowIn(timeZone) as tz.TZDateTime;

    var working = trimmed;
    final normalized = trimmed.toLowerCase();
    final warnings = <String>[];
    final errors = <String>[];

    var baseDate = tz.TZDateTime(location, tzNow.year, tzNow.month, tzNow.day);
    var explicitDate = false;

    void stripMatch(String match) {
      if (match.isEmpty) return;
      final escaped = RegExp.escape(match);
      working = working.replaceFirst(
        RegExp('\\b$escaped\\b', caseSensitive: false),
        ' ',
      );
    }

    // Relative keywords
    if (normalized.contains('tomorrow')) {
      baseDate = baseDate.add(const Duration(days: 1));
      explicitDate = true;
      stripMatch('tomorrow');
    } else if (normalized.contains('today')) {
      explicitDate = true;
      stripMatch('today');
    }

    // Day-of-week handling
    const daysOfWeek = {
      'monday': DateTime.monday,
      'tuesday': DateTime.tuesday,
      'wednesday': DateTime.wednesday,
      'thursday': DateTime.thursday,
      'friday': DateTime.friday,
      'saturday': DateTime.saturday,
      'sunday': DateTime.sunday,
    };

    for (final entry in daysOfWeek.entries) {
      final keyword = entry.key;
      final weekday = entry.value;
      final regexp = RegExp('\\b$keyword\\b', caseSensitive: false);
      if (regexp.hasMatch(normalized)) {
        var difference = weekday - baseDate.weekday;
        if (difference <= 0) {
          difference += 7;
        }
        baseDate = baseDate.add(Duration(days: difference));
        explicitDate = true;
        working = working.replaceAll(regexp, ' ');
        break;
      }
    }

    // Specific dates like "on March 5" or "March 5"
    final monthNames = _monthNames.asMap().map(
          (index, name) => MapEntry(name.toLowerCase(), index + 1),
        );
    final monthPattern =
        RegExp('\\b(${monthNames.keys.join('|')})\\s+(\\d{1,2})\\b');
    final monthMatch = monthPattern.firstMatch(normalized);
    if (monthMatch != null) {
      final monthName = monthMatch.group(1)!.toLowerCase();
      final day = int.tryParse(monthMatch.group(2)!);
      final month = monthNames[monthName];
      if (month != null && day != null) {
        var year = tzNow.year;
        if (month < tzNow.month || (month == tzNow.month && day < tzNow.day)) {
          year += 1;
        }
        baseDate = tz.TZDateTime(location, year, month, day);
        explicitDate = true;
        stripMatch(monthMatch.group(0)!);
      }
    }

    // Fallback to numeric dates like 3/15 or 03-15
    final numericDatePattern =
        RegExp(r'\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b');
    final numericMatch = numericDatePattern.firstMatch(normalized);
    if (numericMatch != null) {
      final first = int.tryParse(numericMatch.group(1)!);
      final second = int.tryParse(numericMatch.group(2)!);
      final yearToken = numericMatch.group(3);
      if (first != null && second != null) {
        final month = min(first, 12);
        final day = min(second, 31);
        final year = yearToken != null
            ? _resolveYear(yearToken, tzNow.year)
            : (tzNow.month > month || (tzNow.month == month && tzNow.day > day))
                ? tzNow.year + 1
                : tzNow.year;
        baseDate = tz.TZDateTime(location, year, month, day);
        explicitDate = true;
        stripMatch(numericMatch.group(0)!);
      }
    }

    final timePattern =
        RegExp(r'\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b', caseSensitive: false);
    final timeMatch = timePattern.firstMatch(normalized);

    var hour = 9;
    var minute = 0;
    var explicitTime = false;

    if (timeMatch != null) {
      final rawHour = int.parse(timeMatch.group(1)!);
      final rawMinute =
          timeMatch.group(2) != null ? int.parse(timeMatch.group(2)!) : 0;
      final ampm = timeMatch.group(3)?.toLowerCase();

      if (ampm != null) {
        explicitTime = true;
        hour = rawHour % 12;
        if (ampm == 'pm') {
          hour += 12;
        }
      } else if (rawHour > 23) {
        errors.add('Hour $rawHour is out of range.');
      } else {
        hour = rawHour;
        explicitTime = rawHour != 9 || rawMinute != 0;
      }

      minute = rawMinute;
      stripMatch(timeMatch.group(0)!);
    } else {
      warnings.add('No time detected, assuming 9:00 AM.');
    }

    Duration duration = const Duration(hours: 1);
    final durationPattern = RegExp(
        r'\bfor\s+(\d+)\s*(hour|hours|hr|hrs|minute|minutes|min)\b',
        caseSensitive: false);
    final durationMatch = durationPattern.firstMatch(normalized);
    if (durationMatch != null) {
      final quantity = int.tryParse(durationMatch.group(1)!);
      final unit = durationMatch.group(2)!.toLowerCase();
      if (quantity != null && quantity > 0) {
        if (unit.startsWith('hour') || unit.startsWith('hr')) {
          duration = Duration(hours: quantity);
        } else {
          duration = Duration(minutes: quantity);
        }
      }
      if (duration.inMinutes <= 10) {
        warnings.add('Duration is quite short; double-check before saving.');
      }
      stripMatch(durationMatch.group(0)!);
    }

    final tzStart = tz.TZDateTime(
      location,
      baseDate.year,
      baseDate.month,
      baseDate.day,
      hour,
      minute,
    );

    final tzEnd = tzStart.add(duration);

    if (!explicitDate && tzStart.isBefore(tzNow)) {
      final adjustedStart = tzStart.add(const Duration(days: 1));
      final adjustedEnd = tzEnd.add(const Duration(days: 1));
      warnings.add('Scheduled for tomorrow because that time already passed.');
      return _buildResult(
        working,
        adjustedStart,
        adjustedEnd,
        duration,
        explicitDate,
        explicitTime,
        warnings,
        errors,
      );
    }

    return _buildResult(
      working,
      tzStart,
      tzEnd,
      duration,
      explicitDate,
      explicitTime,
      warnings,
      errors,
    );
  }

  QuickEventParseResult _buildResult(
    String working,
    DateTime start,
    DateTime end,
    Duration duration,
    bool explicitDate,
    bool explicitTime,
    List<String> warnings,
    List<String> errors,
  ) {
    final sanitized = working
        .replaceAll(
            RegExp(r'\b(at|on|for|from|with)\b', caseSensitive: false), ' ')
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();

    final title = sanitized.isEmpty ? 'Quick Event' : _titleCase(sanitized);
    final draft = QuickEventDraft(
      title: title,
      start: start,
      end: end,
      duration: duration,
      explicitDate: explicitDate,
      explicitTime: explicitTime,
    );

    return QuickEventParseResult(
      draft: draft,
      warnings: warnings,
      errors: errors,
    );
  }

  int _resolveYear(String token, int referenceYear) {
    final digits = int.tryParse(token);
    if (digits == null) return referenceYear;
    if (token.length == 4) return digits;
    final century = referenceYear ~/ 100;
    final candidate = century * 100 + digits;
    if (candidate < referenceYear) {
      return candidate + 100;
    }
    return candidate;
  }

  String _titleCase(String value) {
    return value.split(' ').where((word) => word.isNotEmpty).map((word) {
      if (word.length == 1) return word.toUpperCase();
      return word[0].toUpperCase() + word.substring(1).toLowerCase();
    }).join(' ');
  }
}
