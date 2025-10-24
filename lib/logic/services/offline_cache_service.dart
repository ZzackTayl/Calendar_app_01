import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../../core/services/encryption_service.dart';
import '../../core/services/secure_storage_service.dart';
import '../../domain/contact.dart';
import '../../domain/event.dart';
import '../../domain/user_calendar.dart';
import 'dev_data_service.dart';

/// Lightweight offline cache to persist user-created data when Supabase
/// credentials are not configured or network access is unavailable.
class OfflineCacheService {
  static const _eventsKey = 'offline_cache_events_v1';
  static const _contactsKey = 'offline_cache_contacts_v1';
  static const _calendarsKey = 'offline_cache_calendars_v1';
  static const _calendarVisibilityKey = 'offline_calendar_visibility_v1';

  /// Load cached events or fall back to seeded mock data.
  static Future<List<CalendarEvent>> loadEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final encryptedString = prefs.getString(_eventsKey);
    if (encryptedString == null) {
      return DevDataService.getMockEvents()
        ..sort((a, b) => a.start.compareTo(b.start));
    }

    try {
      final encryptionKey = await _getEncryptionKey('events');
      // Try to decrypt the stored data
      String? decryptedString =
          EncryptionService.decrypt(encryptedString, encryptionKey);

      decryptedString ??= encryptedString;

      final decoded = jsonDecode(decryptedString) as List<dynamic>;
      final events = decoded
          .whereType<Map<String, dynamic>>()
          .map(CalendarEvent.fromJson)
          .toList()
        ..sort((a, b) => a.start.compareTo(b.start));
      return events;
    } catch (_) {
      return DevDataService.getMockEvents()
        ..sort((a, b) => a.start.compareTo(b.start));
    }
  }

  /// Persist events to local storage.
  static Future<void> saveEvents(List<CalendarEvent> events) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
        events.map((event) => event.toJson()).toList(growable: false));
    final encryptionKey = await _getEncryptionKey('events');
    final encryptedString = EncryptionService.encrypt(encoded, encryptionKey);
    await prefs.setString(_eventsKey, encryptedString);
  }

  /// Load cached contacts or seeded mock data.
  static Future<List<Contact>> loadContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final encryptedString = prefs.getString(_contactsKey);
    if (encryptedString == null) {
      return DevDataService.getMockContacts()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    }

    try {
      final encryptionKey = await _getEncryptionKey('contacts');
      // Try to decrypt the stored data
      String? decryptedString =
          EncryptionService.decrypt(encryptedString, encryptionKey);

      decryptedString ??= encryptedString;

      final decoded = jsonDecode(decryptedString) as List<dynamic>;
      final contacts = decoded
          .whereType<Map<String, dynamic>>()
          .map(Contact.fromJson)
          .toList()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
      return contacts;
    } catch (_) {
      return DevDataService.getMockContacts()
        ..sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
    }
  }

  /// Persist contacts to local storage.
  static Future<void> saveContacts(List<Contact> contacts) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
      contacts
          .map((contact) => contact.toJson(includeLocalFields: true))
          .toList(growable: false),
    );
    final encryptionKey = await _getEncryptionKey('contacts');
    final encryptedString = EncryptionService.encrypt(encoded, encryptionKey);
    await prefs.setString(_contactsKey, encryptedString);
  }

  /// Load cached calendars or seeded mock calendars.
  static Future<List<UserCalendar>> loadCalendars() async {
    final prefs = await SharedPreferences.getInstance();
    final encryptedString = prefs.getString(_calendarsKey);
    if (encryptedString == null) {
      return DevDataService.getMockCalendars();
    }

    try {
      final encryptionKey = await _getEncryptionKey('calendars');
      // Try to decrypt the stored data
      String? decryptedString =
          EncryptionService.decrypt(encryptedString, encryptionKey);

      decryptedString ??= encryptedString;

      final decoded = jsonDecode(decryptedString) as List<dynamic>;
      return decoded
          .whereType<Map<String, dynamic>>()
          .map(UserCalendar.fromJson)
          .toList(growable: false);
    } catch (_) {
      return DevDataService.getMockCalendars();
    }
  }

  /// Persist calendars to local storage.
  static Future<void> saveCalendars(List<UserCalendar> calendars) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = jsonEncode(
      calendars.map((calendar) => calendar.toJson()).toList(growable: false),
    );
    final encryptionKey = await _getEncryptionKey('calendars');
    final encryptedString = EncryptionService.encrypt(encoded, encryptionKey);
    await prefs.setString(_calendarsKey, encryptedString);
  }

  /// Load the last known set of visible calendars.
  static Future<Set<String>> loadVisibleCalendars() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_calendarVisibilityKey);
    if (stored == null) {
      return {DevDataService.primaryCalendarId};
    }
    return stored.toSet();
  }

  /// Persist the currently visible calendars.
  static Future<void> saveVisibleCalendars(Set<String> calendarIds) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(
      _calendarVisibilityKey,
      calendarIds.toList(growable: false),
    );
  }

  // Generate a consistent encryption key for the data type
  static Future<String> _getEncryptionKey(String dataType) async {
    final storageKey = 'offline_cache_secure_key_$dataType';
    final existing = await SecureStorageService.read(storageKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final generatedKey = EncryptionService.generateSecureMasterKey();
    await SecureStorageService.write(storageKey, generatedKey);
    return generatedKey;
  }
}
