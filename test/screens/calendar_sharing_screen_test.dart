import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/result.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/logic/providers/calendar_sharing_provider.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/ui/screens/calendar_sharing_screen.dart';

import '../helpers/pump_app.dart';

class _FakeContactList extends ContactList {
  _FakeContactList(this._contacts);

  final List<Contact> _contacts;

  @override
  Future<List<Contact>> build() async => _contacts;
}

class _FakeCalendarSharingController extends CalendarSharingController {
  bool sendCalled = false;

  @override
  Future<Result<void>> sendShareInvites({
    required List<String> contactIds,
    required String permission,
    required bool canViewDetails,
    required bool canEditEvents,
    required bool shareAvailability,
    String? message,
  }) async {
    sendCalled = true;
    return const Success(null);
  }
}

Future<void> _triggerContinue(WidgetTester tester) async {
  final stepper = tester.widget<Stepper>(find.byType(Stepper));
  expect(stepper.onStepContinue, isNotNull);
  stepper.onStepContinue!.call();
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 200));
}

void main() {
  group('CalendarSharingScreen', () {
    testWidgets('requires a selection and completes invite flow',
        (tester) async {
      final contacts = [
        Contact(
          id: 'contact-alex',
          name: 'Alex Chen',
          email: 'alex@example.com',
          phoneNumber: '555-0101',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'owner-1',
        ),
        Contact(
          id: 'contact-sam',
          name: 'Sam Rivera',
          email: 'sam@example.com',
          phoneNumber: '555-0102',
          status: ContactStatus.accepted,
          permission: PartnerPermission.visible,
          ownerId: 'owner-1',
        ),
      ];

      final fakeController = _FakeCalendarSharingController();

      await tester.pumpApp(
        const CalendarSharingScreen(),
        overrides: [
          contactListProvider.overrideWith(() => _FakeContactList(contacts)),
          calendarSharingControllerProvider.overrideWith(() => fakeController),
        ],
      );

      await tester.pumpAndSettle();

      // Step 0: contacts list should be visible with the first contact pre-selected.
      expect(find.text('Alex Chen'), findsOneWidget);
      expect(
        tester.widget<Stepper>(find.byType(Stepper)).currentStep,
        0,
      );

      await _triggerContinue(tester);
      await tester.pumpAndSettle();

      expect(
        tester.widget<Stepper>(find.byType(Stepper)).currentStep,
        1,
      );

      // Advance to the review step.
      await _triggerContinue(tester);
      await tester.pumpAndSettle();

      expect(
        tester.widget<Stepper>(find.byType(Stepper)).currentStep,
        2,
      );

      // Send invites – fake controller succeeds and pops the screen.
      await _triggerContinue(tester);
      await tester.pumpAndSettle();

      expect(fakeController.sendCalled, isTrue);
      expect(find.byType(CalendarSharingScreen), findsNothing);
    });
  });
}
