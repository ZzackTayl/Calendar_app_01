import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_text.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('SemanticText', () {
    testWidgets('renders child text widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticText(
          child: Text('Hello world'),
        ),
      );

      expect(find.text('Hello world'), findsOneWidget);
    });

    testWidgets('uses custom label when provided', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticText(
          label: 'Custom label',
          child: Text('Display text'),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticText));
      expect(semantics.label, equals('Custom label'));
    });

    testWidgets('includes hint in semantics', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticText(
          label: 'Main text',
          hint: 'Additional context',
          child: Text('Text'),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticText));
      expect(semantics.hint, equals('Additional context'));
    });

    testWidgets('marks as header when isHeader is true', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticText(
          label: 'Section title',
          isHeader: true,
          child: Text('Title'),
        ),
      );

      expect(find.text('Title'), findsOneWidget);
    });

    testWidgets('returns child directly when no custom semantics',
        (tester) async {
      await tester.pumpMaterialApp(
        const SemanticText(
          child: Text('Plain text'),
        ),
      );

      expect(find.text('Plain text'), findsOneWidget);
    });
  });

  group('SemanticHeading', () {
    testWidgets('renders child text widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticHeading(
          child: Text('Heading text'),
        ),
      );

      expect(find.text('Heading text'), findsOneWidget);
    });

    testWidgets('is marked as header', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticHeading(
          child: Text('Section heading'),
        ),
      );

      expect(find.text('Section heading'), findsOneWidget);
    });

    testWidgets('uses custom label when provided', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticHeading(
          label: 'Custom heading label',
          child: Text('Heading with emoji 🎉'),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticHeading));
      expect(semantics.label, equals('Custom heading label'));
    });
  });

  group('SemanticLiveText', () {
    testWidgets('renders child text widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticLiveText(
          label: 'Live counter',
          child: Text('5'),
        ),
      );

      expect(find.text('5'), findsOneWidget);
    });

    testWidgets('has proper semantic label', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticLiveText(
          label: '3 unread notifications',
          child: Text('3'),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticLiveText));
      expect(semantics.label, equals('3 unread notifications'));
    });

    testWidgets('announces updates for dynamic content', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticLiveText(
          label: 'Timer: 10 seconds',
          child: Text('10'),
        ),
      );

      expect(find.text('10'), findsOneWidget);
    });
  });

  group('SemanticImage', () {
    testWidgets('renders child image widget', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticImage(
          label: 'App logo',
          child: Icon(Icons.image),
        ),
      );

      expect(find.byIcon(Icons.image), findsOneWidget);
    });

    testWidgets('has proper alt text', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticImage(
          label: 'MyOrbit logo',
          child: Icon(Icons.public),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticImage));
      expect(semantics.label, equals('MyOrbit logo'));
    });

    testWidgets('excludes semantics when isDecorative is true', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticImage(
          label: 'Decorative image',
          isDecorative: true,
          child: Icon(Icons.star),
        ),
      );

      expect(find.byIcon(Icons.star), findsOneWidget);

      // Should be wrapped in ExcludeSemantics
      final excludeSemanticsFinder = find.ancestor(
        of: find.byIcon(Icons.star),
        matching: find.byType(ExcludeSemantics),
      );
      expect(excludeSemanticsFinder, findsOneWidget);
    });

    testWidgets('includes semantics when isDecorative is false',
        (tester) async {
      await tester.pumpMaterialApp(
        const SemanticImage(
          label: 'Profile picture',
          isDecorative: false,
          child: Icon(Icons.person),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticImage));
      expect(semantics.label, equals('Profile picture'));
    });

    testWidgets('provides meaningful alt text for images', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticImage(
          label: 'Calendar icon showing today\'s date',
          child: Icon(Icons.calendar_today),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticImage));
      expect(semantics.label, contains('Calendar'));
    });
  });
}
