import 'package:myorbit_calendar/features/external_calendar/domain/entities/external_calendar_info.dart';

class ExternalCalendarInfoModel extends ExternalCalendarInfo {
  const ExternalCalendarInfoModel({
    required super.id,
    required super.name,
    super.description,
    super.isPrimary,
  });

  factory ExternalCalendarInfoModel.fromJson(Map<String, dynamic> json) {
    return ExternalCalendarInfoModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      isPrimary: json['is_primary'] as bool? ?? false,
    );
  }

  factory ExternalCalendarInfoModel.fromEntity(ExternalCalendarInfo info) {
    return ExternalCalendarInfoModel(
      id: info.id,
      name: info.name,
      description: info.description,
      isPrimary: info.isPrimary,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'is_primary': isPrimary,
    };
  }
}
