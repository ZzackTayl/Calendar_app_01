/// Recurrence Rule domain model for recurring events in MyOrbit
///
/// Supports standard recurrence patterns including daily, weekly, monthly,
/// and yearly patterns with custom intervals and end conditions.
library;

/// Recurrence pattern types
enum RecurrencePattern {
  /// Repeats daily (every N days)
  daily,

  /// Repeats weekly (specific days of week)
  weekly,

  /// Repeats monthly (same date or same weekday)
  monthly,

  /// Repeats yearly (anniversaries, birthdays)
  yearly,
}

/// Monthly recurrence types
enum MonthlyPattern {
  /// Same date each month (e.g., 15th of each month)
  sameDate,

  /// Same weekday each month (e.g., 1st Tuesday of each month)
  sameWeekday,

  /// Last day of each month
  lastDay,
}

/// End condition for recurrence
enum RecurrenceEndType {
  /// Never ends
  never,

  /// Ends after N occurrences
  afterOccurrences,

  /// Ends on specific date
  onDate,
}

/// Days of the week (Sunday = 0, Monday = 1, etc.)
enum WeekDay {
  sunday(0),
  monday(1),
  tuesday(2),
  wednesday(3),
  thursday(4),
  friday(5),
  saturday(6);

  const WeekDay(this.value);
  final int value;

  /// Get WeekDay from DateTime.weekday (Monday = 1, Sunday = 7)
  static WeekDay fromDateTime(int weekday) {
    switch (weekday) {
      case DateTime.monday:
        return monday;
      case DateTime.tuesday:
        return tuesday;
      case DateTime.wednesday:
        return wednesday;
      case DateTime.thursday:
        return thursday;
      case DateTime.friday:
        return friday;
      case DateTime.saturday:
        return saturday;
      case DateTime.sunday:
        return sunday;
      default:
        throw ArgumentError('Invalid weekday: $weekday');
    }
  }

  /// Convert to DateTime.weekday format
  int get dateTimeWeekday {
    switch (this) {
      case sunday:
        return DateTime.sunday;
      case monday:
        return DateTime.monday;
      case tuesday:
        return DateTime.tuesday;
      case wednesday:
        return DateTime.wednesday;
      case thursday:
        return DateTime.thursday;
      case friday:
        return DateTime.friday;
      case saturday:
        return DateTime.saturday;
    }
  }
}

/// Recurrence rule defining how events repeat
class RecurrenceRule {
  final String id;
  final RecurrencePattern pattern;
  final int interval; // Every N days/weeks/months/years
  final List<WeekDay> daysOfWeek; // For weekly patterns
  final MonthlyPattern? monthlyPattern; // For monthly patterns
  final RecurrenceEndType endType;
  final int? occurrenceCount; // For afterOccurrences end type
  final DateTime? endDate; // For onDate end type
  final List<DateTime> exceptions; // Dates to skip
  final DateTime createdAt;

  const RecurrenceRule({
    required this.id,
    required this.pattern,
    required this.interval,
    this.daysOfWeek = const [],
    this.monthlyPattern,
    required this.endType,
    this.occurrenceCount,
    this.endDate,
    this.exceptions = const [],
    required this.createdAt,
  });

