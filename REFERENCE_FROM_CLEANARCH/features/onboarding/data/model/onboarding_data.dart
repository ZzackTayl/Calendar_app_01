part of 'model.dart';

class OnboardingData {
  final CalendarSyncModel? calendarSync;
  final bool contactsImported;
  final DateTime completedAt;

  const OnboardingData({
    this.calendarSync,
    this.contactsImported = false,
    required this.completedAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'calendarProvider': calendarSync?.provider.name,
      'calendarConnected': calendarSync?.isConnected ?? false,
      'accountEmail': calendarSync?.accountEmail,
      'contactsImported': contactsImported,
      'completedAt': completedAt.toIso8601String(),
    };
  }

  factory OnboardingData.fromJson(Map<String, dynamic> json) {
    CalendarProvider? provider;
    if (json['calendarProvider'] != null) {
      provider = CalendarProvider.values.firstWhere(
        (e) => e.name == json['calendarProvider'],
        orElse: () => CalendarProvider.none,
      );
    }

    return OnboardingData(
      calendarSync: provider != null
          ? CalendarSyncModel(
              provider: provider,
              isConnected: json['calendarConnected'] ?? false,
              accountEmail: json['accountEmail'],
            )
          : null,
      contactsImported: json['contactsImported'] ?? false,
      completedAt: DateTime.parse(json['completedAt']),
    );
  }
}
