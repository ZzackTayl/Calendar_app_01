import 'enums.dart';

/// Defines allowed transitions for an event reschedule workflow.
///
/// This state machine keeps the reschedule lifecycle deterministic so both the
/// AI assistant and the UI can safely drive updates without drifting into
/// invalid states.
class EventRescheduleStateMachine {
  EventRescheduleStateMachine(
    this._status, {
    DateTime? updatedAt,
  }) : _updatedAt = updatedAt ?? DateTime.now();

  /// Current status of the reschedule workflow.
  EventRescheduleStatus get status => _status;

  /// Timestamp of the last status change.
  DateTime get updatedAt => _updatedAt;

  EventRescheduleStatus _status;
  DateTime _updatedAt;

  static const Map<EventRescheduleStatus, Set<EventRescheduleStatus>> _allowedTransitions = {
    EventRescheduleStatus.none: {
      EventRescheduleStatus.none,
      EventRescheduleStatus.pendingContact,
    },
    EventRescheduleStatus.pendingContact: {
      EventRescheduleStatus.pendingContact,
      EventRescheduleStatus.contactConfirmed,
      EventRescheduleStatus.awaitingUserApproval,
      EventRescheduleStatus.none,
    },
    EventRescheduleStatus.contactConfirmed: {
      EventRescheduleStatus.contactConfirmed,
      EventRescheduleStatus.awaitingUserApproval,
      EventRescheduleStatus.scheduled,
      EventRescheduleStatus.none,
    },
    EventRescheduleStatus.awaitingUserApproval: {
      EventRescheduleStatus.awaitingUserApproval,
      EventRescheduleStatus.scheduled,
      EventRescheduleStatus.none,
    },
    EventRescheduleStatus.scheduled: {
      EventRescheduleStatus.scheduled,
      EventRescheduleStatus.none,
    },
  };

  /// Returns `true` if the state machine allows the transition.
  static bool canTransition(
    EventRescheduleStatus from,
    EventRescheduleStatus to,
  ) {
    final allowed = _allowedTransitions[from];
    if (allowed == null) return false;
    return allowed.contains(to);
  }

  /// Advances the state machine to a new state.
  ///
  /// Throws [StateError] if the transition is not allowed.
  void transitionTo(EventRescheduleStatus nextStatus) {
    if (!canTransition(_status, nextStatus)) {
      throw StateError(
        'Invalid reschedule transition: ${_status.name} -> ${nextStatus.name}',
      );
    }

    if (_status == nextStatus) {
      // No-op transition, but maintain deterministic behavior.
      return;
    }

    _status = nextStatus;
    _updatedAt = DateTime.now();
  }

  /// Returns the set of valid target states for UI affordances.
  static Set<EventRescheduleStatus> allowedTargets(
    EventRescheduleStatus from,
  ) {
    return _allowedTransitions[from] ?? const {};
  }

  /// Helper for reconstructing the machine from persisted status values.
  factory EventRescheduleStateMachine.fromStatus(EventRescheduleStatus status) {
    return EventRescheduleStateMachine(status);
  }
}
