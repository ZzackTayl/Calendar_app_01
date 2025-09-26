import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class CalendarEvent {
  final String id;
  final String title;
  final DateTime date;
  final String? time;
  final String? description;

  CalendarEvent({
    required this.id,
    required this.title,
    required this.date,
    this.time,
    this.description,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'date': date.toIso8601String(),
      'time': time,
      'description': description,
    };
  }

  factory CalendarEvent.fromJson(Map<String, dynamic> json) {
    return CalendarEvent(
      id: json['id'],
      title: json['title'],
      date: DateTime.parse(json['date']),
      time: json['time'],
      description: json['description'],
    );
  }
}

class EventProvider extends ChangeNotifier {
  List<CalendarEvent> _events = [];
  DateTime _selectedDate = DateTime.now();
  DateTime _focusedDate = DateTime.now();

  List<CalendarEvent> get events => _events;
  DateTime get selectedDate => _selectedDate;
  DateTime get focusedDate => _focusedDate;

  EventProvider() {
    _loadEvents();
  }

  void setSelectedDate(DateTime date) {
    _selectedDate = date;
    notifyListeners();
  }

  void setFocusedDate(DateTime date) {
    _focusedDate = date;
    notifyListeners();
  }

  List<CalendarEvent> getEventsForDate(DateTime date) {
    return _events.where((event) {
      return event.date.year == date.year &&
             event.date.month == date.month &&
             event.date.day == date.day;
    }).toList();
  }

  Future<void> addEvent(CalendarEvent event) async {
    _events.add(event);
    await _saveEvents();
    notifyListeners();
  }

  Future<void> updateEvent(String eventId, CalendarEvent updatedEvent) async {
    final index = _events.indexWhere((event) => event.id == eventId);
    if (index != -1) {
      _events[index] = updatedEvent;
      await _saveEvents();
      notifyListeners();
    }
  }

  Future<void> deleteEvent(String eventId) async {
    _events.removeWhere((event) => event.id == eventId);
    await _saveEvents();
    notifyListeners();
  }

  Future<void> _loadEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final eventsJson = prefs.getStringList('calendar_events') ?? [];

    _events = eventsJson.map((json) {
      return CalendarEvent.fromJson(jsonDecode(json));
    }).toList();

    notifyListeners();
  }

  Future<void> _saveEvents() async {
    final prefs = await SharedPreferences.getInstance();
    final eventsJson = _events.map((event) {
      return jsonEncode(event.toJson());
    }).toList();

    await prefs.setStringList('calendar_events', eventsJson);
  }

  // Add sample events for demonstration (if needed in future)
  Future<void> addSampleEvents() async {
    // Implementation can be added here if required later
  }
}