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
  /// Recurrence rule for repeating events (null for one-time events)
  final RecurrenceRule? recurrenceRule;
  /// ID of the parent event if this is a recurring event instance
  final String? parentEventId;
  /// Whether this is an exception to a recurring event
  final bool isException;

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
    this.recurrenceRule,
    this.parentEventId,
    this.isException = false,
  });

  /// Create CalendarEvent from JSON
  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      start: DateTime.parse(json['start'] as String),
      end: DateTime.parse(json['end'] as String),
      privacyLevel: EventPrivacyLevel.values.firstWhere(
        (e) => e.name == json['privacy_level'],
        orElse: () => EventPrivacyLevel.normal,
      ),
      invitedPartnerIds:
          (json['invited_partner_ids'] as List<dynamic>?)?.cast<String>() ?? [],
      externalProvider: json['external_provider'] as String?,
      externalEventId: json['external_event_id'] as String?,
      ownerId: json['owner_id'] as String,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
      recurrenceRule: json['recurrence_rule'] != null
          ? RecurrenceRule.fromJson(json['recurrence_rule'] as Map<String, dynamic>)
          : null,
      parentEventId: json['parent_event_id'] as String?,
      isException: json['is_exception'] as bool? ?? false,
    );
  }

  /// Convert CalendarEvent to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'start': start.toIso8601String(),
      'end': end.toIso8601String(),
      'privacy_level': privacyLevel.name,
      'invited_partner_ids': invitedPartnerIds,
      'external_provider': externalProvider,
      'external_event_id': externalEventId,
      'owner_id': ownerId,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
      'recurrence_rule': recurrenceRule?.toJson(),
      'parent_event_id': parentEventId,
      'is_exception': isException,
    };
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
    RecurrenceRule? recurrenceRule,
    String? parentEventId,
    bool? isException,
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
      recurrenceRule: recurrenceRule ?? this.recurrenceRule,
      parentEventId: parentEventId ?? this.parentEventId,
      isException: isException ?? this.isException,
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
          invitedPartnerIds == other.invitedPartnerIds &&
          externalProvider == other.externalProvider &&
          externalEventId == other.externalEventId &&
          ownerId == other.ownerId &&
          createdAt == other.createdAt &&
          updatedAt == other.updatedAt;

  @override
  int get hashCode =>
      id.hashCode ^
      title.hashCode ^
      description.hashCode ^
      start.hashCode ^
      end.hashCode ^
      privacyLevel.hashCode ^
      invitedPartnerIds.hashCode ^
      externalProvider.hashCode ^
      externalEventId.hashCode ^
      ownerId.hashCode ^
      createdAt.hashCode ^
      updatedAt.hashCode;

  @override
  String toString() {
    return 'CalendarEvent(id: $id, title: $title, start: $start, end: $end, privacyLevel: $privacyLevel)';
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
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : null,
      respondedAt: json['responded_at'] != null
          ? DateTime.parse(json['responded_at'] as String)
          : null,
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
