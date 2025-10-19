import 'package:uuid/uuid.dart';

import 'recurrence_rule.dart';

/// Simple recurrence presets surfaced in quick-select UI.
enum SimpleRecurrence {
  oneOff,
  weekly,
  biweekly,
  monthly,
}

extension SimpleRecurrenceX on SimpleRecurrence {
  String get label {
    switch (this) {
      case SimpleRecurrence.oneOff:
        return 'One-off';
      case SimpleRecurrence.weekly:
        return 'Weekly';
      case SimpleRecurrence.biweekly:
        return 'Biweekly';
      case SimpleRecurrence.monthly:
        return 'Monthly';
    }
  }

  /// Builds a [RecurrenceRule] to match the preset.
  RecurrenceRule buildRule({
    required DateTime anchor,
    String? reuseId,
  }) {
    final id = reuseId ?? const Uuid().v4();
    final createdAt = DateTime.now();
    switch (this) {
      case SimpleRecurrence.oneOff:
        throw StateError('One-off events should not produce recurrence rules.');
      case SimpleRecurrence.weekly:
        return RecurrenceRule(
          id: id,
          pattern: RecurrencePattern.weekly,
          interval: 1,
          daysOfWeek: [WeekDay.fromDateTime(anchor.weekday)],
          monthlyPattern: null,
          endType: RecurrenceEndType.never,
          occurrenceCount: null,
          endDate: null,
          exceptions: const [],
          createdAt: createdAt,
        );
      case SimpleRecurrence.biweekly:
        return RecurrenceRule(
          id: id,
          pattern: RecurrencePattern.weekly,
          interval: 2,
          daysOfWeek: [WeekDay.fromDateTime(anchor.weekday)],
          monthlyPattern: null,
          endType: RecurrenceEndType.never,
          occurrenceCount: null,
          endDate: null,
          exceptions: const [],
          createdAt: createdAt,
        );
      case SimpleRecurrence.monthly:
        return RecurrenceRule(
          id: id,
          pattern: RecurrencePattern.monthly,
          interval: 1,
          daysOfWeek: const [],
          monthlyPattern: MonthlyPattern.sameDate,
          endType: RecurrenceEndType.never,
          occurrenceCount: null,
          endDate: null,
          exceptions: const [],
          createdAt: createdAt,
        );
    }
  }

  static SimpleRecurrence fromRule(RecurrenceRule rule) {
    switch (rule.pattern) {
      case RecurrencePattern.daily:
      case RecurrencePattern.yearly:
        return SimpleRecurrence.oneOff;
      case RecurrencePattern.weekly:
        return rule.interval == 2
            ? SimpleRecurrence.biweekly
            : SimpleRecurrence.weekly;
      case RecurrencePattern.monthly:
        return SimpleRecurrence.monthly;
    }
  }
}
