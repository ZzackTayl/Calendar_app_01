import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';

void main() {
  group('TimezoneService', () {
    setUpAll(() async {
      // Initialize timezone database once for all tests in this group
      // This is a heavy operation but only runs once
      await TimezoneService.initialize();
    });

    tearDownAll(() {
      // Reset for any other test files that might run after this
      TimezoneService.resetForTesting();
    });

    group('Basic Functionality', () {
      test('should initialize successfully', () {
        expect(TimezoneService.displayNames, isNotEmpty);
        expect(TimezoneService.displayNames.length,
            greaterThan(6)); // Should have more than original 6
      });

      test('normalizes legacy display names', () {
        expect(TimezoneService.normalizeDisplayName('Pacific Time (PST)'),
            equals('Pacific Time (PST/PDT)'));
        expect(TimezoneService.normalizeDisplayName('America/Los_Angeles'),
            equals('Pacific Time (PST/PDT)'));
      });

      test('should have international timezones', () {
        final displayNames = TimezoneService.displayNames;
        expect(displayNames, contains('Tokyo (JST)'));
        expect(displayNames, contains('London (GMT/BST)'));
        expect(displayNames, contains('Sydney (AEST/AEDT)'));
        expect(displayNames, contains('Mumbai (IST)'));
        expect(displayNames, contains('São Paulo (BRT)'));
      });

      test('should resolve locations correctly', () {
        final tokyoLocation = TimezoneService.resolveLocation('Tokyo (JST)');
        expect(tokyoLocation.name, equals('Asia/Tokyo'));

        final londonLocation = TimezoneService.resolveLocation('London (GMT/BST)');
        expect(londonLocation.name, equals('Europe/London'));
      });

      test('should get current time in timezone', () {
        final nowInTokyo = TimezoneService.nowIn('Tokyo (JST)');
        final nowInLondon = TimezoneService.nowIn('London (GMT/BST)');

        expect(nowInTokyo, isA<DateTime>());
        expect(nowInLondon, isA<DateTime>());
        // The times should be different due to timezone offset
        expect(nowInTokyo.isUtc, isFalse);
        expect(nowInLondon.isUtc, isFalse);
      });
    });

    group('TimezoneDetection Extension', () {
      test('should detect device timezone', () {
        final deviceTz = TimezoneDetection.getDeviceTimezone();
        expect(deviceTz, isNotEmpty);
        expect(deviceTz, isA<String>());
        expect(TimezoneService.displayNames, contains(TimezoneService.normalizeDisplayName(deviceTz)));
      });

      test('should get device timezone location', () {
        final deviceLocation = TimezoneDetection.getDeviceTimezoneLocation();
        expect(deviceLocation, isNotEmpty);
        expect(deviceLocation, isA<String>());
      });

      test('should check if timezone matches device', () {
        final deviceTz = TimezoneDetection.getDeviceTimezone();
        final isMatch = TimezoneDetection.isDeviceTimezone(deviceTz);
        expect(isMatch, isTrue);

        // Test with a different timezone
        final isNotMatch = TimezoneDetection.isDeviceTimezone('Tokyo (JST)');
        expect(isNotMatch, isFalse);
      });

      test('should get device timezone description', () {
        final description = TimezoneDetection.getDeviceTimezoneDescription();
        expect(description, isNotEmpty);
        expect(description, contains('UTC'));
      });
    });

    group('Timezone Conversion', () {
      test('should convert DateTime to timezone', () {
        final utcTime = DateTime.utc(2024, 1, 15, 12, 0, 0);
        final tokyoTime = TimezoneService.convert(utcTime, 'Tokyo (JST)');
        final londonTime = TimezoneService.convert(utcTime, 'London (GMT/BST)');

        expect(tokyoTime.location.name, equals('Asia/Tokyo'));
        expect(londonTime.location.name, equals('Europe/London'));

        // Tokyo is UTC+9, London is UTC+0/+1, so Tokyo should be ahead
        expect(tokyoTime.hour, greaterThan(londonTime.hour));
      });

      test('should convert local time to UTC', () {
        final localTime = DateTime(2024, 1, 15, 12, 0, 0);
        final utcTime = TimezoneService.toUtc(localTime, 'Tokyo (JST)');

        expect(utcTime.isUtc, isTrue);
        // Tokyo is UTC+9, so local noon should be 3 AM UTC
        expect(utcTime.hour, equals(3));
      });

      test('should build DateTime in timezone', () {
        final tokyoTime = TimezoneService.buildInTimeZone(
          displayName: 'Tokyo (JST)',
          year: 2024,
          month: 1,
          day: 15,
          hour: 12,
          minute: 30,
        );

        expect(tokyoTime, isA<DateTime>());
        expect(tokyoTime.year, equals(2024));
        expect(tokyoTime.month, equals(1));
        expect(tokyoTime.day, equals(15));
        expect(tokyoTime.hour, equals(12));
        expect(tokyoTime.minute, equals(30));
      });
    });

    group('Event Time Formatting', () {
      test('should format event window correctly', () {
        final start = DateTime.utc(2024, 1, 15, 12, 0, 0);
        final end = DateTime.utc(2024, 1, 15, 14, 30, 0);

        final formatted = TimezoneService.formatEventWindow(
          start: start,
          end: end,
          displayName: 'Tokyo (JST)',
        );

        expect(formatted.dateLabel, isNotEmpty);
        expect(formatted.timeLabel, isNotEmpty);
        expect(formatted.timeLabel, contains('JST')); // Should contain timezone abbreviation
      });
    });

    group('Cross-Timezone Event Display', () {
      test('should display same event in different timezones', () {
        // Create an event at 12:00 UTC
        final eventTime = DateTime.utc(2024, 1, 15, 12, 0, 0);

        // Convert to different timezones
        final tokyoTime = TimezoneService.convert(eventTime, 'Tokyo (JST)');
        final londonTime = TimezoneService.convert(eventTime, 'London (GMT/BST)');
        final newYorkTime = TimezoneService.convert(eventTime, 'Eastern Time (EST/EDT)');

        // All should represent the same moment in time
        expect(tokyoTime.toUtc(), equals(eventTime));
        expect(londonTime.toUtc(), equals(eventTime));
        expect(newYorkTime.toUtc(), equals(eventTime));

        // But display different local times
        expect(tokyoTime.hour, equals(21)); // UTC+9
        expect(londonTime.hour, equals(12)); // UTC+0 (assuming no DST in January)
        expect(newYorkTime.hour, equals(7)); // UTC-5 (assuming no DST in January)
      });
    });

    group('Abbreviation Support', () {
      test('should get timezone abbreviation', () {
        final tokyoAbbr = TimezoneService.abbreviationFor('Tokyo (JST)');
        final londonAbbr = TimezoneService.abbreviationFor('London (GMT/BST)');

        expect(tokyoAbbr, isNotEmpty);
        expect(londonAbbr, isNotEmpty);
        expect(tokyoAbbr, equals('JST'));
        expect(londonAbbr, anyOf(['GMT', 'BST'])); // Depends on DST
      });
    });
  });
}
