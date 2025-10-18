import 'enums.dart';
import 'event_reschedule_state_machine.dart';
import 'recurrence_rule.dart';

/// Calendar event domain model for MyOrbit
class CalendarEvent {
  final String id;
  final String title;
  final String? description;
  final DateTime start;
  final DateTime end;
  final EventPrivacyLevel privacyLevel;
  final List<String> invitedPartnerIds;
  final String? externalProvider;
  final String? externalEventId;
  final String ownerId;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? eventCategoryId;
  final String calendarId;
  final String? recurrenceRuleId;

  /// Recurrence rule for repeating events (null for one-time events)
  final RecurrenceRule? recurrenceRule;

  /// ID of the parent event if this is a recurring event instance
  final String? parentEventId;

  /// Whether this is an exception to a recurring event
  final bool isException;

  /// Current state of any reschedule workflow tied to this event.
  final EventRescheduleStatus rescheduleStatus;

  const CalendarEvent({
    required this.id,
    required this.title,
    this.description,
    required this.start,
    required this.end,
    this.privacyLevel = EventPrivacyLevel.normal,
    this.invitedPartnerIds = const [],
    this.externalProvider,
    this.externalEventId,
    required this.ownerId,
    this.createdAt,
    this.updatedAt,
    this.eventCategoryId,
    this.calendarId = 'primary',
    this.recurrenceRuleId,
    this.recurrenceRule,
    this.parentEventId,
    this.isException = false,
    this.rescheduleStatus = EventRescheduleStatus.none,
  });

  /// Create CalendarEvent from JSON
  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    RecurrenceRule? recurrenceRule;
    final recurrenceRuleJson = json['recurrence_rule'];
    if (recurrenceRuleJson is Map<String, dynamic>) {
      recurrenceRule = RecurrenceRule.fromJson(recurrenceRuleJson);
    }

