import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/event_invite_card.dart';
import 'package:myorbit_calendar/logic/providers/event_invite_providers.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';

void main() {
  group('EventInviteCard Widget Tests', () {
    late EventInviteDetails testDetails;

    setUp(() {
      final event = CalendarEvent(
        id: 'event-1',
        title: 'Team Meeting',
        start: DateTime(2025, 10, 20, 14, 0),
        end: DateTime(2025, 10, 20, 15, 0),
        description: 'Quarterly planning session',
        recurrenceRule: null,
        ownerId: 'owner-1',
        invitedPartnerIds: [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final organizer = Contact(
        id: 'contact-1',
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: null,
        colorHex: '#4D8CFF',
        permission: PartnerPermission.private,
        status: ContactStatus.accepted,
        ownerId: 'owner-1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        externalUserId: 'owner-1',
      );

      testDetails = EventInviteDetails(
        inviteId: 'invite-1',
        event: event,
        organizer: organizer,
        attendees: [],
      );
    });

    testWidgets('should display event title', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      expect(find.text('Team Meeting'), findsOneWidget);
    });

    testWidgets('should display event date', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      // Looking for the formatted date (e.g., "Monday, Oct 20, 2025")
      expect(find.textContaining('Oct'), findsOneWidget);
      expect(find.textContaining('20'), findsOneWidget);
      expect(find.textContaining('2025'), findsOneWidget);
    });

    testWidgets('should display event time and duration',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      // Looking for time format (e.g., "2:00 PM - 3:00 PM (1 hour)")
      expect(find.textContaining('PM'), findsWidgets);
      expect(find.textContaining('hour'), findsOneWidget);
    });

    testWidgets('should display event description when present',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      expect(find.text('Quarterly planning session'), findsOneWidget);
    });

    testWidgets('should show recurring indicator for recurring events',
        (WidgetTester tester) async {
      final recurringEvent = CalendarEvent(
        id: 'event-1',
        title: 'Weekly Standup',
        start: DateTime(2025, 10, 20, 9, 0),
        end: DateTime(2025, 10, 20, 9, 30),
        description: null,
        recurrenceRule: null,
        ownerId: 'owner-1',
        invitedPartnerIds: [],
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final organizer = Contact(
        id: 'contact-1',
        name: 'John Doe',
        email: 'john@example.com',
        phoneNumber: null,
        colorHex: '#4D8CFF',
        permission: PartnerPermission.private,
        status: ContactStatus.accepted,
        ownerId: 'owner-1',
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
        externalUserId: 'owner-1',
      );

      final recurringDetails = EventInviteDetails(
        inviteId: 'invite-1',
        event: recurringEvent,
        organizer: organizer,
        attendees: [],
      );

      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: recurringDetails),
          ),
        ),
      );

      expect(find.text('Recurring Event'), findsOneWidget);
      expect(find.byIcon(Icons.repeat), findsOneWidget);
    });

    testWidgets('should display calendar and time icons',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      expect(find.byIcon(Icons.calendar_today), findsOneWidget);
      expect(find.byIcon(Icons.access_time), findsOneWidget);
    });

    testWidgets('should have proper styling with gradient background',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppThemes.light(),
          home: Scaffold(
            body: EventInviteCard(details: testDetails),
          ),
        ),
      );

      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(EventInviteCard),
              matching: find.byType(Container),
            )
            .first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.gradient, isNotNull);
      expect(decoration.borderRadius, isNotNull);
      expect(decoration.boxShadow, isNotNull);
    });
  });
}
