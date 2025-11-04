import '../../domain/entities/signal_share.dart';

/// Data model for SignalShare with JSON serialization.
///
/// Extends the pure domain entity and adds serialization logic.
class SignalShareModel extends SignalShare {
  const SignalShareModel({
    required super.id,
    required super.signalId,
    required super.sharedWithUserId,
    required super.sharedByUserId,
    required super.createdAt,
    super.notify,
    super.autoAccept,
  });

  /// Create a SignalShareModel from a domain entity
  factory SignalShareModel.fromEntity(SignalShare share) {
    return SignalShareModel(
      id: share.id,
      signalId: share.signalId,
      sharedWithUserId: share.sharedWithUserId,
      sharedByUserId: share.sharedByUserId,
      createdAt: share.createdAt,
      notify: share.notify,
      autoAccept: share.autoAccept,
    );
  }

  /// Create SignalShareModel from JSON
  factory SignalShareModel.fromJson(Map<String, dynamic> json) {
    return SignalShareModel(
      id: json['id'] as String,
      signalId: json['signal_id'] as String,
      sharedWithUserId: json['shared_with_user_id'] as String,
      sharedByUserId: json['shared_by_user_id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      notify: json['notify'] as bool? ?? true,
      autoAccept: json['auto_accept'] as bool? ?? false,
    );
  }

  /// Convert SignalShareModel to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'signal_id': signalId,
      'shared_with_user_id': sharedWithUserId,
      'shared_by_user_id': sharedByUserId,
      'created_at': createdAt.toIso8601String(),
      'notify': notify,
      'auto_accept': autoAccept,
    };
  }

  /// Create a copy with modified fields
  @override
  SignalShareModel copyWith({
    String? id,
    String? signalId,
    String? sharedWithUserId,
    String? sharedByUserId,
    DateTime? createdAt,
    bool? notify,
    bool? autoAccept,
  }) {
    return SignalShareModel(
      id: id ?? this.id,
      signalId: signalId ?? this.signalId,
      sharedWithUserId: sharedWithUserId ?? this.sharedWithUserId,
      sharedByUserId: sharedByUserId ?? this.sharedByUserId,
      createdAt: createdAt ?? this.createdAt,
      notify: notify ?? this.notify,
      autoAccept: autoAccept ?? this.autoAccept,
    );
  }
}
