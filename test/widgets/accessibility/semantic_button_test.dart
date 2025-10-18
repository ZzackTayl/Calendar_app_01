import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/widgets/accessibility/semantic_button.dart';

import '../../helpers/pump_app.dart';

void main() {
  group('SemanticButton', () {
    testWidgets('renders child widget', (tester) async {
      await tester.pumpMaterialApp(
        SemanticButton(
          label: 'Test button',
          child: ElevatedButton(
            onPressed: () {},
            child: const Text('Click me'),
          ),
        ),
      );

      expect(find.text('Click me'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsOneWidget);
    });

    testWidgets('has proper semantic label', (tester) async {
      await tester.pumpMaterialApp(
        SemanticButton(
          label: 'Create new event',
          child: ElevatedButton(
            onPressed: () {},
            child: const Text('New Event'),
          ),
        ),
      );

      expect(
        tester.getSemantics(find.byType(SemanticButton)).label,
        equals('Create new event'),
      );
    });

    testWidgets('includes hint in semantics', (tester) async {
      await tester.pumpMaterialApp(
        SemanticButton(
          label: 'Settings',
          hint: 'Opens settings screen',
          child: IconButton(
            onPressed: () {},
            icon: const Icon(Icons.settings),
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticButton));
      expect(semantics.hint, equals('Opens settings screen'));
    });

    testWidgets('is tappable', (tester) async {
      var pressed = false;

      await tester.pumpMaterialApp(
        SemanticButton(
          label: 'Tappable button',
          onPressed: () => pressed = true,
          child: ElevatedButton(
            onPressed: () => pressed = true,
            child: const Text('Tap me'),
          ),
        ),
      );

      await tester.tap(find.text('Tap me'));
      await tester.pump();

      expect(pressed, isTrue);
    });

    testWidgets('works with disabled state', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticButton(
          label: 'Disabled button',
          enabled: false,
          child: ElevatedButton(
            onPressed: null,
            child: Text('Disabled'),
          ),
        ),
      );

      expect(find.text('Disabled'), findsOneWidget);
    });

    testWidgets('excludes child semantics to avoid duplication', (tester) async {
      await tester.pumpMaterialApp(
        SemanticButton(
          label: 'Parent label',
          child: ElevatedButton(
            onPressed: () {},
            child: const Text('Child text'),
          ),
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticButton));
      expect(semantics.label, equals('Parent label'));
    });
  });

  group('SemanticIconButton', () {
    testWidgets('renders icon button', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Notifications',
          icon: Icons.notifications,
          onPressed: () {},
        ),
      );

      expect(find.byIcon(Icons.notifications), findsOneWidget);
      expect(find.byType(IconButton), findsOneWidget);
    });

    testWidgets('has proper semantic label', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Open notifications',
          icon: Icons.notifications,
          onPressed: () {},
        ),
      );

      expect(
        tester.getSemantics(find.byType(SemanticIconButton)).label,
        equals('Open notifications'),
      );
    });

    testWidgets('includes hint in semantics', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Notifications',
          hint: '3 unread notifications',
          icon: Icons.notifications,
          onPressed: () {},
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticIconButton));
      expect(semantics.hint, equals('3 unread notifications'));
    });

    testWidgets('applies custom size to icon', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Large icon',
          icon: Icons.settings,
          size: 32,
          onPressed: () {},
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(Icons.settings));
      expect(icon.size, equals(32));
    });

    testWidgets('applies custom color to icon', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Red icon',
          icon: Icons.error,
          color: Colors.red,
          onPressed: () {},
        ),
      );

      final icon = tester.widget<Icon>(find.byIcon(Icons.error));
      expect(icon.color, equals(Colors.red));
    });

    testWidgets('calls onPressed when tapped', (tester) async {
      var pressed = false;

      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Tappable icon',
          icon: Icons.add,
          onPressed: () => pressed = true,
        ),
      );

      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();

      expect(pressed, isTrue);
    });

    testWidgets('is disabled when enabled is false', (tester) async {
      await tester.pumpMaterialApp(
        const SemanticIconButton(
          label: 'Disabled icon',
          icon: Icons.add,
          enabled: false,
          onPressed: null,
        ),
      );

      final iconButton = tester.widget<IconButton>(find.byType(IconButton));
      expect(iconButton.onPressed, isNull);
    });

    testWidgets('is enabled when enabled is true', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Enabled icon',
          icon: Icons.add,
          enabled: true,
          onPressed: () {},
        ),
      );

      final iconButton = tester.widget<IconButton>(find.byType(IconButton));
      expect(iconButton.onPressed, isNotNull);
    });

    testWidgets('provides custom label instead of icon name', (tester) async {
      await tester.pumpMaterialApp(
        SemanticIconButton(
          label: 'Custom label',
          icon: Icons.notifications,
          onPressed: () {},
        ),
      );

      final semantics = tester.getSemantics(find.byType(SemanticIconButton));
      expect(semantics.label, equals('Custom label'));
    });
  });
}
