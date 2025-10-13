import 'package:myorbit_calendar/domain/event.dart';

/// Mock providers for testing
class MockProviders {
  /// Sample mock events for testing
  static final List<CalendarEvent> mockEvents = [
    CalendarEvent(
      id: '1',
      title: 'Team Meeting',
      description: 'Weekly team sync',
      start: DateTime.now().add(const Duration(hours: 2)),
      end: DateTime.now().add(const Duration(hours: 3)),
      ownerId: 'test-user-1',
      privacyLevel: EventPrivacyLevel.normal,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    CalendarEvent(
      id: '2',
      title: 'Coffee with Sam',
      description: 'Catch up over coffee',
      start: DateTime.now().add(const Duration(days: 1, hours: 10)),
      end: DateTime.now().add(const Duration(days: 1, hours: 11)),
      ownerId: 'test-user-1',
      privacyLevel: EventPrivacyLevel.normal,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    CalendarEvent(
      id: '3',
      title: 'Project Planning',
      description: 'Q4 planning session',
      start: DateTime.now().add(const Duration(days: 2)),
      end: DateTime.now().add(const Duration(days: 2, hours: 2)),
      ownerId: 'test-user-1',
      privacyLevel: EventPrivacyLevel.normal,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
  ];

  /// Create empty event list
  static List<CalendarEvent> get emptyEvents => [];

  /// Create a single event for today
  static List<CalendarEvent> todayEvents() {
    final now = DateTime.now();
    return [
      CalendarEvent(
        id: 'today-1',
        title: 'Today\'s Event',
        description: 'An event happening today',
        start: DateTime(now.year, now.month, now.day, 14, 0),
        end: DateTime(now.year, now.month, now.day, 15, 0),
        ownerId: 'test-user-1',
        privacyLevel: EventPrivacyLevel.normal,
        createdAt: now,
        updatedAt: now,
      ),
    ];
  }

  /// Create events for a specific date
  static List<CalendarEvent> eventsForDate(DateTime date) {
    return [
      CalendarEvent(
        id: 'date-1',
        title: 'Event on ${date.day}/${date.month}',
        description: 'Test event',
        start: DateTime(date.year, date.month, date.day, 10, 0),
        end: DateTime(date.year, date.month, date.day, 11, 0),
        ownerId: 'test-user-1',
        privacyLevel: EventPrivacyLevel.normal,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    ];
  }

  /// Create all-day event
  static CalendarEvent createAllDayEvent({
    String id = 'all-day-1',
    String title = 'All Day Event',
    DateTime? date,
  }) {
    final eventDate = date ?? DateTime.now();
    return CalendarEvent(
      id: id,
      title: title,
      description: 'An all-day event',
      start: DateTime(eventDate.year, eventDate.month, eventDate.day),
      end: DateTime(eventDate.year, eventDate.month, eventDate.day, 23, 59),
      ownerId: 'test-user-1',
      privacyLevel: EventPrivacyLevel.normal,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Create recurring events
  static List<CalendarEvent> createRecurringEvents({
    required String title,
    required DateTime startDate,
    required int count,
    Duration interval = const Duration(days: 7),
  }) {
    return List.generate(count, (index) {
      final eventDate = startDate.add(interval * index);
      return CalendarEvent(
        id: 'recurring-$index',
        title: '$title (Week ${index + 1})',
        description: 'Recurring event',
        start: eventDate,
        end: eventDate.add(const Duration(hours: 1)),
        ownerId: 'test-user-1',
        privacyLevel: EventPrivacyLevel.normal,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    });
  }
}
