import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_card.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('SemanticCard', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticCard(
          label: 'Test card',
          child: Card(
            child: Text('Card content'),
          ),
        ),
      );

      expect(find.text('Card content'), findsOneWidget);
      expect(find.byType(Card), findsOneWidget);
    });

    testWidgets('has proper semantic label', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticCard(
          label: 'Events card',
          child: Card(
            child: Text('Events'),
          ),
        ),
      );

      expect(
        tester.getSemantics(find.byType(SemanticCard)).label,
        equals('Events card'),
      );
    });

    testWidgets('includes hint in semantics', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticCard(
          label: 'Events card',
          hint: '4 events this week',
          child: Card(
            child: Text('Events'),
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticCard));
      expect(semantics.hint, equals('4 events this week'));
    });

    testWidgets('is tappable when isButton is true', (tester) async {
      var tapped = false;

      await tester.pumpMaterialApp(
        SemanticCard(
          label: 'Tappable card',
          isButton: true,
          onTap: () => tapped = true,
          child: const Card(
            child: Text('Tap me'),
          ),
        ),
      );

      await tester.tap(find.text('Tap me'));
      await tester.pump();

      expect(tapped, isTrue);
    });

    testWidgets('is not marked as button when isButton is false',
        (tester) async {
      await tester.pumpMaterialApp(
        const SemanticCard(
          label: 'Non-button card',
          isButton: false,
          child: Card(
            child: Text('Not tappable'),
          ),
        ),
      );

      expect(find.text('Not tappable'), findsOneWidget);
    });

    testWidgets('is marked as header when isHeader is true', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticCard(
          label: 'Header card',
          isHeader: true,
          child: Card(
            child: Text('Section header'),
          ),
        ),
      );

      expect(find.text('Section header'), findsOneWidget);
    });
  });

  group('SemanticListItem', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticListItem(
          label: 'List item',
          child: ListTile(
            title: Text('Item title'),
          ),
        ),
      );

      expect(find.text('Item title'), findsOneWidget);
      expect(find.byType(ListTile), findsOneWidget);
    });

    testWidgets('has proper semantic label', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticListItem(
          label: 'Sam accepted your invitation',
          child: ListTile(
            title: Text('Sam accepted'),
          ),
        ),
      );

      expect(
        tester.getSemantics(find.byType(SemanticListItem)).label,
        equals('Sam accepted your invitation'),
      );
    });

    testWidgets('includes hint for timestamp', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticListItem(
          label: 'Event notification',
          hint: '2 hours ago',
          child: ListTile(
            title: Text('Notification'),
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticListItem));
      expect(semantics.hint, equals('2 hours ago'));
    });

    testWidgets('is tappable when isButton is true', (tester) async {
      var tapped = false;

      await tester.pumpMaterialApp(
        SemanticListItem(
          label: 'Tappable item',
          isButton: true,
          onTap: () => tapped = true,
          child: const ListTile(
            title: Text('Tap me'),
          ),
        ),
      );

      await tester.tap(find.text('Tap me'));
      await tester.pump();

      expect(tapped, isTrue);
    });
  });

  group('DecorativeElement', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpMaterialApp(
        const DecorativeElement(
          child: Icon(Icons.star, color: Colors.amber),
        ),
      );

      expect(find.byIcon(Icons.star), findsOneWidget);
    });

    testWidgets('excludes semantics from child', (tester) async {
      await tester.pumpMaterialApp(
        const DecorativeElement(
          child: Text('Decorative text'),
        ),
      );

      // The text should be visible but excluded from semantics
      expect(find.text('Decorative text'), findsOneWidget);

      // Try to get semantics - should not find any for the decorative element
      final semanticsFinder = find.ancestor(
        of: find.text('Decorative text'),
        matching: find.byType(ExcludeSemantics),
      );
      expect(semanticsFinder, findsOneWidget);
    });

    testWidgets('hides decorative icons from screen readers', (tester) async {
      await tester.pumpMaterialApp(
        const Column(
          children: [
            DecorativeElement(
              child: Icon(Icons.circle, color: Colors.blue),
            ),
            Text('Visible text'),
          ],
        ),
      );

      expect(find.byIcon(Icons.circle), findsOneWidget);
      expect(find.text('Visible text'), findsOneWidget);
    });
  });
}
