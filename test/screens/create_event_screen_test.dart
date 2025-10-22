import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/ui/screens/create_event_screen.dart';

import '../helpers/pump_app.dart';

Contact _buildPartner(String id, String name) {
  final now = DateTime(2025, 1, 1);
  return Contact(
    id: id,
    name: name,
    email: '$id@example.com',
    phoneNumber: '+1-555-1234',
    status: ContactStatus.accepted,
    permission: PartnerPermission.visible,
    externalUserId: 'ext-$id',
    labels: const ['friends'],
    ownerId: 'current-user',
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CreateEventScreen', () {
    testWidgets('GIVEN new event screen WHEN rendered THEN displays empty form with partner list', (tester) async {
      final partners = [
        _buildPartner('contact-alex', 'Alex Chen'),
        _buildPartner('contact-sam', 'Sam Rivera'),
      ];

      await tester.pumpApp(
        const CreateEventScreen(),
        overrides: [
          connectedPartnersProvider.overrideWithValue(partners),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('New Event'), findsOneWidget);
      expect(find.text('Event Title'), findsOneWidget);
      expect(find.text('Description (Optional)'), findsOneWidget);

      // Scroll to invitees section
      await tester.drag(
          find.byType(SingleChildScrollView), const Offset(0, -400));
      await tester.pumpAndSettle();

      expect(find.text('Alex Chen'), findsWidgets);
      expect(find.text('Sam Rivera'), findsWidgets);
    });

    testWidgets('GIVEN event to edit WHEN screen loads THEN pre-populates form fields', (tester) async {
      final partners = [_buildPartner('contact-jordan', 'Jordan Lee')];

      final event = CalendarEvent(
        id: 'event-1',
        title: 'Coffee Chat',
        description: 'Catch-up with Jordan',
        start: DateTime(2025, 1, 2, 10),
        end: DateTime(2025, 1, 2, 11),
        ownerId: 'current-user',
        invitedPartnerIds: const ['ext-contact-jordan'],
      );

      await tester.pumpApp(
        CreateEventScreen(eventToEdit: event),
        overrides: [
          connectedPartnersProvider.overrideWithValue(partners),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Edit Event'), findsOneWidget);
      expect(find.text('Coffee Chat'), findsOneWidget);
      expect(find.text('Catch-up with Jordan'), findsOneWidget);
    });

    // WCAG 2.1 Compliance
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN create event screen WHEN rendered THEN meets tap target guidelines',
        (tester) async {
          handle = tester.ensureSemantics();
          
          await tester.pumpApp(
            const CreateEventScreen(),
            overrides: [
              connectedPartnersProvider.overrideWithValue([]),
            ],
          );
          await tester.pumpAndSettle();

          await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
          handle.dispose();
        },
      );

      testWidgets(
        'GIVEN create event screen WHEN rendered THEN all form fields have labels',
        (tester) async {
          handle = tester.ensureSemantics();
          
          await tester.pumpApp(
            const CreateEventScreen(),
            overrides: [
              connectedPartnersProvider.overrideWithValue([]),
            ],
          );
          await tester.pumpAndSettle();

          await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
          handle.dispose();
        },
      );
    });

    // Edge Cases
    group('Edge Cases', () {
      testWidgets(
        'GIVEN increased text scaling WHEN form rendered THEN adapts without overflow',
        (tester) async {
          await tester.pumpApp(
            MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(2.0)),
              child: const CreateEventScreen(),
            ),
            overrides: [
              connectedPartnersProvider.overrideWithValue([]),
            ],
          );
          await tester.pumpAndSettle();

          expect(
            tester.takeException(),
            isNull,
            reason: 'Form should handle large text without overflow',
          );
        },
      );
    });
  });
}
