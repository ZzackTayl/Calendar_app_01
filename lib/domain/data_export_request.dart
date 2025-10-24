/// Domain model representing a user's data export request.
class DataExportRequest {
  final String id;
  final String userId;
  final bool includeEvents;
  final bool includeContacts;
  final bool includeSignals;
  final String format;
  final String status;
  final String? downloadUrl;
  final DateTime createdAt;
  final DateTime? completedAt;
  final String? errorMessage;

  const DataExportRequest({
    required this.id,
    required this.userId,
    required this.includeEvents,
    required this.includeContacts,
    required this.includeSignals,
    required this.format,
    required this.status,
    required this.createdAt,
    this.downloadUrl,
    this.completedAt,
    this.errorMessage,
  });

  factory DataExportRequest.fromJson(Map<String, dynamic> json) {
    return DataExportRequest(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      includeEvents: json['include_events'] as bool? ?? true,
      includeContacts: json['include_contacts'] as bool? ?? true,
      includeSignals: json['include_signals'] as bool? ?? true,
      format: json['format'] as String? ?? 'json',
      status: json['status'] as String? ?? 'pending',
      downloadUrl: json['download_url'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      errorMessage: json['error_message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'include_events': includeEvents,
      'include_contacts': includeContacts,
      'include_signals': includeSignals,
      'format': format,
      'status': status,
      'download_url': downloadUrl,
      'created_at': createdAt.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'error_message': errorMessage,
    };
  }
}
