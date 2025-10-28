import 'dart:async';
import 'dart:developer' as developer;

import 'package:extension_google_sign_in_as_googleapis_auth/extension_google_sign_in_as_googleapis_auth.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:googleapis/calendar/v3.dart' as gcal;
import 'package:googleapis_auth/googleapis_auth.dart' as gapis;
import '../../domain/event.dart';
import '../../core/result.dart';
import '../../core/supabase_client.dart';
import 'api_service.dart';

/// Service for importing events from Google Calendar (one-way sync)
class GoogleCalendarSyncService {
  // Short-circuit in tests to avoid OAuth flows
  static bool _testMode = false;
  static void debugEnableTestMode([bool enabled = true]) => _testMode = enabled;

  static final GoogleSignIn _googleSignIn = GoogleSignIn.instance;
  static Future<void>? _initializing;
  static GoogleSignInAccount? _cachedAccount;
  static StreamSubscription<GoogleSignInAuthenticationEvent>? _authSubscription;

  static const List<String> _scopes = [
    gcal.CalendarApi.calendarReadonlyScope,
  ];

  static Future<void> _ensureInitialized() async {
    if (_initializing != null) {
      return _initializing!;
    }
    final completer = Completer<void>();
    _initializing = completer.future;
    () async {
      try {
        await _googleSignIn.initialize();
        _authSubscription ??=
            _googleSignIn.authenticationEvents.listen((event) {
          if (event is GoogleSignInAuthenticationEventSignIn) {
            _cachedAccount = event.user;
          } else if (event is GoogleSignInAuthenticationEventSignOut) {
            _cachedAccount = null;
          }
        }, onError: (Object error, StackTrace stackTrace) {
          developer.log(
            'Google authentication event error: $error',
            name: 'GoogleCalendarSync',
            stackTrace: stackTrace,
          );
        });
        completer.complete();
      } catch (error, stackTrace) {
        _initializing = null;
        completer.completeError(error, stackTrace);
      }
    }();
    return completer.future;
  }

  static Future<GoogleSignInAccount?> _obtainAccount({
    required bool interactive,
  }) async {
    await _ensureInitialized();

    GoogleSignInAccount? account = _cachedAccount;

    try {
      final Future<GoogleSignInAccount?>? attempt =
          _googleSignIn.attemptLightweightAuthentication();
      if (attempt != null) {
        account ??= await attempt;
      } else {
        // If no future is returned (e.g. web), rely on any cached user.
        account ??= _cachedAccount;
      }
    } on GoogleSignInException catch (error) {
      developer.log(
        'Lightweight Google authentication failed: $error',
        name: 'GoogleCalendarSync',
      );
    }

    if (account == null &&
        interactive &&
        _googleSignIn.supportsAuthenticate()) {
      try {
        account = await _googleSignIn.authenticate(scopeHint: _scopes);
      } on GoogleSignInException catch (error) {
        developer.log(
          'Interactive Google authentication failed: $error',
          name: 'GoogleCalendarSync',
        );
        return null;
      }
    }

    return account;
  }

