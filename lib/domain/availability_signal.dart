import 'enums.dart';

/// Availability signal domain model for MyOrbit
///
/// Represents a user's availability status for a specific time period.
/// Signals can be shared with contacts to communicate availability.
class AvailabilitySignal {
  /// Unique identifier for the signal
  final String id;

  /// ID of the user who created this signal
  final String userId;

  /// Type of signal (available, busy, flexible, unavailable)
  final SignalType signalType;

  /// Start time of the availability period
  final DateTime startTime;

  /// End time of the availability period
  final DateTime endTime;

  /// Duration preset used (if applicable)
  final SignalDuration? duration;

  /// Optional message or note about the availability
  final String? message;

  /// Timestamp when the signal was created
  final DateTime createdAt;

  const AvailabilitySignal({
    required this.id,
    required this.userId,
    required this.signalType,
    required this.startTime,
    required this.endTime,
    this.duration,
    this.message,
    required this.createdAt,
  });

  /// Create AvailabilitySignal from JSON
  factory AvailabilitySignal.fromJson(Map<String, dynamic> json) {
    return AvailabilitySignal(
      id: json['id'] as String,
      userId: json['user_id'] as String,
      signalType: SignalType.values.firstWhere(
        (e) => e.name == json['signal_type'],
        orElse: () => SignalType.available,
      ),
      startTime: DateTime.parse(json['start_time'] as String),
      endTime: DateTime.parse(json['end_time'] as String),
      duration: json['duration'] != null
          ? SignalDuration.values.firstWhere(
              (e) => e.name == json['duration'],
              orElse: () => SignalDuration.custom,
            )
          : null,
      message: json['message'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  /// Convert AvailabilitySignal to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'signal_type': signalType.name,
      'start_time': startTime.toIso8601String(),
      'end_time': endTime.toIso8601String(),
      'duration': duration?.name,
      'message': message,
      'created_at': createdAt.toIso8601String(),
    };
  }

  /// Create a copy with modified fields
  AvailabilitySignal copyWith({
    String? id,
    String? userId,
    SignalType? signalType,
    DateTime? startTime,
    DateTime? endTime,
    SignalDuration? duration,
    String? message,
    DateTime? createdAt,
  }) {
    return AvailabilitySignal(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      signalType: signalType ?? this.signalType,
      startTime: startTime ?? this.startTime,
      endTime: endTime ?? this.endTime,
      duration: duration ?? this.duration,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  /// Calculate the duration of this signal
  Duration get calculatedDuration => endTime.difference(startTime);

  /// Check if this signal is currently active
  bool get isActive {
    final now = DateTime.now();
    return now.isAfter(startTime) && now.isBefore(endTime);
  }

  /// Check if this signal is in the future
  bool get isFuture => DateTime.now().isBefore(startTime);

  /// Check if this signal has expired
  bool get isExpired => DateTime.now().isAfter(endTime);

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is AvailabilitySignal &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          userId == other.userId &&
          signalType == other.signalType &&
          startTime == other.startTime &&
          endTime == other.endTime &&
          duration == other.duration &&
          message == other.message &&
          createdAt == other.createdAt;

  @override
  int get hashCode =>
      id.hashCode ^
      userId.hashCode ^
      signalType.hashCode ^
      startTime.hashCode ^
      endTime.hashCode ^
      duration.hashCode ^
      message.hashCode ^
      createdAt.hashCode;

  @override
  String toString() {
    return 'AvailabilitySignal(id: $id, userId: $userId, signalType: $signalType, startTime: $startTime, endTime: $endTime)';
  }
}
