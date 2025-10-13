/// Signal share domain model for MyOrbit
///
/// Represents the sharing of an availability signal with a specific contact.
/// Tracks who can see a signal and when it was shared.
class SignalShare {
  /// Unique identifier for the signal share
  final String id;

  /// ID of the signal being shared
  final String signalId;

  /// ID of the user receiving the shared signal
  final String sharedWithUserId;

  /// ID of the user who shared the signal
  final String sharedByUserId;

  /// Timestamp when the signal was shared
  final DateTime createdAt;

  const SignalShare({
    required this.id,
    required this.signalId,
    required this.sharedWithUserId,
    required this.sharedByUserId,
    required this.createdAt,
  });

  /// Create SignalShare from JSON
  factory SignalShare.fromJson(Map<String, dynamic> json) {
    return SignalShare(
      id: json['id'] as String,
      signalId: json['signal_id'] as String,
      sharedWithUserId: json['shared_with_user_id'] as String,
      sharedByUserId: json['shared_by_user_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert SignalShare to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'signal_id': signalId,
      'shared_with_user_id': sharedWithUserId,
      'shared_by_user_id': sharedByUserId,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Create a copy with modified fields
  SignalShare copyWith({
    String? id,
    String? signalId,
    String? sharedWithUserId,
    String? sharedByUserId,
    DateTime? createdAt,
  }) {
    return SignalShare(
      id: id ?? this.id,
      signalId: signalId ?? this.signalId,
      sharedWithUserId: sharedWithUserId ?? this.sharedWithUserId,
      sharedByUserId: sharedByUserId ?? this.sharedByUserId,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SignalShare &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          signalId == other.signalId &&
          sharedWithUserId == other.sharedWithUserId &&
          sharedByUserId == other.sharedByUserId &&
          createdAt == other.createdAt;

  @override
  int get hashCode =>
      id.hashCode ^
      signalId.hashCode ^
      sharedWithUserId.hashCode ^
      sharedByUserId.hashCode ^
      createdAt.hashCode;

  @override
  String toString() {
    return 'SignalShare(id: $id, signalId: $signalId, sharedWithUserId: $sharedWithUserId, sharedByUserId: $sharedByUserId)';
  }
}
