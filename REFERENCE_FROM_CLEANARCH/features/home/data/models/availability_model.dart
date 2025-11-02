part of 'models.dart';

class AvailabilityModel {
  final int signalsActive;
  final int mineCount;
  final int connectionsCount;

  AvailabilityModel({
    required this.signalsActive,
    required this.mineCount,
    required this.connectionsCount,
  });

  factory AvailabilityModel.fromJson(Map<String, dynamic> json) {
    return AvailabilityModel(
      signalsActive: json['signals_active'] ?? 0,
      mineCount: json['mine_count'] ?? 0,
      connectionsCount: json['connections_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'signals_active': signalsActive,
      'mine_count': mineCount,
      'connections_count': connectionsCount,
    };
  }

  // Copy method for easy updates
  AvailabilityModel copyWith({
    int? signalsActive,
    int? mineCount,
    int? connectionsCount,
  }) {
    return AvailabilityModel(
      signalsActive: signalsActive ?? this.signalsActive,
      mineCount: mineCount ?? this.mineCount,
      connectionsCount: connectionsCount ?? this.connectionsCount,
    );
  }
}
