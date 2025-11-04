import 'package:myorbit_calendar/features/calendar/domain/entities/user_calendar.dart';

class UserCalendarModel extends UserCalendar {
  const UserCalendarModel({
    required super.id,
    required super.name,
    required super.colorValue,
    super.isPrimary,
    super.provider,
  });

  factory UserCalendarModel.fromJson(Map<String, dynamic> json) {
    return UserCalendarModel(
      id: json['id'] as String,
      name: json['name'] as String,
      colorValue: json['color_value'] as int,
      isPrimary: json['is_primary'] as bool? ?? false,
      provider: json['provider'] as String?,
    );
  }

  factory UserCalendarModel.fromEntity(UserCalendar calendar) {
    return UserCalendarModel(
      id: calendar.id,
      name: calendar.name,
      colorValue: calendar.colorValue,
      isPrimary: calendar.isPrimary,
      provider: calendar.provider,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'color_value': colorValue,
      'is_primary': isPrimary,
      'provider': provider,
    };
  }

  @override
  UserCalendarModel copyWith({
    String? id,
    String? name,
    int? colorValue,
    bool? isPrimary,
    String? provider,
  }) {
    return UserCalendarModel(
      id: id ?? this.id,
      name: name ?? this.name,
      colorValue: colorValue ?? this.colorValue,
      isPrimary: isPrimary ?? this.isPrimary,
      provider: provider ?? this.provider,
    );
  }
}
