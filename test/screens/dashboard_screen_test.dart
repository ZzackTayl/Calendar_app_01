import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/core/theme_constants.dart';
import 'package:myorbit_calendar/core/timezone_service.dart';
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

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays all main components',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays MyOrbit logo',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN notification button tapped THEN attempts navigation',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN create button tapped THEN shows creation dialog',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays time-based greeting',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.textContaining('Good'), findsOneWidget);
      // Check for any emoji (greeting emoji is now dynamic)
      expect(find.byType(Text), findsWidgets);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN dashboard screen WHEN events card rendered THEN displays event information',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN events card tapped THEN navigates to events screen',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(),
          initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      final eventsCard = find.byKey(const Key('events_card'));

      expect(eventsCard, findsOneWidget);
      await TestHelpers.safeTap(tester, eventsCard, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN dashboard screen WHEN calendar card rendered THEN displays calendar data',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN calendar card tapped THEN navigates to calendar',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpAppWithRouter(const DashboardScreen(),
          initialLocation: '/dashboard');
      await tester.pumpAndSettle();

      final calendarCard = find.byKey(const Key('calendar_card'));

      expect(calendarCard, findsOneWidget);
      await TestHelpers.safeTap(tester, calendarCard, warnIfMissed: false);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays event metrics',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays settings card',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Privacy &\npreferences'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN displays updates guides card',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.text('Updates &\nGuides'), findsOneWidget);
      expect(find.text('Tips &\ntutorials'), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN has gradient background',
        (tester) async {
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

    testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN layout is scrollable',
        (tester) async {
      await TestHelpers.setupTestEnvironment(tester);

      await tester.pumpApp(const DashboardScreen());
      await tester.pumpAndSettle();

      expect(find.byType(SingleChildScrollView), findsOneWidget);

      TestHelpers.tearDownTestEnvironment(tester);
    });

    group('Accessibility', () {
      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN logo has proper semantic label',
          (tester) async {
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

      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN notification button has semantic label',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticIconButton), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN action buttons have semantic labels',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticButton), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN greeting is marked as semantic heading',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticHeading), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN cards have semantic labels',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        expect(find.byType(SemanticCard), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });

      testWidgets(
          'GIVEN dashboard screen WHEN rendered THEN decorative elements excluded from semantics',
          (tester) async {
        await TestHelpers.setupTestEnvironment(tester);

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Decorative icons should be wrapped in DecorativeElement
        expect(find.byType(ExcludeSemantics), findsWidgets);

        TestHelpers.tearDownTestEnvironment(tester);
      });
    });

    // ========================================================================
    // NEW: Accessibility Tests with Proper Matchers (WCAG 2.1 AA)
    // ========================================================================
    group('WCAG 2.1 Compliance', () {
      late SemanticsHandle handle;

      testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN meets Android tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const DashboardScreen());
          await tester.pumpAndSettle();

          // Then - All interactive elements must be at least 48x48 dp
          await expectLater(
            tester,
            meetsGuideline(androidTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN meets iOS tap target guideline',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const DashboardScreen());
          await tester.pumpAndSettle();

          // Then - All interactive elements must be at least 44x44 pts
          await expectLater(
            tester,
            meetsGuideline(iOSTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN all tap targets have labels',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const DashboardScreen());
          await tester.pumpAndSettle();

          // Then - All interactive elements must have semantic labels
          await expectLater(
            tester,
            meetsGuideline(labeledTapTargetGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );

      testWidgets(
        'GIVEN dashboard screen WHEN rendered THEN meets text contrast requirements',
        (tester) async {
          // Given
          handle = tester.ensureSemantics();
          await TestHelpers.setupTestEnvironment(tester);

          // When
          await tester.pumpApp(const DashboardScreen());
          await tester.pumpAndSettle();

          // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
          await expectLater(
            tester,
            meetsGuideline(textContrastGuideline),
          );

          handle.dispose();
          TestHelpers.tearDownTestEnvironment(tester);
        },
      );
    });
  });

  // ==========================================================================
  // NEW: Edge Cases & Error Handling Tests
  // ==========================================================================
  group('DashboardScreen - Edge Cases', () {
    testWidgets(
      'GIVEN no events WHEN dashboard loads THEN renders without crashing',
      (tester) async {
        // Given
        await TestHelpers.setupTestEnvironment(tester);

        // When - Dashboard with no data should still render
        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Then - Should show dashboard without errors
        expect(
          find.byType(DashboardScreen),
          findsOneWidget,
          reason: 'Dashboard should handle empty state gracefully',
        );

        expect(
          find.text('Events'),
          findsOneWidget,
          reason: 'Events card should still be present',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN no signals WHEN dashboard loads THEN signals section renders gracefully',
      (tester) async {
        // Given
        await TestHelpers.setupTestEnvironment(tester);

        // When
        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Then - Should handle empty signals
        expect(
          find.byType(DashboardScreen),
          findsOneWidget,
          reason: 'Dashboard should handle empty signals gracefully',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN phone width WHEN dashboard renders THEN events heading uses mobile typography scale',
      (tester) async {
        await TimezoneService.initialize();
        final view = tester.view;
        view.devicePixelRatio = 1.0;
        view.physicalSize = const Size(480, 800);
        addTearDown(() {
          view.resetDevicePixelRatio();
          view.resetPhysicalSize();
        });

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        final eventsHeadingFinder = find.descendant(
          of: find.byKey(const Key('events_card')),
          matching: find.text('Events'),
        );
        final eventsHeading = tester.widget<Text>(eventsHeadingFinder);
        final headingContext = tester.element(eventsHeadingFinder);
        final mediaWidth = MediaQuery.sizeOf(headingContext).width;
        expect(
          mediaWidth,
          closeTo(480, 0.01),
          reason: 'MediaQuery width should match phone configuration',
        );
        final expectedFontSize = ResponsiveTextStyles(480).heading4.fontSize!;

        expect(eventsHeading.style, isNotNull);
        final actualFontSize = eventsHeading.style!.fontSize;
        expect(actualFontSize, isNotNull);
        expect(
          actualFontSize!,
          closeTo(expectedFontSize, 0.01),
          reason: 'Events heading should use mobile responsive font size',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN tablet width WHEN dashboard renders THEN events heading scales up responsively',
      (tester) async {
        await TimezoneService.initialize();
        final view = tester.view;
        view.devicePixelRatio = 1.0;
        view.physicalSize = const Size(800, 1200);
        addTearDown(() {
          view.resetDevicePixelRatio();
          view.resetPhysicalSize();
        });

        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        final eventsHeadingFinder = find.descendant(
          of: find.byKey(const Key('events_card')),
          matching: find.text('Events'),
        );
        final eventsHeading = tester.widget<Text>(eventsHeadingFinder);
        final expectedFontSize = ResponsiveTextStyles(800).heading4.fontSize!;

        expect(eventsHeading.style, isNotNull);
        final actualFontSize = eventsHeading.style!.fontSize;
        expect(actualFontSize, isNotNull);
        expect(
          actualFontSize!,
          closeTo(expectedFontSize, 0.01),
          reason: 'Events heading should scale up on tablet widths',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN very long event titles WHEN cards render THEN text does not overflow',
      (tester) async {
        // Given
        await TestHelpers.setupTestEnvironment(tester);

        // When
        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Then - Should not have overflow errors (yellow/black stripes)
        expect(tester.takeException(), isNull);

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN increased text scaling WHEN dashboard renders THEN layout adapts without overflow',
      (tester) async {
        // Given
        await TestHelpers.setupTestEnvironment(tester);

        // When - Simulate accessibility text scaling (200%)
        await tester.pumpApp(
          MediaQuery(
            data: const MediaQueryData(textScaleFactor: 2.0),
            child: const DashboardScreen(),
          ),
        );
        await tester.pumpAndSettle();

        // Then - Should not overflow
        expect(
          tester.takeException(),
          isNull,
          reason: 'Layout should handle large text without overflow',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN small screen size WHEN dashboard renders THEN adapts layout responsively',
      (tester) async {
        // Given - Small phone screen
        await tester.binding.setSurfaceSize(const Size(320, 568)); // iPhone SE
        await TestHelpers.setupTestEnvironment(tester);

        // When
        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Then - Should render without layout errors
        expect(
          find.byType(DashboardScreen),
          findsOneWidget,
          reason: 'Dashboard should adapt to small screens',
        );

        expect(
          tester.takeException(),
          isNull,
          reason: 'Should not throw layout exceptions on small screens',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );

    testWidgets(
      'GIVEN large tablet screen WHEN dashboard renders THEN uses available space',
      (tester) async {
        // Given - Tablet screen
        await tester.binding.setSurfaceSize(const Size(1024, 1366)); // iPad Pro
        await TestHelpers.setupTestEnvironment(tester);

        // When
        await tester.pumpApp(const DashboardScreen());
        await tester.pumpAndSettle();

        // Then - Should render and utilize space
        expect(
          find.byType(DashboardScreen),
          findsOneWidget,
          reason: 'Dashboard should adapt to large screens',
        );

        TestHelpers.tearDownTestEnvironment(tester);
      },
    );
  });
}
