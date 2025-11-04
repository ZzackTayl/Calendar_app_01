import '../../../../domain/enums.dart';
import '../../domain/entities/availability_signal.dart';

/// Data model for AvailabilitySignal with JSON serialization.
///
/// Extends the pure domain entity and adds serialization logic.
class AvailabilitySignalModel extends AvailabilitySignal {
  const AvailabilitySignalModel({
    required super.id,
    required super.userId,
    required super.signalType,
    required super.startTime,
    required super.endTime,
    super.duration,
    super.message,
    required super.createdAt,
  });

  /// Create an AvailabilitySignalModel from a domain entity
  factory AvailabilitySignalModel.fromEntity(AvailabilitySignal signal) {
    return AvailabilitySignalModel(
      id: signal.id,
      userId: signal.userId,
      signalType: signal.signalType,
      startTime: signal.startTime,
      endTime: signal.endTime,
      duration: signal.duration,
      message: signal.message,
      createdAt: signal.createdAt,
    );
  }

  /// Create AvailabilitySignalModel from JSON
  factory AvailabilitySignalModel.fromJson(Map<String, dynamic> json) {
    return AvailabilitySignalModel(
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

  /// Convert AvailabilitySignalModel to JSON
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
  @override
  AvailabilitySignalModel copyWith({
    String? id,
    String? userId,
    SignalType? signalType,
    DateTime? startTime,
    DateTime? endTime,
    SignalDuration? duration,
    String? message,
    DateTime? createdAt,
  }) {
    return AvailabilitySignalModel(
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
}
