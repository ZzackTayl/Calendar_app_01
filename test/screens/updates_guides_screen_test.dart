import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/updates_guides_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'GIVEN updates guides screen WHEN rendered THEN displays core sections',
    (tester) async {
      await tester.pumpApp(const UpdatesGuidesScreen());
      await tester.pumpAndSettle();

      expect(find.text('Updates & Guides'), findsOneWidget);
      expect(find.textContaining('Notification Types'), findsWidgets);
      expect(find.textContaining('AI Reminders'), findsWidgets);
      expect(find.text('Permission Levels'), findsWidgets);
    },
  );

  // WCAG 2.1 Compliance Tests
  group('WCAG 2.1 Compliance', () {
    late SemanticsHandle handle;

    testWidgets(
      'GIVEN updates guides screen WHEN rendered THEN meets Android tap target guideline',
      (tester) async {
        // Given
        handle = tester.ensureSemantics();
        
        // When
        await tester.pumpApp(const UpdatesGuidesScreen());
        await tester.pumpAndSettle();

        // Then - All tappable areas must be at least 48x48 dp
        await expectLater(
          tester,
          meetsGuideline(androidTapTargetGuideline),
        );
        
        handle.dispose();
      },
    );

    testWidgets(
      'GIVEN updates guides screen WHEN rendered THEN meets iOS tap target guideline',
      (tester) async {
        // Given
        handle = tester.ensureSemantics();
        
        // When
        await tester.pumpApp(const UpdatesGuidesScreen());
        await tester.pumpAndSettle();

        // Then - All tappable areas must be at least 44x44 pts
        await expectLater(
          tester,
          meetsGuideline(iOSTapTargetGuideline),
        );
        
        handle.dispose();
      },
    );

    testWidgets(
      'GIVEN updates guides screen WHEN rendered THEN all interactive elements have labels',
      (tester) async {
        // Given
        handle = tester.ensureSemantics();
        
        // When
        await tester.pumpApp(const UpdatesGuidesScreen());
        await tester.pumpAndSettle();

        // Then - All interactive elements must have semantic labels
        await expectLater(
          tester,
          meetsGuideline(labeledTapTargetGuideline),
        );
        
        handle.dispose();
      },
    );

    testWidgets(
      'GIVEN updates guides screen WHEN rendered THEN meets text contrast requirements',
      (tester) async {
        // Given
        handle = tester.ensureSemantics();
        
        // When
        await tester.pumpApp(const UpdatesGuidesScreen());
        await tester.pumpAndSettle();

        // Then - Text must have 4.5:1 contrast (normal) or 3:1 (large 18pt+)
        await expectLater(
          tester,
          meetsGuideline(textContrastGuideline),
        );
        
        handle.dispose();
      },
    );
  });
}
