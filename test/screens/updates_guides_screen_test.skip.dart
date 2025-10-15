import 'package:flutter_test/flutter_test.dart';
import 'package:myorbit_calendar/ui/screens/updates_guides_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('UpdatesGuidesScreen renders core sections', (tester) async {
    await tester.pumpApp(const UpdatesGuidesScreen());
    await tester.pumpAndSettle();

    expect(find.text('Updates & Guides'), findsOneWidget);
    expect(find.text('Notification Preferences'), findsOneWidget);
    expect(find.textContaining('AI Reminders'), findsWidgets);
    expect(find.text('Permission Levels'), findsWidgets);
  });
}
