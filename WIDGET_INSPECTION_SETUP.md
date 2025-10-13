# Flutter Widget Tree Inspection & Runtime Analysis Guide

## Setup Complete ✅

### Current Configuration
- **Project Root**: `/Users/zackstewart/Documents/GitHub/calendar_app`
- **DevTools Port**: 9101
- **DTD URI**: `ws://127.0.0.1:9101/ws`
- **MCP Connection**: Active

## Available Widget Inspection Tools

### 1. Complete Widget Tree Traversal
```dart
// Retrieves the entire widget tree hierarchy
await get_widget_tree()
```

### 2. Interactive Widget Selection
```dart
// Enable selection mode to click and inspect widgets
await set_widget_selection_mode(enabled: true)
await get_selected_widget()
```

### 3. Runtime Property Inspection
- Widget types and properties
- Layout constraints  
- Render object properties
- State information

### 4. Runtime Error Monitoring
```dart
// Get current runtime errors
await get_runtime_errors(clearRuntimeErrors: false)
```

### 5. Hot Reload Integration
```dart
// Apply code changes without restart
await hot_reload(clearRuntimeErrors: true)
```

## Widget Tree Analysis Capabilities

### Programmatic Traversal
- **Hierarchical Structure**: Complete parent-child relationships
- **Widget Types**: All widget classes and their inheritance
- **Properties**: Runtime property values
- **State**: Current widget state information
- **Constraints**: Layout constraints and dimensions

### Interactive Selection
- **Click-to-Inspect**: Enable selection mode and click widgets
- **Property Details**: Detailed information about selected widgets
- **Real-time Updates**: Properties update as the app state changes

### Runtime Monitoring
- **Error Tracking**: Monitor runtime errors and exceptions
- **Performance**: Widget rebuild tracking
- **State Changes**: Monitor state updates in real-time

## Screenshot & Visual Testing

While MCP tools don't directly provide screenshots, you can implement:

### 1. Flutter Screenshot Testing
```dart
// In your test files
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';

testGoldens('widget screenshot test', (tester) async {
  await tester.pumpWidgetBuilder(
    YourWidget(),
    wrapper: materialAppWrapper(),
  );
  
  await screenMatchesGolden(tester, 'widget_screenshot');
});
```

### 2. Integration Test Screenshots
```dart
// In integration tests
import 'package:integration_test/integration_test.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  testWidgets('screenshot test', (tester) async {
    await tester.pumpWidget(MyApp());
    await binding.convertFlutterSurfaceToImage();
    await tester.takeScreenshot('screenshot_name');
  });
}
```

## Usage Examples

### Basic Widget Tree Inspection
1. Start your Flutter app: `flutter run -d chrome`
2. DevTools will automatically start (usually on port 9101)
3. Connect to DTD: `ws://127.0.0.1:9101/ws`
4. Use inspection tools to analyze widget hierarchy

### Development Workflow
1. **Code Changes**: Make widget modifications
2. **Hot Reload**: Apply changes instantly
3. **Inspect Tree**: Check widget hierarchy updates
4. **Monitor Errors**: Track any runtime issues
5. **Test Properties**: Verify widget property values

## Automation Scripts

You can create scripts to automate common inspection tasks:

```bash
#!/bin/bash
# widget_analysis.sh
echo "Starting Flutter widget analysis..."
flutter run -d chrome &
sleep 5
# DTD connection happens automatically
echo "Ready for widget inspection!"
```

## Next Steps

1. **Visual Regression Testing**: Set up golden tests
2. **Automated Inspection**: Create scripts for common checks  
3. **Performance Monitoring**: Track widget rebuild patterns
4. **State Validation**: Verify state management behavior

## Notes for Future Sessions

- **DevTools Port**: Usually 9101, may change between sessions
- **DTD URI Pattern**: `ws://127.0.0.1:[PORT]/ws`
- **Connection Required**: Must connect to DTD before using inspection tools
- **App Must Be Running**: Flutter app needs to be active for inspection

This setup enables comprehensive runtime widget analysis for the MyOrbit calendar app.