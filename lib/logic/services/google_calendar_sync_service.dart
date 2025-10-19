import 'dart:developer' as developer;
import 'package:googleapis/calendar/v3.dart' as gcal;
import 'package:extension_google_sign_in_as_googleapis_auth/extension_google_sign_in_as_googleapis_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../domain/event.dart';
import '../../core/result.dart';
import '../../core/supabase_client.dart';
import 'api_service.dart';

/// Service for importing events from Google Calendar (one-way sync)
class GoogleCalendarSyncService {
  // Short-circuit in tests to avoid OAuth flows
  static bool _testMode = false;
  static void debugEnableTestMode([bool enabled = true]) => _testMode = enabled;

  static const List<String> _scopes = [
    gcal.CalendarApi.calendarReadonlyScope,
  ];

  /// Import events from Google Calendar into MyOrbit
  static Future<Result<List<CalendarEvent>>> importGoogleCalendarEvents({
    bool includePastEvents = false,
    String? specificCalendarId,
  }) async {
    if (_testMode) {
      return const Success(<CalendarEvent>[]);
    }
    try {
      developer.log('Starting Google Calendar import...',
          name: 'GoogleCalendarSync');

      // Get authenticated client
      final googleSignIn = GoogleSignIn(scopes: _scopes);

      // Check if already signed in
      GoogleSignInAccount? account = googleSignIn.currentUser;
      if (account == null) {
        account = await googleSignIn.signInSilently();
      }
      if (account == null) {
        account = await googleSignIn.signIn();
      }

      if (account == null) {
        return const Failure('Google Sign-In was cancelled');
      }

      // Get authenticated HTTP client
      final auth = await googleSignIn.authenticatedClient();
      if (auth == null) {
        return const Failure('Failed to get authenticated Google client');
      }

      // Create Calendar API client
      final calendarApi = gcal.CalendarApi(auth);

      developer.log('Fetching Google calendars...', name: 'GoogleCalendarSync');

      // Get list of calendars
      final calendarList = await calendarApi.calendarList.list();
      final calendars = calendarList.items ?? [];

      if (calendars.isEmpty) {
        return const Success([]);
      }

      developer.log('Found ${calendars.length} Google calendars',
          name: 'GoogleCalendarSync');

      final List<CalendarEvent> importedEvents = [];

      // Import from specific calendar or all calendars
      final calendarsToImport = specificCalendarId != null
          ? calendars.where((c) => c.id == specificCalendarId).toList()
          : calendars;

      for (final calendar in calendarsToImport) {
        if (calendar.id == null) continue;

        developer.log('Importing from calendar: ${calendar.summary}',
            name: 'GoogleCalendarSync');

        try {
          // Set time range for events
          final timeMin = includePastEvents
              ? DateTime.now()
                  .subtract(const Duration(days: 365)) // 1 year back
              : DateTime.now();
          final timeMax =
              DateTime.now().add(const Duration(days: 365)); // 1 year forward

          // Fetch events from this calendar
          final events = await calendarApi.events.list(
            calendar.id!,
            timeMin: timeMin.toUtc(),
            timeMax: timeMax.toUtc(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500, // Google's max
          );

          final googleEvents = events.items ?? [];
          developer.log(
              'Found ${googleEvents.length} events in ${calendar.summary}',
              name: 'GoogleCalendarSync');

          // Convert each Google event to MyOrbit event
          for (final gEvent in googleEvents) {
            try {
              final myOrbitEvent =
                  _convertGoogleEventToMyOrbit(gEvent, calendar);
              if (myOrbitEvent != null) {
                // Save or update in Supabase by external id
                final result = await _createOrUpdateByExternal(myOrbitEvent);
                await result.when(
                  success: (savedEvent) {
                    importedEvents.add(savedEvent);
                  },
                  failure: (message, exception) {
                    developer.log(
                      'Failed to save event "${gEvent.summary}": $message',
                      name: 'GoogleCalendarSync',
                    );
                  },
                );
              }
            } catch (e) {
              developer.log(
                'Error converting event "${gEvent.summary}": $e',
                name: 'GoogleCalendarSync',
              );
            }
          }
        } catch (e) {
          developer.log(
            'Error importing from calendar "${calendar.summary}": $e',
            name: 'GoogleCalendarSync',
          );
        }
      }

      developer.log(
        'Import complete: ${importedEvents.length} events imported',
        name: 'GoogleCalendarSync',
      );

      return Success(importedEvents);
    } catch (e, stackTrace) {
      developer.log(
        'Google Calendar import failed: $e',
        name: 'GoogleCalendarSync',
        error: e,
        stackTrace: stackTrace,
      );
      return Failure(
          'Failed to import Google Calendar events', e as Exception?);
    }
  }

  /// Convert a Google Calendar event to MyOrbit CalendarEvent
  static CalendarEvent? _convertGoogleEventToMyOrbit(
    gcal.Event googleEvent,
    gcal.CalendarListEntry sourceCalendar,
  ) {
    // Skip if no start time
    if (googleEvent.start == null) {
      return null;
    }

    // Get start and end times
    DateTime start;
    DateTime end;

    bool isFloating = false;
    if (googleEvent.start!.dateTime != null) {
      // Timed event
      start = googleEvent.start!.dateTime!;
      end = googleEvent.end?.dateTime ?? start.add(const Duration(hours: 1));
    } else if (googleEvent.start!.date != null) {
      // All-day event
      start = googleEvent.start!.date!;
      end = googleEvent.end?.date ?? start.add(const Duration(days: 1));
      isFloating = true; // preserve wall-clock semantics for all-day
    } else {
      return null;
    }

    // Determine privacy level based on visibility
    EventPrivacyLevel privacyLevel;
    switch (googleEvent.visibility) {
      case 'private':
        privacyLevel = EventPrivacyLevel.exclusive;
        break;
      case 'confidential':
        privacyLevel = EventPrivacyLevel.superExclusive;
        break;
      default:
        privacyLevel = EventPrivacyLevel.normal;
    }

    return CalendarEvent(
      id: 'google_${googleEvent.id}', // Prefix to avoid ID conflicts
      title: googleEvent.summary ?? 'Untitled Event',
      description: googleEvent.description,
      start: start,
      end: end,
      privacyLevel: privacyLevel,
      ownerId: '', // Will be set by CalendarApi
      calendarId: 'primary', // Default calendar
      createdAt: googleEvent.created ?? DateTime.now(),
      updatedAt: googleEvent.updated ?? DateTime.now(),
      externalProvider: 'google',
      externalEventId: googleEvent.id,
      isFloating: isFloating,
    );
  }

  /// Get list of Google calendars for user to choose from
  static Future<Result<List<GoogleCalendarInfo>>> getGoogleCalendars() async {
    if (_testMode) {
      return const Success(<GoogleCalendarInfo>[]);
    }
    try {
      final googleSignIn = GoogleSignIn(scopes: _scopes);

      GoogleSignInAccount? account = googleSignIn.currentUser;
      if (account == null) {
        account = await googleSignIn.signInSilently();
      }
      if (account == null) {
        account = await googleSignIn.signIn();
      }

      if (account == null) {
        return const Failure('Google Sign-In was cancelled');
      }

      final auth = await googleSignIn.authenticatedClient();
      if (auth == null) {
        return const Failure('Failed to get authenticated Google client');
      }

      final calendarApi = gcal.CalendarApi(auth);
      final calendarList = await calendarApi.calendarList.list();
      final calendars = calendarList.items ?? [];

      final calendarInfoList = calendars.map((cal) {
        return GoogleCalendarInfo(
          id: cal.id ?? '',
          name: cal.summary ?? 'Unnamed Calendar',
          description: cal.description,
          primary: cal.primary ?? false,
        );
      }).toList();

      return Success(calendarInfoList);
    } catch (e) {
      developer.log(
        'Failed to get Google calendars: $e',
        name: 'GoogleCalendarSync',
      );
      return Failure('Failed to get Google calendars', e as Exception?);
    }
  }

  /// Check if user has granted calendar permission
  static Future<bool> hasCalendarPermission() async {
    if (_testMode) {
      return true;
    }
    try {
      final googleSignIn = GoogleSignIn(scopes: _scopes);
      final account =
          googleSignIn.currentUser ?? await googleSignIn.signInSilently();

      if (account == null) {
        return false;
      }

      // Try to get authenticated client - this will fail if permissions aren't granted
      final auth = await googleSignIn.authenticatedClient();
      return auth != null;
    } catch (e) {
      return false;
    }
  }

  /// Sign out from Google
  static Future<void> signOut() async {
    try {
      final googleSignIn = GoogleSignIn(scopes: _scopes);
      await googleSignIn.signOut();
    } catch (e) {
      developer.log('Error signing out from Google: $e',
          name: 'GoogleCalendarSync');
    }
  }
}

/// Create or update an event uniquely identified by (owner_id, external_provider, external_event_id)
Future<Result<CalendarEvent>> _createOrUpdateByExternal(
    CalendarEvent event) async {
  try {
    final client = SupabaseService.clientOrThrow;
    final userId = client.auth.currentUser?.id;
    if (userId == null) {
      return const Failure('User not authenticated');
    }

    final provider = event.externalProvider;
    final extId = event.externalEventId;
    if (provider == null ||
        extId == null ||
        provider.isEmpty ||
        extId.isEmpty) {
      return await CalendarApi.createEvent(event);
    }

    final existing = await client
        .from('events')
        .select('id')
        .eq('owner_id', userId)
        .eq('external_provider', provider)
        .eq('external_event_id', extId)
        .maybeSingle();

    if (existing != null && existing['id'] is String) {
      final toUpdate = event.copyWith(
        id: existing['id'] as String,
        ownerId: userId,
        updatedAt: DateTime.now(),
      );
      return await CalendarApi.updateEvent(toUpdate);
    }

    return await CalendarApi.createEvent(event);
  } catch (e) {
    return Failure(
      'Failed to save imported event',
      e is Exception ? e : Exception(e.toString()),
    );
  }
}

/// Information about a Google Calendar
class GoogleCalendarInfo {
  final String id;
  final String name;
  final String? description;
  final bool primary;

  const GoogleCalendarInfo({
    required this.id,
    required this.name,
    this.description,
    required this.primary,
  });
}
