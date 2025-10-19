/// Domain model for a calendar import/export migration record.
class CalendarMigrationRecord {
  const CalendarMigrationRecord({
    required this.id,
    required this.source,
    required this.includePastEvents,
    required this.includeSharedCalendars,
    required this.mergeDuplicates,
    required this.notifyPartners,
    required this.status,
    required this.createdAt,
    this.completedAt,
    this.errorMessage,
  });

  final String id;
  final String source;
  final bool includePastEvents;
  final bool includeSharedCalendars;
  final bool mergeDuplicates;
  final bool notifyPartners;
  final CalendarMigrationStatus status;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? errorMessage;

  factory CalendarMigrationRecord.fromJson(Map<String, dynamic> json) {
    return CalendarMigrationRecord(
      id: json['id'] as String,
      source: json['source'] as String? ?? 'unknown',
      includePastEvents: json['include_past_events'] as bool? ?? false,
      includeSharedCalendars:
          json['include_shared_calendars'] as bool? ?? false,
      mergeDuplicates: json['merge_duplicates'] as bool? ?? false,
      notifyPartners: json['notify_partners'] as bool? ?? false,
      status: CalendarMigrationStatusX.fromName(json['status'] as String?),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? '') ??
          DateTime.now(),
      completedAt: DateTime.tryParse(json['completed_at'] as String? ?? ''),
      errorMessage: json['error_message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'source': source,
      'include_past_events': includePastEvents,
      'include_shared_calendars': includeSharedCalendars,
      'merge_duplicates': mergeDuplicates,
      'notify_partners': notifyPartners,
      'status': status.name,
      'created_at': createdAt.toIso8601String(),
      if (completedAt != null) 'completed_at': completedAt!.toIso8601String(),
      if (errorMessage != null) 'error_message': errorMessage,
    };
  }

  CalendarMigrationRecord copyWith({
    CalendarMigrationStatus? status,
    DateTime? completedAt,
    String? errorMessage,
  }) {
    return CalendarMigrationRecord(
      id: id,
      source: source,
      includePastEvents: includePastEvents,
      includeSharedCalendars: includeSharedCalendars,
      mergeDuplicates: mergeDuplicates,
      notifyPartners: notifyPartners,
      status: status ?? this.status,
      createdAt: createdAt,
      completedAt: completedAt ?? this.completedAt,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

/// Status of a calendar migration job.
enum CalendarMigrationStatus {
  processing,
  completed,
  failed,
  unknown,
}

extension CalendarMigrationStatusX on CalendarMigrationStatus {
  static const _lookup = <String, CalendarMigrationStatus>{
    'processing': CalendarMigrationStatus.processing,
    'completed': CalendarMigrationStatus.completed,
    'failed': CalendarMigrationStatus.failed,
  };

  static CalendarMigrationStatus fromName(String? value) {
    if (value == null) {
      return CalendarMigrationStatus.unknown;
    }
    return _lookup[value.toLowerCase()] ?? CalendarMigrationStatus.unknown;
  }

  String get label {
    return {
          CalendarMigrationStatus.processing: 'Processing',
          CalendarMigrationStatus.completed: 'Completed',
          CalendarMigrationStatus.failed: 'Failed',
          CalendarMigrationStatus.unknown: 'Unknown',
        }[this] ??
        'Unknown';
  }

  bool get isTerminal =>
      this == CalendarMigrationStatus.completed ||
      this == CalendarMigrationStatus.failed;
}
