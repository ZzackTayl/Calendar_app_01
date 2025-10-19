import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/error/empty_state.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('EmptyState', () {
    testWidgets('renders with required message', (tester) async {
      await tester.pumpMaterialApp(
        const EmptyState(message: 'No data available'),
      );

      expect(find.text('No data available'), findsOneWidget);
      expect(find.byIcon(Icons.inbox_outlined), findsOneWidget);
    });

    testWidgets('renders with custom title', (tester) async {
      await tester.pumpMaterialApp(
        const EmptyState(
          title: 'Empty List',
          message: 'Add items to get started',
        ),
      );

      expect(find.text('Empty List'), findsOneWidget);
      expect(find.text('Add items to get started'), findsOneWidget);
    });

    testWidgets('renders with custom icon', (tester) async {
      await tester.pumpMaterialApp(
        const EmptyState(
          message: 'No items',
          icon: Icons.folder_open,
        ),
      );

      expect(find.byIcon(Icons.folder_open), findsOneWidget);
      expect(find.byIcon(Icons.inbox_outlined), findsNothing);
    });

    testWidgets('renders with action button', (tester) async {
      var actionPressed = false;

      await tester.pumpMaterialApp(
        EmptyState(
          message: 'No items',
          action: ElevatedButton(
            onPressed: () => actionPressed = true,
            child: const Text('Add Item'),
          ),
        ),
      );

      expect(find.text('Add Item'), findsOneWidget);

      await tester.tap(find.text('Add Item'));
      await tester.pump();

      expect(actionPressed, isTrue);
    });

    testWidgets('centers content', (tester) async {
      await tester.pumpMaterialApp(
        const EmptyState(message: 'Centered content'),
      );

      // May find multiple Center widgets due to widget tree structure
      expect(find.byType(Center), findsWidgets);
    });
  });

  group('EmptyState.noEvents', () {
    testWidgets('renders no events state', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noEvents(),
      );

      expect(find.text('No events yet'), findsOneWidget);
      expect(
          find.text(
              'Your calendar is empty. Start by adding your first event.'),
          findsOneWidget);
      expect(find.byIcon(Icons.event_outlined), findsOneWidget);
    });

    testWidgets('shows add event button when callback provided',
        (tester) async {
      var addEventPressed = false;

      await tester.pumpMaterialApp(
        EmptyState.noEvents(
          onAddEvent: () => addEventPressed = true,
        ),
      );

      expect(find.text('Add Event'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);

      await tester.tap(find.text('Add Event'));
      await tester.pump();

      expect(addEventPressed, isTrue);
    });

    testWidgets('hides add event button when callback is null', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noEvents(),
      );

      expect(find.text('Add Event'), findsNothing);
    });
  });

  group('EmptyState.noContacts', () {
    testWidgets('renders no contacts state', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noContacts(),
      );

      expect(find.text('No contacts yet'), findsOneWidget);
      expect(find.text('Add contacts to share your availability with them.'),
          findsOneWidget);
      expect(find.byIcon(Icons.people_outline), findsOneWidget);
    });

    testWidgets('shows add contact button when callback provided',
        (tester) async {
      var addContactPressed = false;

      await tester.pumpMaterialApp(
        EmptyState.noContacts(
          onAddContact: () => addContactPressed = true,
        ),
      );

      expect(find.text('Add Contact'), findsOneWidget);
      expect(find.byIcon(Icons.add), findsOneWidget);

      await tester.tap(find.text('Add Contact'));
      await tester.pump();

      expect(addContactPressed, isTrue);
    });
  });

  group('EmptyState.noNotifications', () {
    testWidgets('renders no notifications state', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noNotifications(),
      );

      expect(find.text('No notifications'), findsOneWidget);
      expect(find.text('You\'re all caught up! Check back later for updates.'),
          findsOneWidget);
      expect(find.byIcon(Icons.notifications_none), findsOneWidget);
    });

    testWidgets('does not show action button', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noNotifications(),
      );

      expect(find.byType(FilledButton), findsNothing);
    });
  });

  group('EmptyState.noSearchResults', () {
    testWidgets('renders no search results state', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noSearchResults('test query'),
      );

      expect(find.text('No results found'), findsOneWidget);
      expect(find.text('We couldn\'t find anything matching "test query"'),
          findsOneWidget);
      expect(find.byIcon(Icons.search_off), findsOneWidget);
    });

    testWidgets('includes query in message', (tester) async {
      await tester.pumpMaterialApp(
        EmptyState.noSearchResults('calendar events'),
      );

      expect(find.textContaining('calendar events'), findsOneWidget);
    });
  });

  group('LoadingState', () {
    testWidgets('renders loading indicator', (tester) async {
      await tester.pumpMaterialApp(
        const LoadingState(),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('renders with message', (tester) async {
      await tester.pumpMaterialApp(
        const LoadingState(message: 'Loading events...'),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading events...'), findsOneWidget);
    });

    testWidgets('centers content', (tester) async {
      await tester.pumpMaterialApp(
        const LoadingState(),
      );

      // May find multiple Center widgets due to widget tree structure
      expect(find.byType(Center), findsWidgets);
    });
  });

  group('ErrorState', () {
    testWidgets('renders with required message', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorState(message: 'Failed to load data'),
      );

      expect(find.text('Failed to load data'), findsOneWidget);
      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.byIcon(Icons.error_outline), findsOneWidget);
    });

    testWidgets('renders with custom title', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorState(
          message: 'Network error',
          title: 'Connection Failed',
        ),
      );

      expect(find.text('Connection Failed'), findsOneWidget);
      expect(find.text('Network error'), findsOneWidget);
    });

    testWidgets('shows retry button when onRetry is provided', (tester) async {
      var retryPressed = false;

      await tester.pumpMaterialApp(
        ErrorState(
          message: 'Failed to load',
          onRetry: () => retryPressed = true,
        ),
      );

      expect(find.byKey(const Key('error_state_retry_button')), findsOneWidget);
      expect(find.text('Try Again'), findsOneWidget);
      expect(find.byIcon(Icons.refresh), findsOneWidget);

      await tester.tap(find.byKey(const Key('error_state_retry_button')));
      await tester.pump();

      expect(retryPressed, isTrue);
    });

    testWidgets('hides retry button when onRetry is null', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorState(message: 'Error without retry'),
      );

      expect(find.text('Try Again'), findsNothing);
    });

    testWidgets('centers content', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorState(message: 'Centered error'),
      );

      // May find multiple Center widgets due to widget tree structure
      expect(find.byType(Center), findsWidgets);
    });

    testWidgets('uses error color for icon', (tester) async {
      await tester.pumpMaterialApp(
        const ErrorState(message: 'Test error'),
      );

      final iconFinder = find.byIcon(Icons.error_outline);
      final Icon icon = tester.widget(iconFinder);

      expect(icon.color, isNotNull);
      expect(icon.size, equals(64));
    });
  });
}
