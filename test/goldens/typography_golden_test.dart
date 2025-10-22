import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:myorbit_calendar/ui/screens/events_screen.dart';
import 'package:myorbit_calendar/ui/screens/signal_center_screen.dart';
import 'package:myorbit_calendar/domain/event.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/domain/availability_signal.dart';
import 'package:myorbit_calendar/domain/signal_share.dart';
import 'package:myorbit_calendar/domain/enums.dart';
import 'package:myorbit_calendar/logic/providers/event_providers.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/logic/providers/settings_providers.dart';
import 'package:myorbit_calendar/logic/providers/signal_providers.dart';
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

class _FakeActiveSignals extends ActiveSignals {
  _FakeActiveSignals(this._signals);

  final List<AvailabilitySignal> _signals;

  @override
  Future<List<AvailabilitySignal>> build() async => _signals;
}

class _FakeSignalsSharedWithMe extends SignalsSharedWithMe {
  _FakeSignalsSharedWithMe(this._signals);

  final List<AvailabilitySignal> _signals;

  @override
  Future<List<AvailabilitySignal>> build() async => _signals;
}

class _FakeSignalShares extends SignalShares {
  _FakeSignalShares(this._shares);

  final List<SignalShare> _shares;

  @override
  Future<List<SignalShare>> build() async => _shares;
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

  final activeSignals = [
    AvailabilitySignal(
      id: 'signal-1',
      userId: DevDataService.currentUserId,
      signalType: SignalType.available,
      startTime: DateTime(2024, 4, 12, 13, 0),
      endTime: DateTime(2024, 4, 12, 15, 0),
      duration: SignalDuration.hours2,
      message: 'Ideal window for quick syncs.',
      createdAt: DateTime(2024, 4, 11, 9, 0),
    ),
  ];

  final sharedSignals = [
    AvailabilitySignal(
      id: 'signal-2',
      userId: 'contact-alex',
      signalType: SignalType.flexible,
      startTime: DateTime(2024, 4, 12, 16, 0),
      endTime: DateTime(2024, 4, 12, 18, 0),
      duration: SignalDuration.custom,
      message: 'Ping me if you need a hand!',
      createdAt: DateTime(2024, 4, 11, 12, 0),
    ),
  ];

  final signalShares = [
    SignalShare(
      id: 'share-1',
      signalId: 'signal-2',
      sharedWithUserId: DevDataService.currentUserId,
      sharedByUserId: 'contact-alex',
      createdAt: DateTime(2024, 4, 11, 12, 5),
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

  Future<void> pumpSignalCenterScreen(
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
          contactListProvider
              .overrideWith(() => _FakeContactList(sampleContacts)),
          activeSignalsProvider
              .overrideWith(() => _FakeActiveSignals(activeSignals)),
          signalsSharedWithMeProvider.overrideWith(
            () => _FakeSignalsSharedWithMe(sharedSignals),
          ),
          signalSharesProvider
              .overrideWith(() => _FakeSignalShares(signalShares)),
        ],
        child: wrapForGolden(
          const SignalCenterScreen(),
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

  group('SignalCenterScreen goldens', () {
    testWidgets('phone layout', (tester) async {
      await pumpSignalCenterScreen(tester, phoneSize);

      await expectLater(
        find.byType(MaterialApp),
        matchesGoldenFile('goldens/signal_center_phone.png'),
      );
    });
  });
}
