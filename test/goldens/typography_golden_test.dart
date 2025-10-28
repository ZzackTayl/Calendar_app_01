import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:myorbit_calendar/ui/screens/events_screen.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/logic/providers/event_providers.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/logic/services/dev_data_service.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';

import '../helpers/golden_test_helper.dart';

class _FakeEventList extends EventList {
  _FakeEventList(this._events);

  final List<CalendarEvent> _events;

  @override
  Future<List<CalendarEvent>> build() async => _events;
}

class _FakeContactList extends ContactList {
  _FakeContactList(this._contacts);

  final List<Contact> _contacts;

  @override
  Future<List<Contact>> build() async => _contacts;
}

class _FakeSettingsController extends SettingsController {
  _FakeSettingsController(this._state);

  final SettingsState _state;

  @override
  Future<SettingsState> build() async => _state;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const phoneSize = Size(390, 844);
  const tabletSize = Size(1024, 768);

  final settingsState = const SettingsState(timeZone: 'Pacific Time (PST/PDT)');

  final sampleContacts = [
    Contact(
      id: 'contact-alex',
      name: 'Alex Chen',
      email: 'alex@example.com',
      status: ContactStatus.accepted,
      permission: PartnerPermission.visible,
      colorHex: '#5A67D8',
      ownerId: DevDataService.currentUserId,
    ),
    Contact(
      id: 'contact-sam',
      name: 'Sam Rivera',
      email: 'sam@example.com',
      status: ContactStatus.accepted,
      permission: PartnerPermission.visible,
      colorHex: '#38A169',
      ownerId: DevDataService.currentUserId,
    ),
    Contact(
      id: 'contact-jordan',
      name: 'Jordan Kim',
      email: 'jordan@example.com',
      status: ContactStatus.pending,
      permission: PartnerPermission.semiVisible,
      colorHex: '#D97706',
      ownerId: DevDataService.currentUserId,
    ),
  ];

  final sampleEvents = [
    CalendarEvent(
      id: 'event-1',
      title: 'Product Sync',
      description: 'Review roadmap updates and identify blockers.',
      start: DateTime(2024, 4, 12, 10, 0),
      end: DateTime(2024, 4, 12, 11, 30),
      invitedPartnerIds: const ['contact-alex', 'contact-sam'],
      ownerId: DevDataService.currentUserId,
      createdAt: DateTime(2024, 4, 1, 9, 0),
      privacyLevel: EventPrivacyLevel.normal,
    ),
    CalendarEvent(
      id: 'event-2',
      title: 'Design Review',
      description: 'Feedback session on the upcoming onboarding revamp.',
      start: DateTime(2024, 4, 13, 14, 0),
      end: DateTime(2024, 4, 13, 15, 0),
      invitedPartnerIds: const ['contact-alex'],
      ownerId: DevDataService.currentUserId,
      createdAt: DateTime(2024, 4, 2, 10, 0),
      privacyLevel: EventPrivacyLevel.exclusive,
    ),
    CalendarEvent(
      id: 'event-3',
      title: 'Coffee with Jordan',
      description: 'Catch up and discuss partnership ideas.',
      start: DateTime(2024, 4, 14, 9, 30),
      end: DateTime(2024, 4, 14, 10, 30),
      invitedPartnerIds: const ['contact-jordan'],
      ownerId: DevDataService.currentUserId,
      createdAt: DateTime(2024, 4, 3, 8, 0),
      privacyLevel: EventPrivacyLevel.superExclusive,
    ),
  ];

  Future<void> pumpEventsScreen(
    WidgetTester tester,
    Size size,
  ) async {
    await loadAppFontsForGoldens();
    await TimezoneService.initialize();
    await tester.binding.setSurfaceSize(size);
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          eventListProvider.overrideWith(() => _FakeEventList(sampleEvents)),
          contactListProvider
              .overrideWith(() => _FakeContactList(sampleContacts)),
          settingsControllerProvider.overrideWith(
            () => _FakeSettingsController(settingsState),
          ),
        ],
        child: wrapForGolden(
          const EventsScreen(),
          surfaceSize: size,
        ),
      ),
    );

    await tester.pumpAndSettle();
  }

  group('EventsScreen goldens', () {
    testWidgets('phone layout', (tester) async {
      await pumpEventsScreen(tester, phoneSize);

      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/events_screen_phone.png'),
      );
    });

    testWidgets('tablet layout', (tester) async {
      await pumpEventsScreen(tester, tabletSize);

      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/events_screen_tablet.png'),
      );
    });
  });

}