    return CalendarEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      start: _parseDateTime(json['start'] ?? json['start_ts']),
      end: _parseDateTime(json['end'] ?? json['end_ts']),
      privacyLevel: EventPrivacyLevel.values.firstWhere(
        (e) => e.name == json['privacy_level'],
        orElse: () => EventPrivacyLevel.normal,
      ),
      invitedPartnerIds: (json['invited_partner_ids'] as List<dynamic>?)?.cast<String>() ?? [],
      externalProvider: json['external_provider'] as String?,
      externalEventId: json['external_event_id'] as String?,
      ownerId: json['owner_id'] as String,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : null,
      updatedAt: json['updated_at'] != null ? DateTime.parse(json['updated_at'] as String) : null,
      eventCategoryId: json['event_category_id'] as String?,
      calendarId: json['calendar_id'] as String? ?? 'primary',
      recurrenceRuleId: json['recurrence_rule_id'] as String?,
      recurrenceRule: recurrenceRule,
      parentEventId: json['parent_event_id'] as String?,
      isException: json['is_exception'] as bool? ?? false,
      rescheduleStatus: _parseRescheduleStatus(json['reschedule_status']),
    );
  }

  /// Convert CalendarEvent to JSON
  Map<String, dynamic> toJson() {
    final data = <String, dynamic>{
      'id': id,
      'title': title,
      'description': description,
      'start_ts': start.toIso8601String(),
      'end_ts': end.toIso8601String(),
      'privacy_level': privacyLevel.name,
      'invited_partner_ids': invitedPartnerIds,
      'external_provider': externalProvider,
      'external_event_id': externalEventId,
      'owner_id': ownerId,
      'event_category_id': eventCategoryId,
      'calendar_id': calendarId,
      'recurrence_rule_id': recurrenceRuleId,
      'parent_event_id': parentEventId,
      'is_exception': isException,
      'reschedule_status': rescheduleStatus.name,
    };
    if (createdAt != null) {
      data['created_at'] = createdAt!.toIso8601String();
    }
    if (updatedAt != null) {
      data['updated_at'] = updatedAt!.toIso8601String();
    }
    if (recurrenceRule != null) {
      data['recurrence_rule'] = recurrenceRule!.toJson();
    }
    return data;
  }

  /// Create a copy with modified fields
  CalendarEvent copyWith({
    String? id,
    String? title,
    String? description,
    DateTime? start,
    DateTime? end,
    EventPrivacyLevel? privacyLevel,
    List<String>? invitedPartnerIds,
    String? externalProvider,
    String? externalEventId,
    String? ownerId,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? eventCategoryId,
    String? calendarId,
    String? recurrenceRuleId,
    RecurrenceRule? recurrenceRule,
    String? parentEventId,
    bool? isException,
    EventRescheduleStatus? rescheduleStatus,
  }) {
    return CalendarEvent(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      start: start ?? this.start,
      end: end ?? this.end,
      privacyLevel: privacyLevel ?? this.privacyLevel,
      invitedPartnerIds: invitedPartnerIds ?? this.invitedPartnerIds,
      externalProvider: externalProvider ?? this.externalProvider,
      externalEventId: externalEventId ?? this.externalEventId,
      ownerId: ownerId ?? this.ownerId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      eventCategoryId: eventCategoryId ?? this.eventCategoryId,
      calendarId: calendarId ?? this.calendarId,
      recurrenceRuleId: recurrenceRuleId ?? this.recurrenceRuleId,
      recurrenceRule: recurrenceRule ?? this.recurrenceRule,
      parentEventId: parentEventId ?? this.parentEventId,
      isException: isException ?? this.isException,
      rescheduleStatus: rescheduleStatus ?? this.rescheduleStatus,
    );
  }

  /// Check if this event is a recurring event
  bool get isRecurring => recurrenceRule != null;

  /// Check if this event is part of a recurring series
  bool get isRecurrenceInstance => parentEventId != null;

  /// Get the duration of this event
  Duration get duration => end.difference(start);

  /// Generate recurring event instances for a given date range
  List<CalendarEvent> generateRecurringInstances({
    required DateTime rangeStart,
    required DateTime rangeEnd,
    int? maxInstances,
  }) {
    if (!isRecurring || recurrenceRule == null) {
      return [];
    }

    final occurrences = recurrenceRule!.generateOccurrences(
      startDate: start,
      rangeStart: rangeStart,
      rangeEnd: rangeEnd,
      maxOccurrences: maxInstances,
    );

    return occurrences.map((occurrence) {
      final instanceStart = DateTime(
        occurrence.year,
        occurrence.month,
        occurrence.day,
        start.hour,
        start.minute,
        start.second,
        start.millisecond,
      );
      final instanceEnd = instanceStart.add(duration);

      return copyWith(
        id: '${id}_${occurrence.millisecondsSinceEpoch}',
        start: instanceStart,
        end: instanceEnd,
        parentEventId: id,
        recurrenceRule: null, // Instances don't have recurrence rules
        rescheduleStatus: rescheduleStatus,
      );
    }).toList();
  }

  /// Create an exception to a recurring event
  CalendarEvent createException({
    required DateTime newStart,
    DateTime? newEnd,
    String? newTitle,
    String? newDescription,
  }) {
    return copyWith(
      id: '${parentEventId ?? id}_exception_${newStart.millisecondsSinceEpoch}',
      start: newStart,
      end: newEnd ?? newStart.add(duration),
      title: newTitle ?? title,
      description: newDescription ?? description,
      isException: true,
      recurrenceRule: null,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CalendarEvent &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          title == other.title &&
          description == other.description &&
          start == other.start &&
          end == other.end &&
          privacyLevel == other.privacyLevel &&
          calendarId == other.calendarId &&
          invitedPartnerIds == other.invitedPartnerIds &&
          externalProvider == other.externalProvider &&
          externalEventId == other.externalEventId &&
          ownerId == other.ownerId &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt &&
          recurrenceRuleId == other.recurrenceRuleId &&
          rescheduleStatus == other.rescheduleStatus;

  @override
  int get hashCode =>
      id.hashCode ^
      title.hashCode ^
      description.hashCode ^
      start.hashCode ^
      end.hashCode ^
      privacyLevel.hashCode ^
      calendarId.hashCode ^
      invitedPartnerIds.hashCode ^
      externalProvider.hashCode ^
      externalEventId.hashCode ^
      ownerId.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode ^
      recurrenceRuleId.hashCode ^
      rescheduleStatus.hashCode;

  @override
  String toString() {
    return 'CalendarEvent(id: $id, title: $title, start: $start, end: $end, privacyLevel: $privacyLevel)';
  }

  /// Map representation aligning with Supabase `events` table for inserts.
  Map<String, dynamic> toDatabaseInsertMap() {
    final data = <String, dynamic>{
      'id': id,
      'owner_id': ownerId,
      'calendar_id': calendarId,
      'title': title,
      'description': description,
      'start': start.toIso8601String(),
      'end': end.toIso8601String(),
      'privacy_level': privacyLevel.name,
      'reschedule_status': rescheduleStatus.name,
      'invited_partner_ids': invitedPartnerIds,
      'external_provider': externalProvider,
      'external_event_id': externalEventId,
      'event_category_id': eventCategoryId,
      'recurrence_rule_id': recurrenceRuleId,
      'parent_event_id': parentEventId,
      'is_exception': isException,
    };

    if (createdAt != null) {
      data['created_at'] = createdAt!.toIso8601String();
    }
    if (updatedAt != null) {
      data['updated_at'] = updatedAt!.toIso8601String();
    }

    return data;
  }

  /// Map representation aligning with Supabase `events` table for updates.
  Map<String, dynamic> toDatabaseUpdateMap() {
    final data = <String, dynamic>{
      'calendar_id': calendarId,
      'title': title,
      'description': description,
      'start': start.toIso8601String(),
      'end': end.toIso8601String(),
      'privacy_level': privacyLevel.name,
      'reschedule_status': rescheduleStatus.name,
      'invited_partner_ids': invitedPartnerIds,
      'external_provider': externalProvider,
      'external_event_id': externalEventId,
      'event_category_id': eventCategoryId,
      'recurrence_rule_id': recurrenceRuleId,
      'parent_event_id': parentEventId,
      'is_exception': isException,
    };

    if (updatedAt != null) {
      data['updated_at'] = updatedAt!.toIso8601String();
    }

    return data;
  }

  /// Transition the reschedule workflow to the provided state.
  ///
  /// Throws [StateError] if the transition is invalid.
  CalendarEvent transitionRescheduleStatus(
    EventRescheduleStatus nextStatus,
  ) {
    final machine = EventRescheduleStateMachine.fromStatus(rescheduleStatus);
    machine.transitionTo(nextStatus);
    return copyWith(rescheduleStatus: machine.status);
  }

  static EventRescheduleStatus _parseRescheduleStatus(dynamic raw) {
    if (raw is! String || raw.isEmpty) {
      return EventRescheduleStatus.none;
    }

    return EventRescheduleStatus.values.firstWhere(
      (status) => status.name == raw,
      orElse: () => EventRescheduleStatus.none,
    );
  }

  static DateTime _parseDateTime(dynamic raw) {
    if (raw is String) {
      return DateTime.parse(raw);
    }
    if (raw is DateTime) {
      return raw;
    }
    throw ArgumentError('Unsupported date value: $raw');
  }
}

enum EventPrivacyLevel {
  normal,
  exclusive,
  superExclusive,
}

class EventInvite {
  final String id;
  final String eventId;
  final String contactId;
  final InviteStatus status;
  final DateTime? createdAt;
  final DateTime? respondedAt;

  const EventInvite({
    required this.id,
    required this.eventId,
    required this.contactId,
    this.status = InviteStatus.pending,
    this.createdAt,
    this.respondedAt,
  });

  factory EventInvite.fromJson(Map<String, dynamic> json) {
    return EventInvite(
      id: json['id'] as String,
      eventId: json['event_id'] as String,
      contactId: json['contact_id'] as String,
      status: InviteStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => InviteStatus.pending,
      ),
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : null,
      respondedAt:
          json['responded_at'] != null ? DateTime.parse(json['responded_at'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'event_id': eventId,
      'contact_id': contactId,
      'status': status.name,
      'created_at': createdAt?.toIso8601String(),
      'responded_at': respondedAt?.toIso8601String(),
    };
  }

  EventInvite copyWith({
    String? id,
    String? eventId,
    String? contactId,
    InviteStatus? status,
    DateTime? createdAt,
    DateTime? respondedAt,
  }) {
    return EventInvite(
      id: id ?? this.id,
      eventId: eventId ?? this.eventId,
      contactId: contactId ?? this.contactId,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      respondedAt: respondedAt ?? this.respondedAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is EventInvite &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          eventId == other.eventId &&
          contactId == other.contactId &&
          status == other.status &&
          createdAt == other.createdAt &&
          respondedAt == other.respondedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      eventId.hashCode ^
      contactId.hashCode ^
      status.hashCode ^
      createdAt.hashCode ^
      respondedAt.hashCode;

  @override
  String toString() {
    return 'EventInvite(id: $id, eventId: $eventId, contactId: $contactId, status: $status)';
  }
}

enum InviteStatus {
  pending,
  accepted,
  declined,
}
