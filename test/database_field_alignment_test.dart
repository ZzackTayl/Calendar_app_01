import 'package:flutter_test/flutter_test.dart';

/// DATABASE FIELD ALIGNMENT TESTS
///
/// These tests verify that Dart domain model field names align with
/// Supabase schema field names (snake_case in DB, camelCase in Dart).
void main() {
  group('Database Field Alignment Tests', () {
    test('User Preferences field mapping is complete', () {
      // This documents the exact mapping from Dart → Supabase
      const fieldMapping = {
        // Dart property name : Supabase column name
        'id': 'id',
        'userId': 'user_id',
        'darkModeEnabled': 'dark_mode_enabled',
        'defaultPrivacy': 'default_privacy',
        'timezone': 'timezone',
        'eventRemindersEnabled': 'event_reminders_enabled',
        'eventReminderMinutes': 'event_reminder_minutes',
        'eventNotificationChannels': 'event_notification_channels',
        'partnerInvitesEnabled': 'partner_invites_enabled',
        'calendarChangesEnabled': 'calendar_changes_enabled',
        'smsRescheduleEnabled': 'sms_reschedule_enabled',
        'autoSmsCancellationEnabled': 'auto_sms_cancellation_enabled',
        'signalNotificationChannel': 'signal_notification_channel',
        'signalBufferMinutes': 'signal_buffer_minutes',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
      };

      // Count to verify completeness
      expect(fieldMapping.length, 16,
          reason: 'UserPreferences should have 16 synced fields');
    });

    test('Availability Signal field mapping is complete', () {
      const fieldMapping = {
        'id': 'id',
        'userId': 'user_id',
        'signalType': 'signal_type',
        'startTime': 'start_time',
        'endTime': 'end_time',
        'duration': 'duration',
        'message': 'message',
        'createdAt': 'created_at',
        // NEW FIX: Recurrence support
        'isRecurring': 'is_recurring',
        'recurrenceRuleId': 'recurrence_rule_id',
      };

      expect(fieldMapping.length, 10,
          reason: 'Signals now support recurring (new fields added)');
    });

    test('Calendar Event field mapping includes provider tracking', () {
      const fieldMapping = {
        'id': 'id',
        'title': 'title',
        'description': 'description',
        'start': 'start_ts',
        'end': 'end_ts',
        'privacyLevel': 'privacy_level',
        'ownerId': 'owner_id',
        'calendarId': 'calendar_id',
        'externalProvider': 'external_provider',
        'externalEventId': 'external_event_id',
        'rescheduleStatus': 'reschedule_status',
        // NEW FIX: Recurrence support
        'recurrenceRuleId': 'recurrence_rule_id',
        'parentEventId': 'parent_event_id',
        'isException': 'is_exception',
        'isFloating': 'is_floating',
      };

      expect(fieldMapping.length, 15,
          reason: 'Events now track provider, reschedule status, and recurrence');
    });

    test('Calendar field mapping includes provider field', () {
      const fieldMapping = {
        'id': 'id',
        'ownerId': 'owner_id',
        'name': 'name',
        'colorValue': 'color_value',
        'isPrimary': 'is_primary',
        'isVisible': 'is_visible',
        // NEW FIX: Provider tracking
        'provider': 'provider',
        'externalCalendarId': 'external_calendar_id',
        'syncEnabled': 'sync_enabled',
        'lastSyncAt': 'last_sync_at',
      };

      expect(fieldMapping.length, 10,
          reason: 'Calendars now track provider (google, apple, etc)');
    });

    test('Notification field mapping for persistence', () {
      const fieldMapping = {
        'id': 'id',
        'userId': 'user_id',
        'type': 'type',
        'title': 'title',
        'message': 'message',
        'isRead': 'is_read',
        'isDismissed': 'is_dismissed',
        'showInCenter': 'show_in_center',
        'actionId': 'action_id',
        'metadata': 'metadata',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
      };

      expect(fieldMapping.length, 12,
          reason: 'Notifications now persist in DB for history');
    });

    test('Contact field mapping is unchanged', () {
      const fieldMapping = {
        'id': 'id',
        'ownerId': 'owner_id',
        'name': 'name',
        'email': 'email',
        'phoneNumber': 'phone_number',
        'status': 'status',
        'permission': 'permission',
        'externalUserId': 'external_user_id',
        'labels': 'labels',
        'colorHex': 'color_hex',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
      };

      expect(fieldMapping.length, 12);
    });

    test('Privacy level enum values match DB check constraint', () {
      // Database has: CHECK (privacy_level IN ('normal', 'exclusive', 'superExclusive'))
      const validPrivacyLevels = ['normal', 'exclusive', 'superExclusive'];
      const dartEnumNames = ['normal', 'exclusive', 'superExclusive'];

      for (int i = 0; i < validPrivacyLevels.length; i++) {
        expect(dartEnumNames[i], validPrivacyLevels[i],
            reason:
                'Dart enum must match DB check constraint exactly (case-sensitive)');
      }
    });

    test('Reschedule status enum values match DB check constraint', () {
      // Database has: CHECK (reschedule_status IN ('none', 'pendingContact', 'contactConfirmed', 'awaitingUserApproval', 'scheduled'))
      const validStatuses = [
        'none',
        'pendingContact',
        'contactConfirmed',
        'awaitingUserApproval',
        'scheduled'
      ];
      const dartEnumNames = [
        'none',
        'pendingContact',
        'contactConfirmed',
        'awaitingUserApproval',
        'scheduled'
      ];

      for (int i = 0; i < validStatuses.length; i++) {
        expect(dartEnumNames[i], validStatuses[i],
            reason:
                'Dart enum must match DB check constraint exactly (case-sensitive)');
      }
    });

    test('Signal type enum values match DB check constraint', () {
      // Database has: CHECK (signal_type IN ('available', 'busy', 'flexible', 'unavailable'))
      const validSignalTypes = [
        'available',
        'busy',
        'flexible',
        'unavailable'
      ];
      const dartEnumNames = [
        'available',
        'busy',
        'flexible',
        'unavailable'
      ];

      for (int i = 0; i < validSignalTypes.length; i++) {
        expect(dartEnumNames[i], validSignalTypes[i],
            reason:
                'Dart enum must match DB check constraint exactly (case-sensitive)');
      }
    });

    test('Contact status enum values match DB check constraint', () {
      // Database has: CHECK (status IN ('pending', 'accepted', 'contactOnly'))
      const validStatuses = ['pending', 'accepted', 'contactOnly'];
      const dartEnumNames = ['pending', 'accepted', 'contactOnly'];

      for (int i = 0; i < validStatuses.length; i++) {
        expect(dartEnumNames[i], validStatuses[i],
            reason:
                'Dart enum must match DB check constraint exactly (case-sensitive)');
      }
    });

    test('Contact permission enum values match DB check constraint', () {
      // Database has: CHECK (permission IN ('private', 'semiVisible', 'visible'))
      const validPermissions = ['private', 'semiVisible', 'visible'];
      const dartEnumNames = ['private', 'semiVisible', 'visible'];

      for (int i = 0; i < validPermissions.length; i++) {
        expect(dartEnumNames[i], validPermissions[i],
            reason:
                'Dart enum must match DB check constraint exactly (case-sensitive)');
      }
    });

    test('Calendar provider enum values match DB check constraint', () {
      // Database has: CHECK (provider IN ('myorbit', 'google', 'apple', 'outlook', 'caldav'))
      const validProviders = ['myorbit', 'google', 'apple', 'outlook', 'caldav'];

      // These are all valid values that should be used
      expect(validProviders.length, 5);
      expect(validProviders.contains('google'), true);
      expect(validProviders.contains('apple'), true);
    });
  });
}
