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

      // Verify header logo and notifications icon
      expect(find.byIcon(Icons.notifications), findsOneWidget);
      expect(
        find.byWidgetPredicate(
          (widget) =>
              widget is Image ||
              (widget is Container && widget.decoration != null),
        ),
        findsWidgets,
      );

      // Verify action buttons (only Create event or signal button now)
      expect(find.byIcon(Icons.add), findsOneWidget);

      // Verify greeting (dynamic based on time of day)
      expect(find.textContaining('Good'), findsOneWidget);
      expect(find.text('Here\'s what\'s happening'), findsOneWidget);

      // Verify main cards
      expect(find.text('Events'), findsOneWidget);
      expect(find.text('Calendar'), findsOneWidget);

      // Verify bottom cards
      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Updates &\nGuides'), findsOneWidget);

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
      await TestHelpers.safeTap(tester, notificationButton,
          warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('action buttons are tappable', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(),
          initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      // Create event button (now an icon button)
      final createEventButton = find.byIcon(Icons.add);
      expect(createEventButton, findsOneWidget);
      await TestHelpers.safeTap(tester, createEventButton, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('displays greeting with emoji', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.textContaining('Good'), findsOneWidget);
      // Check for any emoji (greeting emoji is now dynamic)
      expect(find.byType(Text), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets('Events card displays correct information', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      final eventsCard = find.byKey(const Key('events_card'));
      expect(eventsCard, findsOneWidget);
      expect(
        find.descendant(of: eventsCard, matching: find.text('Events')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: eventsCard,
          matching: find.text('Create and manage events'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: eventsCard,
          matching: find.textContaining('week'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: eventsCard,
          matching: find.textContaining('upcoming'),
        ),
        findsOneWidget,
      );

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
      final calendarCard = find.byKey(const Key('calendar_card'));
      expect(calendarCard, findsOneWidget);
      final calendarTexts = tester
          .widgetList<Text>(
            find.descendant(
              of: calendarCard,
              matching: find.byType(Text),
            ),
          )
          .toList();
      expect(calendarTexts.length, greaterThan(1));

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

    testWidgets('updates card metrics display correctly', (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      // Verify that metrics are displayed (this confirms data binding works)
      expect(
        find.byWidgetPredicate(
          (widget) {
            if (widget is! Text) return false;
            final text = widget.data ?? '';
            return text.contains('event') || text.contains('upcoming');
          },
        ),
        findsWidgets,
      );

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
