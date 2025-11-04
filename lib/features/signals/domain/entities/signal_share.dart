import 'package:equatable/equatable.dart';

/// Signal share domain model for MyOrbit
///
/// Represents the sharing of an availability signal with a specific contact.
/// Tracks who can see a signal and when it was shared.
class SignalShare extends Equatable {
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

  /// Whether the recipient should receive proactive notifications
  final bool notify;

  /// Whether requests during the signal window should auto-accept
  final bool autoAccept;

  const SignalShare({
    required this.id,
    required this.signalId,
    required this.sharedWithUserId,
    required this.sharedByUserId,
    required this.createdAt,
    this.notify = true,
    this.autoAccept = false,
  });

  /// Create a copy with modified fields
  SignalShare copyWith({
    String? id,
    String? signalId,
    String? sharedWithUserId,
    String? sharedByUserId,
    DateTime? createdAt,
    bool? notify,
    bool? autoAccept,
  }) {
    return SignalShare(
      id: id ?? this.id,
      signalId: signalId ?? this.signalId,
      sharedWithUserId: sharedWithUserId ?? this.sharedWithUserId,
      sharedByUserId: sharedByUserId ?? this.sharedByUserId,
      createdAt: createdAt ?? this.createdAt,
      notify: notify ?? this.notify,
      autoAccept: autoAccept ?? this.autoAccept,
    );
  }

  @override
  List<Object?> get props => [
        id,
        signalId,
        sharedWithUserId,
        sharedByUserId,
        createdAt,
        notify,
        autoAccept,
      ];

  @override
  String toString() {
    return 'SignalShare(id: $id, signalId: $signalId, sharedWithUserId: $sharedWithUserId, sharedByUserId: $sharedByUserId, notify: $notify, autoAccept: $autoAccept)';
  }
}
