part of 'model.dart';

class CalendarSyncModel {
  final CalendarProvider provider;
  final bool isConnected;
  final String? accountEmail;

  const CalendarSyncModel({
    required this.provider,
    this.isConnected = false,
    this.accountEmail,
  });

  CalendarSyncModel copyWith({
    CalendarProvider? provider,
    bool? isConnected,
    String? accountEmail,
  }) {
    return CalendarSyncModel(
      provider: provider ?? this.provider,
      isConnected: isConnected ?? this.isConnected,
      accountEmail: accountEmail ?? this.accountEmail,
    );
  }
}
