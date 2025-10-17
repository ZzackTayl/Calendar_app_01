import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/attendee_list.dart';
import 'package:myorbit_calendar/domain/contact.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';

void main() {
  group('AttendeeList Widget Tests', () {
    late List<Contact> testContacts;

    setUp(() {
      testContacts = [
        Contact(
          id: 'contact-1',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          phoneNumber: null,
          colorHex: '#4D8CFF',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-1',
        ),
        Contact(
          id: 'contact-2',
          name: 'Bob Smith',
          email: 'bob@example.com',
          phoneNumber: null,
          colorHex: '#FF6B6B',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-2',
        ),
        Contact(
          id: 'contact-3',
          name: 'Charlie Brown',
          email: 'charlie@example.com',
          phoneNumber: null,
          colorHex: '#51CF66',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-3',
        ),
      ];
    });

    testWidgets('should display all attendees when count is below maxVisible',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: testContacts,
              maxVisible: 5,
            ),
          ),
        ),
      );

      expect(find.text('Alice Johnson'), findsOneWidget);
      expect(find.text('Bob Smith'), findsOneWidget);
      expect(find.text('Charlie Brown'), findsOneWidget);
    });

    testWidgets(
        'should show "+X more" indicator when attendees exceed maxVisible',
        (WidgetTester tester) async {
      final manyContacts = [
        ...testContacts,
        Contact(
          id: 'contact-4',
          name: 'David Lee',
          email: 'david@example.com',
          phoneNumber: null,
          colorHex: '#FFD93D',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-4',
        ),
        Contact(
          id: 'contact-5',
          name: 'Eva Martinez',
          email: 'eva@example.com',
          phoneNumber: null,
          colorHex: '#9D84B7',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-5',
        ),
        Contact(
          id: 'contact-6',
          name: 'Frank Wilson',
          email: 'frank@example.com',
          phoneNumber: null,
          colorHex: '#FF8066',
          permission: PartnerPermission.private,
          status: ContactStatus.accepted,
          ownerId: 'owner-1',
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
          externalUserId: 'user-6',
        ),
      ];

      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: manyContacts,
              maxVisible: 3,
            ),
          ),
        ),
      );

      // Should show first 3 attendees
      expect(find.text('Alice Johnson'), findsOneWidget);
      expect(find.text('Bob Smith'), findsOneWidget);
      expect(find.text('Charlie Brown'), findsOneWidget);

      // Should show "+3 more" indicator
      expect(find.text('+3 more'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);

      // Should not show remaining attendees
      expect(find.text('David Lee'), findsNothing);
      expect(find.text('Eva Martinez'), findsNothing);
      expect(find.text('Frank Wilson'), findsNothing);
    });

    testWidgets('should display attendee chips with proper styling',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: testContacts,
              maxVisible: 5,
            ),
          ),
        ),
      );

      // Find all chips
      final chips = find.byType(Chip);
      expect(chips, findsNWidgets(3)); // 3 attendees = 3 chips

      // Verify chips have avatars
      final firstChip = tester.widget<Chip>(chips.first);
      expect(firstChip.avatar, isNotNull);
    });

    testWidgets('should render correctly with empty attendee list',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: [],
              maxVisible: 5,
            ),
          ),
        ),
      );

      // Should render without error
      expect(find.byType(AttendeeList), findsOneWidget);
      expect(find.byType(Chip), findsNothing);
    });

    testWidgets('should use Wrap widget for responsive layout',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: testContacts,
              maxVisible: 5,
            ),
          ),
        ),
      );

      expect(find.byType(Wrap), findsOneWidget);

      final wrap = tester.widget<Wrap>(find.byType(Wrap));
      expect(wrap.spacing, equals(8.0));
      expect(wrap.runSpacing, equals(12.0));
    });

    testWidgets('should handle single attendee correctly',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(extensions: [AppPalette.light]),
          home: Scaffold(
            body: AttendeeList(
              attendees: [testContacts.first],
              maxVisible: 5,
            ),
          ),
        ),
      );

      expect(find.text('Alice Johnson'), findsOneWidget);
      expect(find.byType(Chip), findsOneWidget);
      expect(find.textContaining('+'), findsNothing);
    });
  });
}
