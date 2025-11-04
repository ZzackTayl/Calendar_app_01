// Calendar remote data source for Firestore

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:myorbit_calendar/core/firebase_app_services.dart';
import 'package:myorbit_calendar/features/calendar/data/models/user_calendar_model.dart';

/// Abstract interface for calendar remote data source
abstract class CalendarRemoteDataSource {
  Future<List<UserCalendarModel>> getCalendars();
  Future<UserCalendarModel> getCalendar(String calendarId);
  Future<UserCalendarModel> createCalendar(UserCalendarModel calendar);
  Future<UserCalendarModel> updateCalendar(UserCalendarModel calendar);
  Future<void> deleteCalendar(String calendarId);
  Future<Set<String>> getVisibleCalendarIds();
  Future<void> updateVisibleCalendarIds(Set<String> calendarIds);
}

/// Firestore implementation of calendar remote data source
class CalendarFirestoreDataSource implements CalendarRemoteDataSource {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  String get _userId {
    final user = FirebaseAppServices.currentUser;
    if (user == null) {
      throw Exception('User not authenticated');
    }
    return user.uid;
  }

  CollectionReference get _calendarsCollection =>
      _firestore.collection('users').doc(_userId).collection('calendars');

  DocumentReference get _visibilityDoc =>
      _firestore.collection('users').doc(_userId).collection('settings').doc('calendar_visibility');

  @override
  Future<List<UserCalendarModel>> getCalendars() async {
    final snapshot = await _calendarsCollection.get();
    return snapshot.docs
        .map((doc) => UserCalendarModel.fromJson({
              ...doc.data() as Map<String, dynamic>,
              'id': doc.id,
            }))
        .toList();
  }

  @override
  Future<UserCalendarModel> getCalendar(String calendarId) async {
    final doc = await _calendarsCollection.doc(calendarId).get();
    if (!doc.exists) {
      throw Exception('Calendar not found');
    }
    return UserCalendarModel.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<UserCalendarModel> createCalendar(UserCalendarModel calendar) async {
    final docRef = await _calendarsCollection.add(calendar.toJson());
    final doc = await docRef.get();
    return UserCalendarModel.fromJson({
      ...doc.data() as Map<String, dynamic>,
      'id': doc.id,
    });
  }

  @override
  Future<UserCalendarModel> updateCalendar(UserCalendarModel calendar) async {
    await _calendarsCollection.doc(calendar.id).update(calendar.toJson());
    return getCalendar(calendar.id);
  }

  @override
  Future<void> deleteCalendar(String calendarId) async {
    await _calendarsCollection.doc(calendarId).delete();
  }

  @override
  Future<Set<String>> getVisibleCalendarIds() async {
    final doc = await _visibilityDoc.get();
    if (!doc.exists) {
      return {'primary'}; // Default to primary calendar
    }
    final data = doc.data() as Map<String, dynamic>?;
    final List<dynamic> ids = data?['visible_calendar_ids'] ?? ['primary'];
    return ids.cast<String>().toSet();
  }

  @override
  Future<void> updateVisibleCalendarIds(Set<String> calendarIds) async {
    await _visibilityDoc.set({
      'visible_calendar_ids': calendarIds.toList(),
      'updated_at': FieldValue.serverTimestamp(),
    }, SetOptions(merge: true));
  }
}
