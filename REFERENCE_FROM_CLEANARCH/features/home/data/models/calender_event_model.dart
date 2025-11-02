part of 'models.dart';

class CalendarEventModel {
  final String id;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String timezone;

  CalendarEventModel({
    required this.id,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.timezone,
  });

  // From Firebase/API JSON
  factory CalendarEventModel.fromJson(Map<String, dynamic> json) {
    return CalendarEventModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      startTime: json['start_time'] is String
          ? DateTime.parse(json['start_time'])
          : (json['start_time'] as dynamic).toDate(), // Firebase Timestamp
      endTime: json['end_time'] is String
          ? DateTime.parse(json['end_time'])
          : (json['end_time'] as dynamic).toDate(), // Firebase Timestamp
      timezone: json['timezone'] ?? '',
    );
  }

  // To Firebase/API JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'start_time': startTime
          .toIso8601String(), // Or Timestamp.fromDate(startTime) for Firebase
      'end_time': endTime.toIso8601String(),
      'timezone': timezone,
    };
  }

  // To Firestore (for Firebase)
  Map<String, dynamic> toFirestore() {
    return {
      'id': id,
      'title': title,
      'start_time': startTime, // Firebase will auto-convert to Timestamp
      'end_time': endTime,
      'timezone': timezone,
    };
  }
}
