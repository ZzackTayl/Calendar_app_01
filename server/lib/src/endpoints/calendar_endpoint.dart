import 'package:serverpod/serverpod.dart';
import '../generated/calendar.dart';

class CalendarEndpoint extends Endpoint {
  /// Get all calendar events
  Future<List<Calendar>> getAll(Session session) async {
    try {
      return await Calendar.db.find(session);
    } catch (e) {
      throw Exception('Failed to fetch calendar events: $e');
    }
  }

  /// Get calendar events for a specific date
  Future<List<Calendar>> getByDate(Session session, DateTime date) async {
    try {
      // Get events for the entire day
      final startOfDay = DateTime(date.year, date.month, date.day);
      final endOfDay = startOfDay.add(const Duration(days: 1));

      return await Calendar.db.find(
        session,
        where: (t) => t.date.between(startOfDay, endOfDay),
        orderBy: (t) => t.date,
      );
    } catch (e) {
      throw Exception('Failed to fetch calendar events for date: $e');
    }
  }

  /// Get calendar events within a date range
  Future<List<Calendar>> getByDateRange(
    Session session,
    DateTime startDate,
    DateTime endDate,
  ) async {
    try {
      return await Calendar.db.find(
        session,
        where: (t) => t.date.between(startDate, endDate),
        orderBy: (t) => t.date,
      );
    } catch (e) {
      throw Exception('Failed to fetch calendar events for date range: $e');
    }
  }

  /// Get a specific calendar event by ID
  Future<Calendar?> getById(Session session, int id) async {
    try {
      return await Calendar.db.findById(session, id);
    } catch (e) {
      throw Exception('Failed to fetch calendar event: $e');
    }
  }

  /// Create a new calendar event
  Future<Calendar> create(Session session, Calendar calendar) async {
    try {
      // Validate input
      if (calendar.title.trim().isEmpty) {
        throw Exception('Calendar event title cannot be empty');
      }

      // Create new calendar event (id should be null for new records)
      final newCalendar = calendar.copyWith(id: null);
      
      return await Calendar.db.insertRow(session, newCalendar);
    } catch (e) {
      throw Exception('Failed to create calendar event: $e');
    }
  }

  /// Update an existing calendar event
  Future<Calendar> update(Session session, Calendar calendar) async {
    try {
      // Validate input
      if (calendar.id == null) {
        throw Exception('Calendar event ID is required for update');
      }
      
      if (calendar.title.trim().isEmpty) {
        throw Exception('Calendar event title cannot be empty');
      }

      // Check if the calendar event exists
      final existing = await Calendar.db.findById(session, calendar.id!);
      if (existing == null) {
        throw Exception('Calendar event not found');
      }

      return await Calendar.db.updateRow(session, calendar);
    } catch (e) {
      throw Exception('Failed to update calendar event: $e');
    }
  }

  /// Delete a calendar event
  Future<bool> delete(Session session, int id) async {
    try {
      // Check if the calendar event exists
      final existing = await Calendar.db.findById(session, id);
      if (existing == null) {
        throw Exception('Calendar event not found');
      }

      await Calendar.db.deleteRow(session, existing);
      return true;
    } catch (e) {
      throw Exception('Failed to delete calendar event: $e');
    }
  }

  /// Delete multiple calendar events
  Future<int> deleteMultiple(Session session, List<int> ids) async {
    try {
      int deletedCount = 0;
      
      for (final id in ids) {
        final existing = await Calendar.db.findById(session, id);
        if (existing != null) {
          await Calendar.db.deleteRow(session, existing);
          deletedCount++;
        }
      }
      
      return deletedCount;
    } catch (e) {
      throw Exception('Failed to delete calendar events: $e');
    }
  }

  /// Search calendar events by title
  Future<List<Calendar>> searchByTitle(Session session, String searchTerm) async {
    try {
      if (searchTerm.trim().isEmpty) {
        return [];
      }

      return await Calendar.db.find(
        session,
        where: (t) => t.title.ilike('%${searchTerm.trim()}%'),
        orderBy: (t) => t.date,
      );
    } catch (e) {
      throw Exception('Failed to search calendar events: $e');
    }
  }

  /// Get count of calendar events
  Future<int> count(Session session) async {
    try {
      return await Calendar.db.count(session);
    } catch (e) {
      throw Exception('Failed to count calendar events: $e');
    }
  }
}