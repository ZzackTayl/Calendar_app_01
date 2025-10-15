/// Domain model representing a user's connected calendar.
///
/// The domain layer keeps this object free of any Flutter UI types such as
/// [Color]. UI code can translate the stored [colorValue] to concrete colors.
class UserCalendar {
  const UserCalendar({
    required this.id,
    required this.name,
    required this.colorValue,
    this.isPrimary = false,
    this.provider,
  });

  /// Unique identifier for the calendar (stable across sessions).
  final String id;

  /// Display name the user should see in toggles and pickers.
  final String name;

  /// 0xAARRGGBB color value used for UI accents (converted to [Color]).
  final int colorValue;

  /// Whether this calendar is the user's primary calendar.
  final bool isPrimary;

  /// Optional upstream provider label (e.g., "Google", "Outlook").
  final String? provider;

  UserCalendar copyWith({
    String? id,
    String? name,
    int? colorValue,
    bool? isPrimary,
    String? provider,
  }) {
    return UserCalendar(
      id: id ?? this.id,
      name: name ?? this.name,
      colorValue: colorValue ?? this.colorValue,
      isPrimary: isPrimary ?? this.isPrimary,
      provider: provider ?? this.provider,
    );
  }

  factory UserCalendar.fromJson(Map<String, dynamic> json) {
    return UserCalendar(
      id: json['id'] as String,
      name: json['name'] as String,
      colorValue: json['color_value'] as int,
      isPrimary: json['is_primary'] as bool? ?? false,
      provider: json['provider'] as String?,
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
}
