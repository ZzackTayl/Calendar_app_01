import 'package:equatable/equatable.dart';
import '../../../../domain/enums.dart';

/// Availability signal domain model for MyOrbit
///
/// Represents a user's availability status for a specific time period.
/// Signals can be shared with contacts to communicate availability.
class AvailabilitySignal extends Equatable {
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
    final hasStarted =
        now.isAfter(startTime) || now.isAtSameMomentAs(startTime);
    final notEnded = now.isBefore(endTime);
    return hasStarted && notEnded;
  }

  /// Check if this signal is in the future
  bool get isFuture => DateTime.now().isBefore(startTime);

  /// Check if this signal has expired
  bool get isExpired => DateTime.now().isAfter(endTime);

  @override
  List<Object?> get props => [
        id,
        userId,
        signalType,
        startTime,
        endTime,
        duration,
        message,
        createdAt,
      ];

  @override
  String toString() {
    return 'AvailabilitySignal(id: $id, userId: $userId, signalType: $signalType, startTime: $startTime, endTime: $endTime)';
  }
}
