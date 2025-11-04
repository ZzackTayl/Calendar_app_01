import 'package:equatable/equatable.dart';

/// Domain entity describing a discoverable external calendar.
class ExternalCalendarInfo extends Equatable {
  const ExternalCalendarInfo({
    required this.id,
    required this.name,
    this.description,
    this.isPrimary = false,
  });

  final String id;
  final String name;
  final String? description;
  final bool isPrimary;

  ExternalCalendarInfo copyWith({
    String? id,
    String? name,
    String? description,
    bool? isPrimary,
  }) {
    return ExternalCalendarInfo(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      isPrimary: isPrimary ?? this.isPrimary,
    );
  }

  @override
  List<Object?> get props => [id, name, description, isPrimary];
}
