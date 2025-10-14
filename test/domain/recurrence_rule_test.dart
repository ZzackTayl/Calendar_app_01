import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/recurrence_rule.dart';

void main() {
  group('RecurrenceRule', () {
    late DateTime baseDate;

    setUp(() {
      // Monday, January 1, 2024
      baseDate = DateTime(2024, 1, 1);
    });

    group('Daily Recurrence', () {
      test('should generate daily occurrences correctly', () {
        final rule = RecurrenceRulePatterns.daily(interval: 1);

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 5)),
        );

        expect(occurrences, hasLength(6));
        expect(occurrences[0], equals(baseDate));
        expect(occurrences[1], equals(baseDate.add(const Duration(days: 1))));
        expect(occurrences[5], equals(baseDate.add(const Duration(days: 5))));
      });

      test('should generate every 3 days correctly', () {
        final rule = RecurrenceRulePatterns.daily(interval: 3);

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 10)),
        );

        expect(occurrences, hasLength(4)); // Days 0, 3, 6, 9
        expect(occurrences[0], equals(baseDate));
        expect(occurrences[1], equals(baseDate.add(const Duration(days: 3))));
        expect(occurrences[2], equals(baseDate.add(const Duration(days: 6))));
        expect(occurrences[3], equals(baseDate.add(const Duration(days: 9))));
      });

      test('should respect occurrence count limit', () {
        final rule = RecurrenceRulePatterns.daily(
          interval: 1,
          endType: RecurrenceEndType.afterOccurrences,
          occurrenceCount: 3,
        );

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 10)),
        );

        expect(occurrences, hasLength(3));
      });

      test('should respect end date limit', () {
        final endDate = baseDate.add(const Duration(days: 2));
        final rule = RecurrenceRulePatterns.daily(
          interval: 1,
          endType: RecurrenceEndType.onDate,
          endDate: endDate,
        );

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 10)),
        );

        expect(occurrences, hasLength(3)); // Days 0, 1, 2
      });
    });

    group('Weekly Recurrence', () {
      test('should generate weekly occurrences on same day', () {
        final rule = RecurrenceRulePatterns.weekly(interval: 1);

        final occurrences = rule.generateOccurrences(
          startDate: baseDate, // Monday
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 21)),
        );

        expect(occurrences, hasLength(4)); // 4 Mondays in 3 weeks
        expect(occurrences.every((date) => date.weekday == DateTime.monday),
            isTrue);
      });

      test('should generate weekly occurrences on specific days', () {
        final rule = RecurrenceRulePatterns.weekly(
          interval: 1,
          daysOfWeek: [WeekDay.monday, WeekDay.wednesday, WeekDay.friday],
        );

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 14)),
        );

        // Should include all occurrences through rangeEnd (7 total across Monday/Wed/Fri pattern)
        expect(occurrences, hasLength(7));
        expect(occurrences.first, equals(baseDate)); // Monday week 1
        expect(
            occurrences.last, equals(baseDate.add(const Duration(days: 14))));

        // Check that all occurrences are on correct days
        for (final occurrence in occurrences) {
          expect(
              [DateTime.monday, DateTime.wednesday, DateTime.friday]
                  .contains(occurrence.weekday),
              isTrue);
        }
      });

      test('should handle bi-weekly recurrence', () {
        final rule = RecurrenceRulePatterns.weekly(
          interval: 2,
          daysOfWeek: [WeekDay.monday],
        );

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 28)),
        );

        expect(occurrences, hasLength(3)); // Every other Monday in 4 weeks
      });
    });

    group('Monthly Recurrence', () {
      test('should generate monthly occurrences on same date', () {
        final rule = RecurrenceRulePatterns.monthly(
          monthlyPattern: MonthlyPattern.sameDate,
        );

        final occurrences = rule.generateOccurrences(
          startDate: DateTime(2024, 1, 15), // 15th of January
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2024, 6, 30),
        );

        expect(occurrences, hasLength(6)); // 6 months
        expect(occurrences.every((date) => date.day == 15), isTrue);
      });

      test('should handle end-of-month dates gracefully', () {
        final rule = RecurrenceRulePatterns.monthly(
          monthlyPattern: MonthlyPattern.sameDate,
        );

        final occurrences = rule.generateOccurrences(
          startDate: DateTime(2024, 1, 31), // January 31
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2024, 4, 30),
        );

        expect(occurrences, hasLength(4));
        expect(occurrences[0].day, equals(31)); // Jan 31
        expect(occurrences[1].day, equals(29)); // Feb 29 (2024 is leap year)
        expect(occurrences[2].day, equals(31)); // Mar 31
        expect(occurrences[3].day, equals(30)); // Apr 30
      });

      test('should generate monthly occurrences on same weekday', () {
        final rule = RecurrenceRulePatterns.monthly(
          monthlyPattern: MonthlyPattern.sameWeekday,
        );

        // First Monday of January 2024
        final firstMondayJan = DateTime(2024, 1, 1);

        final occurrences = rule.generateOccurrences(
          startDate: firstMondayJan,
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2024, 4, 30),
        );

        expect(occurrences, hasLength(4)); // 4 months
        expect(occurrences.every((date) => date.weekday == DateTime.monday),
            isTrue);

        // Each should be the first Monday of its month
        for (final occurrence in occurrences) {
          expect(occurrence.day, lessThanOrEqualTo(7)); // First week of month
        }
      });

      test('should generate monthly occurrences on last day', () {
        final rule = RecurrenceRulePatterns.monthly(
          monthlyPattern: MonthlyPattern.lastDay,
        );

        final occurrences = rule.generateOccurrences(
          startDate: DateTime(2024, 1, 31),
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2024, 4, 30),
        );

        expect(occurrences, hasLength(4));
        expect(occurrences[0], equals(DateTime(2024, 1, 31))); // Jan 31
        expect(occurrences[1],
            equals(DateTime(2024, 2, 29))); // Feb 29 (leap year)
        expect(occurrences[2], equals(DateTime(2024, 3, 31))); // Mar 31
        expect(occurrences[3], equals(DateTime(2024, 4, 30))); // Apr 30
      });
    });

    group('Yearly Recurrence', () {
      test('should generate yearly occurrences correctly', () {
        final rule = RecurrenceRulePatterns.yearly();

        final occurrences = rule.generateOccurrences(
          startDate: DateTime(2024, 6, 15),
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2027, 12, 31),
        );

        expect(occurrences, hasLength(4)); // 2024, 2025, 2026, 2027
        expect(occurrences.every((date) => date.month == 6 && date.day == 15),
            isTrue);
      });

      test('should handle leap year dates correctly', () {
        final rule = RecurrenceRulePatterns.yearly();

        final occurrences = rule.generateOccurrences(
          startDate: DateTime(2024, 2, 29), // Leap day
          rangeStart: DateTime(2024, 1, 1),
          rangeEnd: DateTime(2029, 12, 31),
        );

        expect(occurrences, hasLength(6)); // 2024, 2025, 2026, 2027, 2028, 2029
        expect(occurrences[0], equals(DateTime(2024, 2, 29)));
        expect(occurrences[1], equals(DateTime(2025, 2, 28))); // Non-leap year
        expect(occurrences[4], equals(DateTime(2028, 2, 29))); // Next leap year
      });
    });

    group('Exceptions', () {
      test('should skip exception dates', () {
        final rule = RecurrenceRule(
          id: 'test-rule',
          pattern: RecurrencePattern.daily,
          interval: 1,
          endType: RecurrenceEndType.never,
          exceptions: [
            baseDate.add(const Duration(days: 2)),
            baseDate.add(const Duration(days: 4)),
          ],
          createdAt: DateTime.now(),
        );

        final occurrences = rule.generateOccurrences(
          startDate: baseDate,
          rangeStart: baseDate,
          rangeEnd: baseDate.add(const Duration(days: 6)),
        );

        expect(occurrences, hasLength(5)); // 7 days minus 2 exceptions
        expect(occurrences,
            isNot(contains(baseDate.add(const Duration(days: 2)))));
        expect(occurrences,
            isNot(contains(baseDate.add(const Duration(days: 4)))));
      });
    });

    group('WeekDay enum', () {
      test('should convert from DateTime weekday correctly', () {
        expect(WeekDay.fromDateTime(DateTime.monday), equals(WeekDay.monday));
        expect(WeekDay.fromDateTime(DateTime.sunday), equals(WeekDay.sunday));
        expect(WeekDay.fromDateTime(DateTime.friday), equals(WeekDay.friday));
      });

      test('should convert to DateTime weekday correctly', () {
        expect(WeekDay.monday.dateTimeWeekday, equals(DateTime.monday));
        expect(WeekDay.sunday.dateTimeWeekday, equals(DateTime.sunday));
        expect(WeekDay.saturday.dateTimeWeekday, equals(DateTime.saturday));
      });
    });

    group('JSON Serialization', () {
      test('should serialize and deserialize correctly', () {
        final originalRule = RecurrenceRule(
          id: 'test-rule-123',
          pattern: RecurrencePattern.weekly,
          interval: 2,
          daysOfWeek: [WeekDay.monday, WeekDay.wednesday],
          monthlyPattern: null,
          endType: RecurrenceEndType.afterOccurrences,
          occurrenceCount: 10,
          endDate: null,
          exceptions: [DateTime(2024, 1, 15)],
          createdAt: DateTime(2024, 1, 1, 12, 0, 0),
        );

        final json = originalRule.toJson();
        final deserializedRule = RecurrenceRule.fromJson(json);

        expect(deserializedRule.id, equals(originalRule.id));
        expect(deserializedRule.pattern, equals(originalRule.pattern));
        expect(deserializedRule.interval, equals(originalRule.interval));
        expect(deserializedRule.daysOfWeek, equals(originalRule.daysOfWeek));
        expect(deserializedRule.endType, equals(originalRule.endType));
        expect(deserializedRule.occurrenceCount,
            equals(originalRule.occurrenceCount));
        expect(deserializedRule.exceptions, hasLength(1));
        expect(
            deserializedRule.createdAt.isAtSameMomentAs(originalRule.createdAt),
            isTrue);
      });
    });

    group('Description Generation', () {
      test('should generate correct daily descriptions', () {
        expect(RecurrenceRulePatterns.daily().description, equals('Daily'));
        expect(RecurrenceRulePatterns.daily(interval: 3).description,
            equals('Every 3 days'));
      });

      test('should generate correct weekly descriptions', () {
        expect(RecurrenceRulePatterns.weekly().description, equals('Weekly'));
        expect(RecurrenceRulePatterns.weekly(interval: 2).description,
            equals('Every 2 weeks'));
        expect(
            RecurrenceRulePatterns.weekly(
                daysOfWeek: [WeekDay.monday, WeekDay.friday]).description,
            equals('Weekly on Mon, Fri'));
      });

      test('should generate correct monthly descriptions', () {
        expect(RecurrenceRulePatterns.monthly().description, equals('Monthly'));
        expect(RecurrenceRulePatterns.monthly(interval: 3).description,
            equals('Every 3 months'));
        expect(
            RecurrenceRulePatterns.monthly(
                    monthlyPattern: MonthlyPattern.sameWeekday)
                .description,
            equals('Monthly on the same weekday'));
        expect(
            RecurrenceRulePatterns.monthly(
                    monthlyPattern: MonthlyPattern.lastDay)
                .description,
            equals('Monthly on the last day'));
      });

      test('should generate correct yearly descriptions', () {
        expect(RecurrenceRulePatterns.yearly().description, equals('Yearly'));
        expect(RecurrenceRulePatterns.yearly(interval: 2).description,
            equals('Every 2 years'));
      });

      test('should include end conditions in descriptions', () {
        expect(
            RecurrenceRulePatterns.daily(
              endType: RecurrenceEndType.afterOccurrences,
              occurrenceCount: 5,
            ).description,
            equals('Daily, 5 times'));

        expect(
            RecurrenceRulePatterns.weekly(
              endType: RecurrenceEndType.onDate,
              endDate: DateTime(2024, 12, 31),
            ).description,
            contains('until 2024-12-31'));
      });
    });

    group('Equality and HashCode', () {
      test('should be equal for same ID', () {
        final rule1 = RecurrenceRule(
          id: 'same-id',
          pattern: RecurrencePattern.daily,
          interval: 1,
          endType: RecurrenceEndType.never,
          createdAt: DateTime.now(),
        );

        final rule2 = RecurrenceRule(
          id: 'same-id',
          pattern: RecurrencePattern.weekly,
          interval: 2,
          endType: RecurrenceEndType.afterOccurrences,
          createdAt: DateTime.now(),
        );

        expect(rule1, equals(rule2));
        expect(rule1.hashCode, equals(rule2.hashCode));
      });
    });

    group('CopyWith', () {
      test('should create correct copy with modifications', () {
        final original = RecurrenceRulePatterns.daily();
        final modified = original.copyWith(
          pattern: RecurrencePattern.weekly,
          interval: 2,
        );

        expect(modified.pattern, equals(RecurrencePattern.weekly));
        expect(modified.interval, equals(2));
        expect(modified.id, equals(original.id)); // Unchanged
        expect(modified.endType, equals(original.endType)); // Unchanged
      });
    });
  });
}
