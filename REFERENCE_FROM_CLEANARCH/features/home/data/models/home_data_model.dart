part of 'models.dart';

class HomeDataModel {
  final CalendarEventModel? upcomingEvent;
  final int upcomingEventsCount;
  final AvailabilityModel availability;
  final int notificationCount;

  HomeDataModel({
    this.upcomingEvent,
    required this.upcomingEventsCount,
    required this.availability,
    required this.notificationCount,
  });

  factory HomeDataModel.fromJson(Map<String, dynamic> json) {
    return HomeDataModel(
      upcomingEvent: json['upcoming_event'] != null
          ? CalendarEventModel.fromJson(json['upcoming_event'])
          : null,
      upcomingEventsCount: json['upcoming_events_count'] ?? 0,
      availability: AvailabilityModel.fromJson(json['availability'] ?? {}),
      notificationCount: json['notification_count'] ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'upcoming_event': upcomingEvent?.toJson(),
      'upcoming_events_count': upcomingEventsCount,
      'availability': availability.toJson(),
      'notification_count': notificationCount,
    };
  }
}
