// Event remote data source for Firestore

import 'package:cloud_firestore/cloud_firestore.dart';

import '../../../../core/firebase_app_services.dart';
import '../../../../domain/event.dart';

/// Abstract interface for event remote data source
abstract class EventRemoteDataSource {
  Future<List<CalendarEvent>> getEvents();
  Future<CalendarEvent> getEvent(String eventId);
  Future<CalendarEvent> createEvent(CalendarEvent event);
  Future<CalendarEvent> updateEvent(CalendarEvent event);
  Future<void> deleteEvent(String eventId);
  Future<List<CalendarEvent>> getEventsInRange({
    required DateTime start,
    required DateTime end,
  });
  Future<List<CalendarEvent>> getEventsForCalendar(String calendarId);
  Future<List<EventInvite>> getPendingInvites();
  Future<CalendarEvent> getEventForInvite(String inviteId);
  Future<void> respondToEventInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  });
}

/// Firestore implementation of event remote data source
class EventFirestoreDataSource implements EventRemoteDataSource {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _userId {
    final user = FirebaseAppServices.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }
    return user.uid;
  }

  CollectionReference get _eventsCollection =>
      _firestore.collection('users').doc(_userId).collection('events');

  @override
  Future<List<CalendarEvent>> getEvents() async {
    final snapshot = await _eventsCollection
        .orderBy('start', descending: false)
        .get();
    return snapshot.docs
        .map((doc) => CalendarEvent.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<CalendarEvent> getEvent(String eventId) async {
    final doc = await _eventsCollection.doc(eventId).get();
    if (!doc.exists) {
      throw Exception('Event not found');
    }
    return CalendarEvent.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<CalendarEvent> createEvent(CalendarEvent event) async {
    final data = event.toJson();
    final docRef = await _eventsCollection.add(data);
    final doc = await docRef.get();
    return CalendarEvent.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<CalendarEvent> updateEvent(CalendarEvent event) async {
    await _eventsCollection.doc(event.id).update(event.toJson());
    return getEvent(event.id);
  }

  @override
  Future<void> deleteEvent(String eventId) async {
    await _eventsCollection.doc(eventId).delete();
  }

  @override
  Future<List<CalendarEvent>> getEventsInRange({
    required DateTime start,
    required DateTime end,
  }) async {
    final snapshot = await _eventsCollection
        .where('start', isGreaterThanOrEqualTo: start.toIso8601String())
        .where('start', isLessThan: end.toIso8601String())
        .orderBy('start')
        .get();

    return snapshot.docs
        .map((doc) => CalendarEvent.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<List<CalendarEvent>> getEventsForCalendar(String calendarId) async {
    final snapshot = await _eventsCollection
        .where('calendar_id', isEqualTo: calendarId)
        .orderBy('start')
        .get();

    return snapshot.docs
        .map((doc) => CalendarEvent.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<List<EventInvite>> getPendingInvites() async {
    final snapshot = await _firestore
        .collection('users')
        .doc(_userId)
        .collection('event_invites')
        .where('status', isEqualTo: 'pending')
        .orderBy('created_at', descending: true)
        .get();

    return snapshot.docs
        .map((doc) => EventInvite.fromJson({
              ...doc.data(),
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<CalendarEvent> getEventForInvite(String inviteId) async {
    // Get the invite first to find the event ID
    final inviteDoc = await _firestore
        .collection('users')
        .doc(_userId)
        .collection('event_invites')
        .doc(inviteId)
        .get();

    if (!inviteDoc.exists) {
      throw Exception('Invite not found');
    }

    final inviteData = inviteDoc.data()!;
    final eventId = inviteData['event_id'] as String;

    // Get the event
    final eventDoc = await _eventsCollection.doc(eventId).get();

    if (!eventDoc.exists) {
      throw Exception('Event not found');
    }

    return CalendarEvent.fromJson({
      ...eventDoc.data() as Map<String, dynamic>,
      'id': eventDoc.id,
    });
  }

  @override
  Future<void> respondToEventInvite(
    String inviteId,
    InviteStatus response, {
    String? note,
  }) async {
    final inviteRef = _firestore
        .collection('users')
        .doc(_userId)
        .collection('event_invites')
        .doc(inviteId);

    await inviteRef.update({
      'status': response.name,
      'response_note': note,
      'responded_at': FieldValue.serverTimestamp(),
    });

    // If accepted, add event to user's calendar
    if (response == InviteStatus.accepted) {
      final event = await getEventForInvite(inviteId);
      await createEvent(event);
    }
  }
}

