import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/notification.dart' as app_notification;
import 'package:myorbit_calendar/domain/user_calendar.dart';
import 'package:myorbit_calendar/domain/user_preferences.dart';
import 'package:myorbit_calendar/domain/enums.dart';

/// SCHEMA VALIDATION TESTS
/// 
/// These tests verify that:
/// 1. Domain models match the corrected Supabase schema
/// 2. JSON serialization/deserialization works correctly
/// 3. All required fields are present and typed correctly
/// 4. Enums are properly converted to/from strings
/// 5. No data is lost during round-trip conversions
void main() {
  group('Schema Validation Tests', () {
    // ========================================================================
    // TEST 1: USER PREFERENCES - Cross-Device Sync
    // ========================================================================
    test('UserPreferences serializes to JSON with correct schema field names',
        () {
      final now = DateTime.now();
      final prefs = UserPreferences(
        id: 'pref-123',
        userId: 'user-123',
        darkModeEnabled: true,
        defaultPrivacy: EventPrivacyLevel.exclusive,
        timezone: 'America/Los_Angeles',
        eventRemindersEnabled: true,
        eventReminderMinutes: 30,
        eventNotificationChannels: const {EventNotificationChannel.push},
        partnerInvitesEnabled: true,
        calendarChangesEnabled: false,
        smsRescheduleEnabled: true,
        autoSmsCancellationEnabled: false,
        signalNotificationChannel: SignalNotificationChannel.sms,
        signalBufferMinutes: 15,
        createdAt: now,
        updatedAt: now,
      );

      final json = prefs.toJson();

      // Verify all schema field names match database expectations
      expect(json['id'], 'pref-123');
      expect(json['user_id'], 'user-123');
      expect(json['dark_mode_enabled'], true);
      expect(json['default_privacy'], 'exclusive');
      expect(json['timezone'], 'America/Los_Angeles');
      expect(json['event_reminders_enabled'], true);
      expect(json['event_reminder_minutes'], 30);
      expect(json['event_notification_channels'], ['push']);
      expect(json['partner_invites_enabled'], true);
      expect(json['calendar_changes_enabled'], false);
      expect(json['sms_reschedule_enabled'], true);
      expect(json['auto_sms_cancellation_enabled'], false);
      expect(json['signal_notification_channel'], 'sms');
      expect(json['signal_buffer_minutes'], 15);
      expect(json['created_at'], now.toIso8601String());
      expect(json['updated_at'], now.toIso8601String());
    });

    test('UserPreferences round-trip conversion preserves all data', () {
      final now = DateTime.now();
      final original = UserPreferences(
        id: 'pref-456',
        userId: 'user-456',
        darkModeEnabled: false,
        defaultPrivacy: EventPrivacyLevel.normal,
        timezone: 'UTC',
        eventRemindersEnabled: false,
        eventReminderMinutes: 60,
        eventNotificationChannels: const {
          EventNotificationChannel.push,
          EventNotificationChannel.sms,
        },
        partnerInvitesEnabled: false,
        calendarChangesEnabled: true,
        smsRescheduleEnabled: false,
        autoSmsCancellationEnabled: true,
        signalNotificationChannel: SignalNotificationChannel.inAppOnly,
        signalBufferMinutes: 0,
        createdAt: now,
        updatedAt: now,
      );

      // Serialize to JSON
      final json = original.toJson();

      // Deserialize back
      final restored = UserPreferences.fromJson(json);

      // Verify all fields match
      expect(restored.id, original.id);
      expect(restored.userId, original.userId);
      expect(restored.darkModeEnabled, original.darkModeEnabled);
      expect(restored.defaultPrivacy, original.defaultPrivacy);
      expect(restored.timezone, original.timezone);
      expect(restored.eventRemindersEnabled, original.eventRemindersEnabled);
      expect(restored.eventReminderMinutes, original.eventReminderMinutes);
      expect(restored.eventNotificationChannels,
          original.eventNotificationChannels);
      expect(restored.partnerInvitesEnabled, original.partnerInvitesEnabled);
      expect(restored.calendarChangesEnabled, original.calendarChangesEnabled);
      expect(restored.smsRescheduleEnabled, original.smsRescheduleEnabled);
      expect(restored.autoSmsCancellationEnabled,
          original.autoSmsCancellationEnabled);
      expect(restored.signalNotificationChannel,
          original.signalNotificationChannel);
      expect(restored.signalBufferMinutes, original.signalBufferMinutes);
    });

    // ========================================================================
    // TEST 2: AVAILABILITY SIGNALS - Recurring Support
    // ========================================================================
    test('AvailabilitySignal serializes with correct schema field names', () {
      final start = DateTime(2025, 1, 15, 14, 0);
      final end = DateTime(2025, 1, 15, 16, 0);
      final signal = AvailabilitySignal(
        id: 'signal-123',
        userId: 'user-123',
        signalType: SignalType.available,
        startTime: start,
        endTime: end,
        duration: SignalDuration.hours2,
        message: 'Free for coffee',
        createdAt: DateTime.now(),
      );

      final json = signal.toJson();

      // Verify schema field names
      expect(json['id'], 'signal-123');
      expect(json['user_id'], 'user-123');
      expect(json['signal_type'], 'available');
      expect(json['start_time'], start.toIso8601String());
      expect(json['end_time'], end.toIso8601String());
      expect(json['duration'], 'hours2');
      expect(json['message'], 'Free for coffee');
      expect(json['created_at'], isNotNull);
    });

    test('AvailabilitySignal supports all signal types', () {
      final now = DateTime.now();
      final types = [
        SignalType.available,
        SignalType.busy,
        SignalType.flexible,
        SignalType.unavailable,
      ];

      for (final type in types) {
        final signal = AvailabilitySignal(
          id: 'signal-test-${type.name}',
          userId: 'user-123',
          signalType: type,
          startTime: now,
          endTime: now.add(const Duration(hours: 2)),
          createdAt: now,
        );

        final json = signal.toJson();
        final restored = AvailabilitySignal.fromJson(json);

        expect(restored.signalType, type);
      }
    });

    test('AvailabilitySignal duration presets convert correctly', () {
      final now = DateTime.now();
      final durations = [
        SignalDuration.hour,
        SignalDuration.hours2,
        SignalDuration.hours4,
        SignalDuration.day,
        SignalDuration.custom,
      ];

      for (final duration in durations) {
        final signal = AvailabilitySignal(
          id: 'signal-dur-${duration.name}',
          userId: 'user-123',
          signalType: SignalType.available,
          startTime: now,
          endTime: now.add(const Duration(hours: 2)),
          duration: duration,
          createdAt: now,
        );

        final json = signal.toJson();
        final restored = AvailabilitySignal.fromJson(json);

        expect(restored.duration, duration);
      }
    });

    // ========================================================================
    // TEST 3: CALENDAR EVENTS - Provider Tracking
    // ========================================================================
    test('CalendarEvent serializes with privacy level enum', () {
      final start = DateTime(2025, 1, 20, 10, 0);
      final end = DateTime(2025, 1, 20, 11, 0);
      const privacyLevels = [
        EventPrivacyLevel.normal,
        EventPrivacyLevel.exclusive,
        EventPrivacyLevel.superExclusive,
      ];

      for (final privacy in privacyLevels) {
        final event = CalendarEvent(
          id: 'event-${privacy.name}',
          title: 'Test Event',
          start: start,
          end: end,
          privacyLevel: privacy,
          ownerId: 'user-123',
          calendarId: 'cal-123',
        );

        final json = event.toJson();

        // Verify privacy level is stored as enum name string
        expect(json['privacy_level'], privacy.name);

        // Verify round-trip
        final restored = CalendarEvent.fromJson(json);
        expect(restored.privacyLevel, privacy);
      }
    });

    test('CalendarEvent stores external provider and event ID', () {
      final event = CalendarEvent(
        id: 'myorbit-evt-123',
        title: 'Google Calendar Event',
        start: DateTime.now(),
        end: DateTime.now().add(const Duration(hours: 1)),
        ownerId: 'user-123',
        calendarId: 'cal-123',
        externalProvider: 'google',
        externalEventId: 'google-evt-abc123def456',
      );

      final json = event.toJson();

      expect(json['external_provider'], 'google');
      expect(json['external_event_id'], 'google-evt-abc123def456');
    });

    test('CalendarEvent reschedule status persists correctly', () {
      final statuses = [
        EventRescheduleStatus.none,
        EventRescheduleStatus.pendingContact,
        EventRescheduleStatus.contactConfirmed,
        EventRescheduleStatus.awaitingUserApproval,
        EventRescheduleStatus.scheduled,
      ];

      for (final status in statuses) {
        final event = CalendarEvent(
          id: 'event-resched-${status.name}',
          title: 'Reschedulable Event',
          start: DateTime.now(),
          end: DateTime.now().add(const Duration(hours: 1)),
          ownerId: 'user-123',
          calendarId: 'cal-123',
          rescheduleStatus: status,
        );

        final json = event.toJson();
        expect(json['reschedule_status'], status.name);

        final restored = CalendarEvent.fromJson(json);
        expect(restored.rescheduleStatus, status);
      }
    });

    // ========================================================================
    // TEST 4: CALENDARS - Provider Field
    // ========================================================================
    test('UserCalendar includes provider field for Google/Apple/etc', () {
      const providers = ['myorbit', 'google', 'apple', 'outlook', 'caldav'];

      for (final provider in providers) {
        final calendar = UserCalendar(
          id: 'cal-$provider',
          name: '$provider Calendar',
          colorValue: 0xFF4D8CFF,
          isPrimary: provider == 'myorbit',
          provider: provider,
        );

        final json = calendar.toJson();
        expect(json['provider'], provider);

        final restored = UserCalendar.fromJson(json);
        expect(restored.provider, provider);
      }
    });

    // ========================================================================
    // TEST 5: NOTIFICATIONS - Persistent Storage
    // ========================================================================
    test('Notification serializes with all required fields', () {
      final now = DateTime.now();
      final notification = app_notification.Notification(
        id: 'notif-123',
        type: app_notification.NotificationType.eventReminder,
        title: 'Upcoming Event',
        message: 'Team Standup in 1 hour',
        isRead: false,
        timestamp: now,
        actionId: 'event-789',
        metadata: {'eventId': 'event-789', 'reminderMinutes': 60},
        isDismissed: false,
        showInCenter: true,
      );

      final json = notification.toJson();

      expect(json['id'], 'notif-123');
      expect(json['type'], 'eventReminder');
      expect(json['title'], 'Upcoming Event');
      expect(json['message'], 'Team Standup in 1 hour');
      expect(json['is_read'], false);
      expect(json['is_dismissed'], false);
      expect(json['show_in_center'], true);
      expect(json['action_id'], 'event-789');
      expect(json['metadata']['eventId'], 'event-789');
    });

    // ========================================================================
    // TEST 6: CONTACTS - Enums and Status
    // ========================================================================
    test('Contact status and permission enums serialize correctly', () {
      const statuses = [
        ContactStatus.pending,
        ContactStatus.accepted,
        ContactStatus.contactOnly,
      ];
      const permissions = [
        PartnerPermission.private,
        PartnerPermission.semiVisible,
        PartnerPermission.visible,
      ];

      for (final status in statuses) {
        for (final permission in permissions) {
          final contact = Contact(
            id: 'contact-${status.name}-${permission.name}',
            name: 'Test Contact',
            email: 'test@example.com',
            status: status,
            permission: permission,
            ownerId: 'user-123',
          );

          final json = contact.toJson();
          expect(json['status'], status.name);
          expect(json['permission'], permission.name);

          final restored = Contact.fromJson(json);
          expect(restored.status, status);
          expect(restored.permission, permission);
        }
      }
    });

    // ========================================================================
    // TEST 7: ENUM COMPLETENESS
    // ========================================================================
    test('All SignalType enums are valid in schema', () {
      final validSignalTypes = ['available', 'busy', 'flexible', 'unavailable'];
      final enumValues = SignalType.values.map((e) => e.name).toList();

      for (final expected in validSignalTypes) {
        expect(enumValues, contains(expected),
            reason: 'SignalType.$expected missing');
      }
    });

    test('All EventPrivacyLevel enums are valid in schema', () {
      final validPrivacyLevels = ['normal', 'exclusive', 'superExclusive'];
      final enumValues = EventPrivacyLevel.values.map((e) => e.name).toList();

      for (final expected in validPrivacyLevels) {
        expect(enumValues, contains(expected),
            reason: 'EventPrivacyLevel.$expected missing');
      }
    });

    test('All EventNotificationChannel options are supported', () {
      final validChannels = ['inAppOnly', 'push', 'sms'];
      final enumValues =
          EventNotificationChannel.values.map((e) => e.name).toList();

      for (final expected in validChannels) {
        expect(enumValues, contains(expected),
            reason: 'EventNotificationChannel.$expected missing');
      }
    });

    test('All SignalNotificationChannel options are supported', () {
      final validChannels = ['push', 'inAppOnly', 'sms'];
      final enumValues =
          SignalNotificationChannel.values.map((e) => e.name).toList();

      for (final expected in validChannels) {
        expect(enumValues, contains(expected),
            reason: 'SignalNotificationChannel.$expected missing');
      }
    });

    // ========================================================================
    // TEST 8: TYPE SAFETY
    // ========================================================================
    test('JSON deserialization handles missing optional fields', () {
      // Minimal event JSON (from Supabase)
      final minimalJson = {
        'id': 'event-123',
        'title': 'Simple Event',
        'start': '2025-01-20T10:00:00Z',
        'end': '2025-01-20T11:00:00Z',
        'owner_id': 'user-123',
        'calendar_id': 'cal-123',
      };

      final event = CalendarEvent.fromJson(minimalJson);
      expect(event.id, 'event-123');
      expect(event.title, 'Simple Event');
      expect(event.description, null);
      expect(event.externalProvider, null);
      expect(event.privacyLevel, EventPrivacyLevel.normal);
      expect(event.rescheduleStatus, EventRescheduleStatus.none);
    });

    test('JSON deserialization handles all optional event fields', () {
      final fullJson = {
        'id': 'event-456',
        'title': 'Full Event',
        'description': 'Detailed description',
        'start': '2025-01-20T10:00:00Z',
        'end': '2025-01-20T11:00:00Z',
        'owner_id': 'user-123',
        'calendar_id': 'cal-123',
        'privacy_level': 'exclusive',
        'external_provider': 'apple',
        'external_event_id': 'apple-evt-xyz',
        'reschedule_status': 'contactConfirmed',
      };

      final event = CalendarEvent.fromJson(fullJson);
      expect(event.privacyLevel, EventPrivacyLevel.exclusive);
      expect(event.externalProvider, 'apple');
      expect(event.externalEventId, 'apple-evt-xyz');
      expect(event.rescheduleStatus, EventRescheduleStatus.contactConfirmed);
    });
  });
}