  /// Create RecurrenceRule from JSON
  factory RecurrenceRule.fromJson(Map<String, dynamic> json) {
    return RecurrenceRule(
      id: json['id'] as String,
      pattern: RecurrencePattern.values.firstWhere(
        (e) => e.name == json['pattern'],
        orElse: () => RecurrencePattern.daily,
      ),
      interval: json['interval'] as int,
      daysOfWeek: (json['days_of_week'] as List<dynamic>?)
              ?.map((day) => WeekDay.values[day as int])
              .toList() ??
          [],
      monthlyPattern: json['monthly_pattern'] != null
          ? MonthlyPattern.values.firstWhere(
              (e) => e.name == json['monthly_pattern'],
              orElse: () => MonthlyPattern.sameDate,
            )
          : null,
      endType: RecurrenceEndType.values.firstWhere(
        (e) => e.name == json['end_type'],
        orElse: () => RecurrenceEndType.never,
      ),
      occurrenceCount: json['occurrence_count'] as int?,
      endDate: json['end_date'] != null
          ? DateTime.parse(json['end_date'] as String)
          : null,
      exceptions: (json['exceptions'] as List<dynamic>?)
              ?.map((date) => DateTime.parse(date as String))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert RecurrenceRule to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'pattern': pattern.name,
      'interval': interval,
      'days_of_week': daysOfWeek.map((day) => day.value).toList(),
      'monthly_pattern': monthlyPattern?.name,
      'end_type': endType.name,
      'occurrence_count': occurrenceCount,
      'end_date': endDate?.toIso8601String(),
      'exceptions': exceptions.map((date) => date.toIso8601String()).toList(),
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Create a copy with modified fields
  RecurrenceRule copyWith({
    String? id,
    RecurrencePattern? pattern,
    int? interval,
    List<WeekDay>? daysOfWeek,
    MonthlyPattern? monthlyPattern,
    RecurrenceEndType? endType,
    int? occurrenceCount,
    DateTime? endDate,
    List<DateTime>? exceptions,
    DateTime? createdAt,
  }) {
    return RecurrenceRule(
      id: id ?? this.id,
      pattern: pattern ?? this.pattern,
      interval: interval ?? this.interval,
      daysOfWeek: daysOfWeek ?? this.daysOfWeek,
      monthlyPattern: monthlyPattern ?? this.monthlyPattern,
      endType: endType ?? this.endType,
      occurrenceCount: occurrenceCount ?? this.occurrenceCount,
      endDate: endDate ?? this.endDate,
      exceptions: exceptions ?? this.exceptions,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Generate list of occurrence dates for this recurrence rule
  List<DateTime> generateOccurrences({
    required DateTime startDate,
    required DateTime rangeStart,
    required DateTime rangeEnd,
    int? maxOccurrences,
  }) {
    final occurrences = <DateTime>[];
    var currentDate = startDate;
    final originalStart = startDate;
    var occurrenceCounter = 0;
    final maxCount = maxOccurrences ?? 1000; // Safety limit

    while (occurrences.length < maxCount) {
      // Check if we've reached the end conditions
      if (endType == RecurrenceEndType.afterOccurrences &&
          occurrenceCount != null &&
          occurrenceCounter >= occurrenceCount!) {
        break;
      }

      if (endType == RecurrenceEndType.onDate &&
          endDate != null &&
          currentDate.isAfter(endDate!)) {
        break;
      }

      // Check if current date is in range and not an exception
      if (currentDate.isAfter(rangeStart.subtract(const Duration(days: 1))) &&
          currentDate.isBefore(rangeEnd.add(const Duration(days: 1))) &&
          !exceptions.any((exception) => _isSameDay(currentDate, exception))) {
        occurrences.add(currentDate);
      }

      occurrenceCounter++;

      // Calculate next occurrence based on pattern
      switch (pattern) {
        case RecurrencePattern.daily:
          currentDate = currentDate.add(Duration(days: interval));
          break;

        case RecurrencePattern.weekly:
          currentDate = _nextWeeklyOccurrence(currentDate);
          break;

        case RecurrencePattern.monthly:
          currentDate = _nextMonthlyOccurrence(currentDate, startDate);
          break;

        case RecurrencePattern.yearly:
          currentDate = _nextYearlyOccurrence(
            current: currentDate,
            originalStart: originalStart,
          );
          break;
      }

      // Break if we've moved past the range end significantly
      if (currentDate.isAfter(rangeEnd.add(const Duration(days: 365)))) {
        break;
      }
    }

    return occurrences;
  }

  /// Calculate next weekly occurrence
  DateTime _nextWeeklyOccurrence(DateTime current) {
    if (daysOfWeek.isEmpty) {
      return current.add(Duration(days: 7 * interval));
    }

    final currentWeekday = WeekDay.fromDateTime(current.weekday);
    final currentIndex = daysOfWeek.indexOf(currentWeekday);

    if (currentIndex != -1 && currentIndex < daysOfWeek.length - 1) {
      // Move to next day in current week
      final nextDay = daysOfWeek[currentIndex + 1];
      final daysToAdd = nextDay.dateTimeWeekday - current.weekday;
      return current.add(Duration(days: daysToAdd));
    } else {
      // Move to first day of next week interval
      final mondayOfCurrentWeek =
          current.subtract(Duration(days: current.weekday - 1));
      final mondayOfNextInterval =
          mondayOfCurrentWeek.add(Duration(days: 7 * interval));
      final firstAllowedDay = daysOfWeek.first;
      final daysToFirstAllowed = firstAllowedDay.dateTimeWeekday - 1;
      return mondayOfNextInterval.add(Duration(days: daysToFirstAllowed));
    }
  }

  /// Calculate next monthly occurrence
  DateTime _nextMonthlyOccurrence(DateTime current, DateTime originalStart) {
    final nextMonth = DateTime(current.year, current.month + interval, 1);

    switch (monthlyPattern) {
      case MonthlyPattern.sameDate:
        final daysInNextMonth =
            _getDaysInMonth(nextMonth.year, nextMonth.month);
        final targetDay = originalStart.day.clamp(1, daysInNextMonth);
        return DateTime(nextMonth.year, nextMonth.month, targetDay);

      case MonthlyPattern.sameWeekday:
        return _findSameWeekdayInMonth(originalStart, nextMonth);

      case MonthlyPattern.lastDay:
        final daysInNextMonth =
            _getDaysInMonth(nextMonth.year, nextMonth.month);
        return DateTime(nextMonth.year, nextMonth.month, daysInNextMonth);

      case null:
        final daysInNextMonth =
            _getDaysInMonth(nextMonth.year, nextMonth.month);
        final targetDay = originalStart.day.clamp(1, daysInNextMonth);
        return DateTime(nextMonth.year, nextMonth.month, targetDay);
    }
  }

  /// Find the same weekday occurrence in the target month
  DateTime _findSameWeekdayInMonth(DateTime original, DateTime targetMonth) {
    final originalWeekday = original.weekday;
    final weekNumber = ((original.day - 1) / 7).floor() + 1;

    // Find the first occurrence of the weekday in the target month
    var date = DateTime(targetMonth.year, targetMonth.month, 1);
    while (date.weekday != originalWeekday) {
      date = date.add(const Duration(days: 1));
    }

    // Move to the correct week
    date = date.add(Duration(days: (weekNumber - 1) * 7));

    // If we've gone past the end of the month, use the last occurrence
    final daysInMonth = _getDaysInMonth(targetMonth.year, targetMonth.month);
    if (date.day > daysInMonth) {
      date = date.subtract(const Duration(days: 7));
    }

    return date;
  }

  /// Calculate next yearly occurrence
  DateTime _nextYearlyOccurrence({
    required DateTime current,
    required DateTime originalStart,
  }) {
    final targetYear = current.year + interval;
    final originalMonth = originalStart.month;
    final originalDay = originalStart.day;

    if (originalMonth == 2 && originalDay == 29) {
      return _isLeapYear(targetYear)
          ? DateTime(targetYear, 2, 29)
          : DateTime(targetYear, 2, 28);
    }

    final daysInTargetMonth = _getDaysInMonth(targetYear, originalMonth);
    final safeDay = originalDay.clamp(1, daysInTargetMonth);
    return DateTime(targetYear, originalMonth, safeDay);
  }

  /// Check if a year is a leap year
  bool _isLeapYear(int year) {
    return (year % 4 == 0) && ((year % 100 != 0) || (year % 400 == 0));
  }

  /// Check if two dates are the same day
  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  /// Get the number of days in a given month
  int _getDaysInMonth(int year, int month) {
    return DateTime(year, month + 1, 0).day;
  }

  /// Get human-readable description of the recurrence rule
  String get description {
    final buffer = StringBuffer();

    switch (pattern) {
      case RecurrencePattern.daily:
        if (interval == 1) {
          buffer.write('Daily');
        } else {
          buffer.write('Every $interval days');
        }
        break;

      case RecurrencePattern.weekly:
        if (daysOfWeek.isEmpty) {
          if (interval == 1) {
            buffer.write('Weekly');
          } else {
            buffer.write('Every $interval weeks');
          }
        } else {
          buffer.write('Weekly on ');
          buffer.write(daysOfWeek.map((day) => _dayName(day)).join(', '));
        }
        break;

      case RecurrencePattern.monthly:
        if (interval == 1) {
          buffer.write('Monthly');
        } else {
          buffer.write('Every $interval months');
        }

        switch (monthlyPattern) {
          case MonthlyPattern.sameWeekday:
            buffer.write(' on the same weekday');
            break;
          case MonthlyPattern.lastDay:
            buffer.write(' on the last day');
            break;
          case null:
          case MonthlyPattern.sameDate:
            break;
        }
        break;

      case RecurrencePattern.yearly:
        if (interval == 1) {
          buffer.write('Yearly');
        } else {
          buffer.write('Every $interval years');
        }
        break;
    }

    // Add end condition
    switch (endType) {
      case RecurrenceEndType.afterOccurrences:
        if (occurrenceCount != null) {
          buffer.write(', $occurrenceCount times');
        }
        break;
      case RecurrenceEndType.onDate:
        if (endDate != null) {
          buffer.write(', until ${endDate!.toString().split(' ')[0]}');
        }
        break;
      case RecurrenceEndType.never:
        break;
    }

    return buffer.toString();
  }

  String _dayName(WeekDay day) {
    switch (day) {
      case WeekDay.sunday:
        return 'Sun';
      case WeekDay.monday:
        return 'Mon';
      case WeekDay.tuesday:
        return 'Tue';
      case WeekDay.wednesday:
        return 'Wed';
      case WeekDay.thursday:
        return 'Thu';
      case WeekDay.friday:
        return 'Fri';
      case WeekDay.saturday:
        return 'Sat';
    }
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is RecurrenceRule &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() {
    return 'RecurrenceRule(id: $id, pattern: $pattern, description: "$description")';
  }
}

/// Extension methods for creating common recurrence patterns
extension RecurrenceRulePatterns on RecurrenceRule {
  /// Create a daily recurrence rule
  static RecurrenceRule daily({
    String? id,
    int interval = 1,
    RecurrenceEndType endType = RecurrenceEndType.never,
    int? occurrenceCount,
    DateTime? endDate,
  }) {
    return RecurrenceRule(
      id: id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      pattern: RecurrencePattern.daily,
      interval: interval,
      endType: endType,
      occurrenceCount: occurrenceCount,
      endDate: endDate,
      createdAt: DateTime.now(),
    );
  }

  /// Create a weekly recurrence rule
  static RecurrenceRule weekly({
    String? id,
    int interval = 1,
    List<WeekDay> daysOfWeek = const [],
    RecurrenceEndType endType = RecurrenceEndType.never,
    int? occurrenceCount,
    DateTime? endDate,
  }) {
    return RecurrenceRule(
      id: id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      pattern: RecurrencePattern.weekly,
      interval: interval,
      daysOfWeek: daysOfWeek,
      endType: endType,
      occurrenceCount: occurrenceCount,
      endDate: endDate,
      createdAt: DateTime.now(),
    );
  }

  /// Create a monthly recurrence rule
  static RecurrenceRule monthly({
    String? id,
    int interval = 1,
    MonthlyPattern monthlyPattern = MonthlyPattern.sameDate,
    RecurrenceEndType endType = RecurrenceEndType.never,
    int? occurrenceCount,
    DateTime? endDate,
  }) {
    return RecurrenceRule(
      id: id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      pattern: RecurrencePattern.monthly,
      interval: interval,
      monthlyPattern: monthlyPattern,
      endType: endType,
      occurrenceCount: occurrenceCount,
      endDate: endDate,
      createdAt: DateTime.now(),
    );
  }

  /// Create a yearly recurrence rule
  static RecurrenceRule yearly({
    String? id,
    int interval = 1,
    RecurrenceEndType endType = RecurrenceEndType.never,
    int? occurrenceCount,
    DateTime? endDate,
  }) {
    return RecurrenceRule(
      id: id ?? DateTime.now().millisecondsSinceEpoch.toString(),
      pattern: RecurrencePattern.yearly,
      interval: interval,
      endType: endType,
      occurrenceCount: occurrenceCount,
      endDate: endDate,
      createdAt: DateTime.now(),
    );
  }
}
