import 'package:equatable/equatable.dart';

/// Domain entity representing a user's connected calendar.
///
/// Keeps UI-specific concerns (e.g. `Color`) out of the domain layer by storing
/// raw values only. Presentation code is responsible for mapping these to UI
/// abstractions.
class UserCalendar extends Equatable {
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

  @override
  List<Object?> get props => [id, name, colorValue, isPrimary, provider];
}