  static Future<Result<_AuthorizedGoogleClient>> _authorizedClient({
    required bool allowUserPrompt,
  }) async {
    if (_testMode) {
      return const Failure('Test mode enabled');
    }

    try {
      await _ensureInitialized();
    } catch (error, stackTrace) {
      developer.log(
        'Failed to initialize Google Sign-In: $error',
        name: 'GoogleCalendarSync',
        stackTrace: stackTrace,
      );
      return Failure(
        'Failed to initialize Google Sign-In',
        error is Exception ? error : Exception(error.toString()),
      );
    }

    final account = await _obtainAccount(interactive: allowUserPrompt);
    if (account == null) {
      return const Failure(
        'Google account not connected. Please sign in with Google and try again.',
      );
    }

    GoogleSignInClientAuthorization? authorization;
    try {
      authorization =
          await account.authorizationClient.authorizationForScopes(_scopes);
    } on GoogleSignInException catch (error) {
      developer.log(
        'Failed to check Google authorization: $error',
        name: 'GoogleCalendarSync',
      );
    }

    if (authorization == null && allowUserPrompt) {
      try {
        authorization =
            await account.authorizationClient.authorizeScopes(_scopes);
      } on GoogleSignInException catch (error) {
        developer.log(
          'User declined Google Calendar permissions: $error',
          name: 'GoogleCalendarSync',
        );
        return const Failure(
          'Permission to access Google Calendar was not granted.',
        );
      }
    }

    if (authorization == null) {
      return const Failure(
        'Permission to access Google Calendar is missing.',
      );
    }

    final gapis.AuthClient client = authorization.authClient(scopes: _scopes);
    return Success(
      _AuthorizedGoogleClient(
        account: account,
        client: client,
      ),
    );
  }

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

      final authResult = await _authorizedClient(allowUserPrompt: true);
      return await authResult.when(
        success: (context) async {
          final calendarApi = gcal.CalendarApi(context.client);

          developer.log(
            'Fetching Google calendars...',
            name: 'GoogleCalendarSync',
          );

          try {
            final calendarList = await calendarApi.calendarList.list();
            final calendars = calendarList.items ?? [];

            if (calendars.isEmpty) {
              return const Success(<CalendarEvent>[]);
            }

            developer.log(
              'Found ${calendars.length} Google calendars',
              name: 'GoogleCalendarSync',
            );

            final List<CalendarEvent> importedEvents = [];

            final calendarsToImport = specificCalendarId != null
                ? calendars.where((c) => c.id == specificCalendarId).toList()
                : calendars;

            for (final calendar in calendarsToImport) {
              if (calendar.id == null) continue;

              developer.log(
                'Importing from calendar: ${calendar.summary}',
                name: 'GoogleCalendarSync',
              );

              try {
                final timeMin = includePastEvents
                    ? DateTime.now().subtract(const Duration(days: 365))
                    : DateTime.now();
                final timeMax = DateTime.now().add(const Duration(days: 365));

                final events = await calendarApi.events.list(
                  calendar.id!,
                  timeMin: timeMin.toUtc(),
                  timeMax: timeMax.toUtc(),
                  singleEvents: true,
                  orderBy: 'startTime',
                  maxResults: 2500,
                );

                final googleEvents = events.items ?? [];
                developer.log(
                  'Found ${googleEvents.length} events in ${calendar.summary}',
                  name: 'GoogleCalendarSync',
                );

                for (final gEvent in googleEvents) {
                  try {
                    final myOrbitEvent =
                        _convertGoogleEventToMyOrbit(gEvent, calendar);
                    if (myOrbitEvent != null) {
                      final result =
                          await _createOrUpdateByExternal(myOrbitEvent);
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
          } finally {
            context.client.close();
          }
        },
        failure: (message, exception) async => Failure(message, exception),
      );
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
      final authResult = await _authorizedClient(allowUserPrompt: true);
      return await authResult.when(
        success: (context) async {
          try {
            final calendarApi = gcal.CalendarApi(context.client);
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
          } finally {
            context.client.close();
          }
        },
        failure: (message, exception) async => Failure(message, exception),
      );
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
      await _ensureInitialized();
      final account = await _obtainAccount(interactive: false);

      if (account == null) {
        return false;
      }

      final authorization =
          await account.authorizationClient.authorizationForScopes(_scopes);
      return authorization != null;
    } catch (e) {
      return false;
    }
  }

  /// Sign out from Google
  static Future<void> signOut() async {
    try {
      await _ensureInitialized();
      await _googleSignIn.signOut();
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

class _AuthorizedGoogleClient {
  const _AuthorizedGoogleClient({
    required this.account,
    required this.client,
  });

  final GoogleSignInAccount account;
  final gapis.AuthClient client;
}
