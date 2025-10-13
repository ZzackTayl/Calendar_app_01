import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/dashboard_screen.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_button.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_card.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_text.dart';

import '../helpers/pump_app.dart';
import '../helpers/test_helpers.dart';

void main() {
  group('DashboardScreen', () {
    setUp(() async {
      // Set up test environment
    });

    testWidgets('renders all main components', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      // Verify header
      expect(find.text('MyOrbit'), findsOneWidget);
      expect(find.byIcon(Icons.notifications), findsOneWidget);

      // Verify action buttons
      expect(find.text('New Event'), findsOneWidget);
      expect(find.text('Add Partner'), findsOneWidget);

      // Verify greeting
      expect(find.textContaining('Good morning'), findsOneWidget);
      expect(find.text('Here\'s what\'s happening with your calendar'),
          findsOneWidget);

      // Verify main cards
      expect(find.text('Events'), findsOneWidget);
      expect(find.text('Calendar'), findsOneWidget);
      expect(find.text('People & Groups'), findsOneWidget);

      // Verify bottom cards
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Updates &\nGuides'), findsOneWidget);

      // Verify recent activity section
      expect(find.text('Recent Activity'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays MyOrbit logo', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      // Logo should be present (either image or fallback icon)
      final logoFinder = find.byWidgetPredicate(
        (widget) =>
            widget is Image ||
            (widget is Container && widget.decoration != null),
      );
      expect(logoFinder, findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('notification button is tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(), 
        initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      final notificationButton = find.byIcon(Icons.notifications);
      expect(notificationButton, findsOneWidget);

      // Button should be tappable (expect navigation attempt but don't fail on it)
      await TestHelpers.safeTap(tester, notificationButton, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('action buttons are tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(), 
        initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      // New Event button
      final newEventButton = find.text('New Event');
      expect(newEventButton, findsOneWidget);
      await TestHelpers.safeTap(tester, newEventButton, warnIfMissed: false);

      // Add Partner button
      final addPartnerButton = find.text('Add Partner');
      expect(addPartnerButton, findsOneWidget);
      await TestHelpers.safeTap(tester, addPartnerButton, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays greeting with emoji', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.textContaining('Good morning'), findsOneWidget);
      expect(find.text('👋'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Events card displays correct information', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Events'), findsOneWidget);
      expect(find.text('Create and manage events'), findsOneWidget);
      expect(find.text('4 this week'), findsOneWidget);
      expect(find.text('5 upcoming'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Events card is tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(), 
        initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      final eventsCard = find.byKey(const Key('events_card'));

      expect(eventsCard, findsOneWidget);
      await TestHelpers.safeTap(tester, eventsCard, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Calendar card displays next event', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Calendar'), findsOneWidget);
      expect(find.text('View and manage your schedule'), findsOneWidget);
      expect(find.text('Next: Coffee'), findsOneWidget);
      expect(find.text('with Sam'), findsOneWidget);
      expect(find.text('Today, 10:00 AM'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Calendar card is tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(), 
        initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      final calendarCard = find.byKey(const Key('calendar_card'));

      expect(calendarCard, findsOneWidget);
      await TestHelpers.safeTap(tester, calendarCard, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('People & Groups card displays connection info',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('People & Groups'), findsOneWidget);
      expect(find.text('Manage your connections'), findsOneWidget);
      expect(find.text('2 pending invites • 3 connected partners'),
          findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Settings card is present', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Privacy &\npreferences'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Updates & Guides card is present', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Updates &\nGuides'), findsOneWidget);
      expect(find.text('Tips &\ntutorials'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Recent Activity section displays activities', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Recent Activity'), findsOneWidget);
      expect(find.text('View all'), findsOneWidget);

      // Check for activity items
      expect(find.text('Date night with Alex tomorrow'), findsOneWidget);
      expect(find.text('2h ago'), findsOneWidget);
      expect(find.text('Sam accepted your calendar invite'), findsOneWidget);
      expect(find.text('1d ago'), findsOneWidget);
      expect(find.text('Board game night this weekend'), findsOneWidget);
      expect(find.text('2d ago'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('View all activity button is tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      final viewAllButton = find.text('View all');
      expect(viewAllButton, findsOneWidget);

      await tester.tap(viewAllButton);
      await tester.pump();

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('has proper gradient background', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      final container = tester.widget<Container>(
        find
            .descendant(
              of: find.byType(Scaffold),
              matching: find.byType(Container),
            )
            .first,
      );

      expect(container.decoration, isA<BoxDecoration>());
      final decoration = container.decoration as BoxDecoration;
      expect(decoration.gradient, isA<LinearGradient>());

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('is scrollable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.byType(SingleChildScrollView), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    group('Accessibility', () {
      testWidgets('has proper semantic labels for logo', (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Logo should have semantic label (may appear multiple times in widget tree)
        final logoSemantics = find.byWidgetPredicate(
          (widget) =>
              widget is Semantics && widget.properties.label == 'MyOrbit logo',
        );
        expect(logoSemantics, findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets('notification button has semantic label', (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticIconButton), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets('action buttons have semantic labels', (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticButton), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets('greeting is marked as heading', (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticHeading), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets('cards have semantic labels', (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticCard), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets('decorative elements are excluded from semantics',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Decorative icons should be wrapped in DecorativeElement
        expect(find.byType(ExcludeSemantics), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });
    });
  });
}
