import 'dart:developer' as developer;
import 'dart:io';
import 'package:flutter/services.dart';
import '../../domain/event.dart';
import '../../core/result.dart';

/// Service for importing events from Apple Calendar (iOS/macOS only)
/// 
/// NOTE: Full implementation requires native iOS/macOS EventKit integration
/// via platform channels. This is the service structure.
class AppleCalendarSyncService {
  // Short-circuit in tests to avoid platform channel calls
  static bool _testMode = false;
  static void debugEnableTestMode([bool enabled = true]) => _testMode = enabled;
  static const MethodChannel _channel = MethodChannel('com.myorbit/apple_calendar');

  /// Check if platform supports Apple Calendar import
  static bool get isPlatformSupported {
    if (_testMode) return true;
    return Platform.isIOS || Platform.isMacOS;
  }

  /// Request calendar permissions
  static Future<bool> requestPermissions() async {
    if (_testMode) return true;
    if (!isPlatformSupported) {
      return false;
    }

    try {
      // Call native platform code to request EventKit permissions
      final result = await _channel.invokeMethod<bool>('requestPermissions');
      return result ?? false;
    } on PlatformException catch (e) {
      developer.log('Error requesting calendar permissions: ${e.message}', 
          name: 'AppleCalendarSync');
      return false;
    } catch (e) {
      developer.log('Error requesting calendar permissions: $e', 
          name: 'AppleCalendarSync');
      return false;
    }
  }

  /// Import events from Apple Calendar into MyOrbit
  static Future<Result<List<CalendarEvent>>> importAppleCalendarEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    if (_testMode) {
      return const Success(<CalendarEvent>[]);
    }
    if (!isPlatformSupported) {
      return const Failure('Apple Calendar import is only available on iOS and macOS');
    }

    try {
      developer.log('Starting Apple Calendar import...', name: 'AppleCalendarSync');

      // Request permissions
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        return const Failure('Calendar permission denied. Please enable calendar access in Settings.');
      }

      // Call native platform code to get events
      final startDate = includePastEvents
          ? DateTime.now().subtract(const Duration(days: 365))
          : DateTime.now();
      final endDate = DateTime.now().add(const Duration(days: 365));

      final eventsData = await _channel.invokeMethod<List<dynamic>>('getEvents', {
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
        'calendarId': specificCalendarId,
      });

      if (eventsData == null) {
        return const Success([]);
      }

      final List<CalendarEvent> importedEvents = [];

      // Convert and import each event
      for (final eventData in eventsData) {
        try {
          final myOrbitEvent = _convertNativeEventToMyOrbit(eventData as Map<String, dynamic>);
          if (myOrbitEvent != null) {
            // Save to Supabase using CalendarApi
            // Note: You'll need to import api_service.dart
            developer.log('Would import event: ${myOrbitEvent.title}', 
                name: 'AppleCalendarSync');
            importedEvents.add(myOrbitEvent);
          }
        } catch (e) {
          developer.log('Error converting event: $e', name: 'AppleCalendarSync');
        }
      }

      developer.log(
        'Import complete: ${importedEvents.length} events imported',
        name: 'AppleCalendarSync',
      );

      return Success(importedEvents);
    } catch (e, stackTrace) {
      developer.log(
        'Apple Calendar import failed: $e',
        name: 'AppleCalendarSync',
        error: e,
        stackTrace: stackTrace,
      );
      return Failure('Failed to import Apple Calendar events', e as Exception?);
    }
  }

  /// Convert a native Apple Calendar event to MyOrbit CalendarEvent
  static CalendarEvent? _convertNativeEventToMyOrbit(Map<String, dynamic> eventData) {
    try {
      final startString = eventData['start'] as String?;
      if (startString == null) return null;

      final start = DateTime.parse(startString);
      final endString = eventData['end'] as String?;
      final end = endString != null 
          ? DateTime.parse(endString)
          : start.add(const Duration(hours: 1));

      return CalendarEvent(
        id: 'apple_${eventData['id']}',
        title: eventData['title'] as String? ?? 'Untitled Event',
        description: eventData['description'] as String?,
        start: start,
        end: end,
        privacyLevel: EventPrivacyLevel.normal,
        ownerId: '', // Will be set by CalendarApi
        calendarId: 'primary',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        externalProvider: 'apple',
        externalEventId: eventData['id'] as String?,
      );
    } catch (e) {
      developer.log('Error parsing event data: $e', name: 'AppleCalendarSync');
      return null;
    }
  }

  /// Get list of Apple calendars for user to choose from
  static Future<Result<List<AppleCalendarInfo>>> getAppleCalendars() async {
    if (_testMode) {
      return const Success(<AppleCalendarInfo>[]);
    }
    if (!isPlatformSupported) {
      return const Failure('Apple Calendar is only available on iOS and macOS');
    }

    try {
      final hasPermission = await requestPermissions();
      if (!hasPermission) {
        return const Failure('Calendar permission denied');
      }

      final calendarsData = await _channel.invokeMethod<List<dynamic>>('getCalendars');
      if (calendarsData == null) {
        return const Success([]);
      }

      final calendarInfoList = calendarsData.map((cal) {
        final calMap = cal as Map<String, dynamic>;
        return AppleCalendarInfo(
          id: calMap['id'] as String? ?? '',
          name: calMap['name'] as String? ?? 'Unnamed Calendar',
          color: calMap['color'] as int?,
          isDefault: calMap['isDefault'] as bool? ?? false,
        );
      }).toList();

      return Success(calendarInfoList);
    } on PlatformException catch (e) {
      developer.log(
        'Failed to get Apple calendars: ${e.message}',
        name: 'AppleCalendarSync',
      );
      return Failure('Failed to get Apple calendars: ${e.message}', null);
    } catch (e) {
      developer.log(
        'Failed to get Apple calendars: $e',
        name: 'AppleCalendarSync',
      );
      return Failure('Failed to get Apple calendars', e as Exception?);
    }
  }

  /// Check if user has granted calendar permission
  static Future<bool> hasCalendarPermission() async {
    if (_testMode) return true;
    if (!isPlatformSupported) {
      return false;
    }

    try {
      final result = await _channel.invokeMethod<bool>('hasPermissions');
      return result ?? false;
    } catch (e) {
      return false;
    }
  }
}

/// Information about an Apple Calendar
class AppleCalendarInfo {
  final String id;
  final String name;
  final int? color;
  final bool isDefault;

  const AppleCalendarInfo({
    required this.id,
    required this.name,
    this.color,
    required this.isDefault,
  });
}
