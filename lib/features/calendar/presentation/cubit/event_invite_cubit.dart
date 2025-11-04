// Event Invite Cubit following MyOrbit_CleanArch pattern

import 'dart:developer' as developer;

import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/enums/app_state_status.dart';
import '../../../../domain/event.dart';
import '../../../contacts/domain/entities/contact.dart';
import '../../domain/repositories/event_repository.dart';
import '../../../contacts/domain/repositories/contact_repository.dart';

/// Event invite details with full event and contact info
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
      return '$hours hr $mins min';
    }
  }

  /// Whether the event is recurring
  bool get isRecurring => event.recurrenceRule != null;

  /// Number of other attendees (excluding organizer)
  int get otherAttendeesCount => attendees.length;
}

/// Event Invite state
class EventInviteState {
  final AppStateStatus status;
  final List<EventInvite> pendingInvites;
  final EventInviteDetails? currentInviteDetails;
  final List<CalendarEvent> conflicts;
  final String message;

  const EventInviteState({
    this.status = AppStateStatus.initial,
    this.pendingInvites = const [],
    this.currentInviteDetails,
    this.conflicts = const [],
    this.message = '',
  });

  EventInviteState copyWith({
    AppStateStatus? status,
    List<EventInvite>? pendingInvites,
    EventInviteDetails? currentInviteDetails,
    List<CalendarEvent>? conflicts,
    String? message,
  }) {
    return EventInviteState(
      status: status ?? this.status,
      pendingInvites: pendingInvites ?? this.pendingInvites,
      currentInviteDetails: currentInviteDetails ?? this.currentInviteDetails,
      conflicts: conflicts ?? this.conflicts,
      message: message ?? this.message,
    );
  }
}

/// Event Invite Cubit for managing event invitations
class EventInviteCubit extends Cubit<EventInviteState> {
  final EventRepository eventRepository;
  final ContactRepository contactRepository;

  EventInviteCubit({
    required this.eventRepository,
    required this.contactRepository,
  }) : super(const EventInviteState());

  /// Load pending event invites
  Future<void> loadPendingInvites() async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await eventRepository.getPendingInvites();
    result.fold(
      (failure) {
        developer.log(
          'Failed to load pending invites: ${failure.message}',
          name: 'EventInviteCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (invites) {
        emit(state.copyWith(
          status: AppStateStatus.success,
          pendingInvites: invites,
        ));
      },
    );
  }

  /// Load invite details for a specific invite
  Future<void> loadInviteDetails(String inviteId) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    // Fetch event for invite
    final eventResult = await eventRepository.getEventForInvite(inviteId);
    
    await eventResult.fold(
      (failure) async {
        developer.log(
          'Failed to load event for invite: ${failure.message}',
          name: 'EventInviteCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (event) async {
        // Fetch contacts
        final contactsResult = await contactRepository.getContacts();
        
        await contactsResult.fold(
          (failure) async {
            developer.log(
              'Failed to load contacts: ${failure.message}',
              name: 'EventInviteCubit',
            );
            // Continue with unknown organizer
            final details = EventInviteDetails(
              inviteId: inviteId,
              event: event,
              organizer: Contact(
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
              attendees: const [],
            );
            
            emit(state.copyWith(
              status: AppStateStatus.success,
              currentInviteDetails: details,
            ));
          },
          (contacts) async {
            // Find organizer
            final organizer = contacts.firstWhere(
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
            );

            // Find attendees
            final attendees = contacts
                .where((c) => event.invitedPartnerIds.contains(c.id))
                .toList();

            final details = EventInviteDetails(
              inviteId: inviteId,
              event: event,
              organizer: organizer,
              attendees: attendees,
            );

            emit(state.copyWith(
              status: AppStateStatus.success,
              currentInviteDetails: details,
            ));
          },
        );
      },
    );
  }

  /// Respond to an event invitation
  Future<void> respondToInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  }) async {
    emit(state.copyWith(status: AppStateStatus.loading));

    final result = await eventRepository.respondToEventInvite(
      inviteId,
      response,
      note: note,
    );

    result.fold(
      (failure) {
        developer.log(
          'Failed to respond to invite: ${failure.message}',
          name: 'EventInviteCubit',
        );
        emit(state.copyWith(
          status: AppStateStatus.failure,
          message: failure.message,
        ));
      },
      (_) async {
        // If accepted, the event should be added to calendar
        // Refresh pending invites
        await loadPendingInvites();
        
        emit(state.copyWith(
          status: AppStateStatus.success,
          message: 'Response sent successfully',
        ));
      },
    );
  }

  /// Check for calendar conflicts for an invite
  Future<void> checkConflicts(String inviteId) async {
    // Get event for invite
    final eventResult = await eventRepository.getEventForInvite(inviteId);
    
    await eventResult.fold(
      (failure) async {
        developer.log(
          'Failed to get event for conflict check: ${failure.message}',
          name: 'EventInviteCubit',
        );
        emit(state.copyWith(conflicts: []));
      },
      (event) async {
        // Get all events
        final eventsResult = await eventRepository.getEvents();
        
        eventsResult.fold(
          (failure) {
            developer.log(
              'Failed to get events for conflict check: ${failure.message}',
              name: 'EventInviteCubit',
            );
            emit(state.copyWith(conflicts: []));
          },
          (allEvents) {
            // Find overlapping events
            final conflicts = allEvents.where((e) {
              if (e.id == event.id) return false; // Skip self

              // Check time overlap
              final hasOverlap =
                  e.start.isBefore(event.end) && e.end.isAfter(event.start);
              return hasOverlap;
            }).toList();

            emit(state.copyWith(conflicts: conflicts));
          },
        );
      },
    );
  }

  /// Clear current invite details
  void clearCurrentInvite() {
    emit(state.copyWith(
      currentInviteDetails: null,
      conflicts: [],
    ));
  }

  /// Refresh invites
  Future<void> refresh() => loadPendingInvites();
}
