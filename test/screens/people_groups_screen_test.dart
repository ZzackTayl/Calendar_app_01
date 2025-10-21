import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/logic/providers/event_providers.dart';
import 'package:myorbit_calendar/ui/screens/people_groups_screen.dart';

import '../helpers/pump_app.dart';

class _MockContactList extends ContactList {
  _MockContactList(this._contacts);

  final List<Contact> _contacts;

  @override
  Future<List<Contact>> build() async => _contacts;
}

class _MockEventList extends EventList {
  _MockEventList(this._events);

  final List<CalendarEvent> _events;

  @override
  Future<List<CalendarEvent>> build() async => _events;
}

Contact _buildContact({
  required String id,
  required String name,
  required ContactStatus status,
  PartnerPermission permission = PartnerPermission.visible,
  String? externalUserId,
}) {
  final now = DateTime(2025, 1, 1);
  return Contact(
    id: id,
    name: name,
    email: '$id@example.com',
    phoneNumber: '+1-555-0100',
    status: status,
    permission: permission,
    externalUserId: externalUserId,
    labels: const ['team'],
    ownerId: 'current-user',
    createdAt: now,
    updatedAt: now,
  );
}

CalendarEvent _buildEvent(String id) {
  final start = DateTime(2025, 1, 2, 10);
  return CalendarEvent(
    id: id,
    title: 'Planning Session',
    description: 'Strategy sync with partners',
    start: start,
    end: start.add(const Duration(hours: 1)),
    ownerId: 'current-user',
    invitedPartnerIds: const ['partner-alex'],
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('PeopleGroupsScreen', () {
    testWidgets('renders connected partners by default', (tester) async {
      final contacts = [
        _buildContact(
          id: 'contact-alex',
          name: 'Alex Chen',
          status: ContactStatus.accepted,
          externalUserId: 'partner-alex',
        ),
        _buildContact(
          id: 'contact-sam',
          name: 'Sam Rivera',
          status: ContactStatus.accepted,
          externalUserId: 'partner-sam',
        ),
      ];

      await tester.pumpApp(
        const PeopleGroupsScreen(),
        overrides: [
          contactListProvider.overrideWith(
            () => _MockContactList(contacts),
          ),
          connectedPartnersProvider.overrideWithValue(contacts),
          pendingInvitesProvider.overrideWithValue(const []),
          contactOnlyContactsProvider.overrideWithValue(const []),
          eventListProvider.overrideWith(
            () => _MockEventList([_buildEvent('event-1')]),
          ),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Connected (2)'), findsOneWidget);
      expect(find.text('My Orbit'), findsOneWidget);
      expect(find.textContaining('Connected'), findsWidgets);
      expect(find.text('Connected Contacts'), findsOneWidget);
      expect(find.text('Alex Chen'), findsOneWidget);
      await tester.drag(find.byType(ListView), const Offset(0, -300));
      await tester.pumpAndSettle();
      expect(find.text('Sam Rivera'), findsOneWidget);
    });

    testWidgets('switching to Pending tab shows pending copy', (tester) async {
      final contacts = [
        _buildContact(
          id: 'contact-pending',
          name: 'Jordan Kim',
          status: ContactStatus.pending,
        ),
      ];

      await tester.pumpApp(
        const PeopleGroupsScreen(),
        overrides: [
          contactListProvider.overrideWith(
            () => _MockContactList(contacts),
          ),
          connectedPartnersProvider.overrideWithValue(const []),
          pendingInvitesProvider.overrideWithValue(contacts),
          contactOnlyContactsProvider.overrideWithValue(const []),
          eventListProvider.overrideWith(
            () => _MockEventList([]),
          ),
        ],
      );

      await tester.pumpAndSettle();

      await tester.tap(find.textContaining('Pending'));
      await tester.pumpAndSettle();

      expect(find.text('Pending Invites'), findsOneWidget);
      expect(find.text('Jordan Kim'), findsOneWidget);
    });
  });
}
