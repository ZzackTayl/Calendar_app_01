import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/event.dart';
import '../../domain/contact.dart';
import '../services/api_service.dart';
import 'event_providers.dart';
import 'contact_providers.dart';
import 'notification_providers.dart';

part 'event_invite_providers.g.dart';

// ======================================================================
// PROVIDERS
// ======================================================================

/// Pending event invites for current user
@riverpod
Future<List<EventInvite>> pendingEventInvites(Ref ref) async {
  final result = await CalendarApi.getPendingInvites();
  return result.when(
    success: (invites) => invites,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Event details for a specific invite
@riverpod
Future<CalendarEvent> eventForInvite(Ref ref, String inviteId) async {
  final result = await CalendarApi.getEventForInvite(inviteId);
  return result.when(
    success: (event) => event,
    failure: (message, exception) => throw Exception(message),
  );
}

/// Invite details with full event and contact info
@riverpod
Future<EventInviteDetails> inviteDetails(Ref ref, String inviteId) async {
  // Fetch event
  final eventResult = await CalendarApi.getEventForInvite(inviteId);
  final event = eventResult.when(
    success: (e) => e,
    failure: (message, _) => throw Exception(message),
  );

  // Fetch organizer contact
  final contacts = ref.watch(contactListProvider);
  final organizerContact = contacts.when(
    data: (list) => list.firstWhere(
      (c) => c.externalUserId == event.ownerId,
      orElse: () => Contact(
        id: 'unknown',
        name: 'Unknown',
        email: '',
        phoneNumber: null,
        colorHex: '#4D8CFF',
        permission: PartnerPermission.private,
        status: ContactStatus.accepted,
        ownerId: event.ownerId,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        externalUserId: event.ownerId,
      ),
    ),
    loading: () => throw Exception('Loading contacts'),
    error: (_, __) => throw Exception('Failed to load contacts'),
  );

  // Fetch invited contacts (attendees)
  final attendees = contacts.when(
    data: (list) => list
        .where(
          (c) => event.invitedPartnerIds.contains(c.id),
        )
        .toList(),
    loading: () => <Contact>[],
    error: (_, __) => <Contact>[],
  );

  return EventInviteDetails(
    inviteId: inviteId,
    event: event,
    organizer: organizerContact,
    attendees: attendees,
  );
}

// ======================================================================
// STATE NOTIFIER
// ======================================================================

@riverpod
class EventInviteNotifier extends _$EventInviteNotifier {
  @override
  AsyncValue<void> build() => const AsyncValue.data(null);

  /// Respond to an event invitation
  Future<void> respondToInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  }) async {
    state = const AsyncValue.loading();

    final result = await CalendarApi.respondToEventInvite(
      inviteId,
      response,
      note: note,
    );

    result.when(
      success: (_) async {
        // If accepted, auto-add event to calendar
        if (response == InviteStatus.accepted) {
          final eventResult = await CalendarApi.getEventForInvite(inviteId);
          eventResult.when(
            success: (event) {
              // Refresh events to show newly accepted event
              ref.invalidate(eventListProvider);
            },
            failure: (_, __) {
              // Ignore error, event will sync eventually
            },
          );
        }

        // Refresh pending invites
        ref.invalidate(pendingEventInvitesProvider);

        // Refresh notifications
        ref.invalidate(notificationListProvider);

        state = const AsyncValue.data(null);
      },
      failure: (message, exception) {
        state = AsyncValue.error(Exception(message), StackTrace.current);
      },
    );
  }

  /// Check for calendar conflicts for an invite
  Future<List<CalendarEvent>> checkConflicts(String inviteId) async {
    final eventResult = await CalendarApi.getEventForInvite(inviteId);
    final event = eventResult.when(
      success: (e) => e,
      failure: (_, __) => null,
    );

    if (event == null) return [];

    final eventsAsync = ref.read(eventListProvider);
    final allEvents = eventsAsync.when(
      data: (events) => events,
      loading: () => <CalendarEvent>[],
      error: (_, __) => <CalendarEvent>[],
    );

    // Find overlapping events
    return allEvents.where((e) {
      if (e.id == event.id) return false; // Skip self

      // Check time overlap
      final hasOverlap = e.start.isBefore(event.end) && e.end.isAfter(event.start);
      return hasOverlap;
    }).toList();
  }
}

// ======================================================================
// MODELS
// ======================================================================

/// Full event invite details with related data
class EventInviteDetails {
  final String inviteId;
  final CalendarEvent event;
  final Contact organizer;
  final List<Contact> attendees;

  const EventInviteDetails({
    required this.inviteId,
    required this.event,
    required this.organizer,
    required this.attendees,
  });

  /// Duration of the event
  Duration get duration => event.end.difference(event.start);

  /// Formatted duration (e.g., "1 hour", "30 minutes")
  String get formattedDuration {
    final minutes = duration.inMinutes;
    if (minutes < 60) {
      return '$minutes min';
    } else if (minutes % 60 == 0) {
      final hours = minutes ~/ 60;
      return '$hours hour${hours > 1 ? 's' : ''}';
    } else {
      final hours = minutes ~/ 60;
      final mins = minutes % 60;
      return '${hours}h ${mins}m';
    }
  }

  /// Is this a recurring event?
  bool get isRecurring =>
      event.recurrenceRule != null || event.recurrenceRuleId != null || event.parentEventId != null;

  /// How many other attendees?
  int get otherAttendeesCount => attendees.length;
}
