import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/logic/providers/contact_providers.dart';
import 'package:myorbit_calendar/ui/screens/signal_availability_flow.dart';

import '../helpers/pump_app.dart';

Contact _buildContact({
  required String id,
  required String name,
  required String externalUserId,
}) {
  final now = DateTime.now();
  return Contact(
    id: id,
    name: name,
    email: '$name@example.com',
    phoneNumber: '+1-555-0100',
    status: ContactStatus.accepted,
    permission: PartnerPermission.visible,
    externalUserId: externalUserId,
    labels: const ['test'],
    ownerId: 'current-user',
    createdAt: now.subtract(const Duration(days: 30)),
    updatedAt: now.subtract(const Duration(days: 1)),
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('SignalAvailabilityFlowScreen', () {
    testWidgets('shows empty state when no partners connected', (tester) async {
      await tester.pumpApp(
        SignalAvailabilityFlowScreen(
          initialDate: DateTime(2025, 1, 1),
        ),
        overrides: [
          connectedPartnersProvider.overrideWithValue(const []),
        ],
      );

      await tester.pumpAndSettle();

      expect(
        find.textContaining('No connected partners yet'),
        findsOneWidget,
      );
    });

    testWidgets('allows selecting connected partners across steps', (tester) async {
      final contacts = [
        _buildContact(id: 'contact-1', name: 'Alex Chen', externalUserId: 'alex'),
        _buildContact(id: 'contact-2', name: 'Sam Rivera', externalUserId: 'sam'),
      ];

      await tester.pumpApp(
        SignalAvailabilityFlowScreen(
          initialDate: DateTime(2025, 1, 1),
        ),
        overrides: [
          connectedPartnersProvider.overrideWithValue(contacts),
        ],
      );

      await tester.pumpAndSettle();

      expect(find.text('Select partners'), findsOneWidget);
      expect(find.text('Alex Chen'), findsOneWidget);
      expect(find.text('Sam Rivera'), findsOneWidget);

      await tester.tap(find.text('Alex Chen'));
      await tester.pump();

      await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
      await tester.pumpAndSettle();

      expect(find.text('Preferences'), findsOneWidget);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Next'));
      await tester.pumpAndSettle();

      expect(find.text('Schedule'), findsOneWidget);
      expect(find.byType(Switch), findsWidgets);
    });
  });
}
