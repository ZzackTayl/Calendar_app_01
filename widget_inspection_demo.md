# Flutter Widget Inspection Demo

## Setup Complete! ✅

Your MyOrbit calendar app is running and connected for widget inspection.

## Available MCP Tools

### 1. Widget Tree Analysis
```javascript
// Get complete widget hierarchy
await call_mcp_tool('get_widget_tree', {})

// Enable interactive selection mode
await call_mcp_tool('set_widget_selection_mode', {enabled: true})

// Get currently selected widget details
await call_mcp_tool('get_selected_widget', {})
```

### 2. Runtime Monitoring
```javascript
// Monitor runtime errors
await call_mcp_tool('get_runtime_errors', {clearRuntimeErrors: false})

// Hot reload after code changes
await call_mcp_tool('hot_reload', {clearRuntimeErrors: true})

// Get current cursor location in IDE
await call_mcp_tool('get_active_location', {})
```

### 3. Widget Properties Inspection
```javascript
// Get hover information at specific location
await call_mcp_tool('hover', {
  uri: 'file:///Users/zackstewart/Documents/GitHub/calendar_app/lib/main.dart',
  line: 10,
  column: 5
})

// Get signature help for API usage
await call_mcp_tool('signature_help', {
  uri: 'file:///Users/zackstewart/Documents/GitHub/calendar_app/lib/main.dart', 
  line: 10,
  column: 5
})
```

## Practical Usage Examples

### Debugging Widget Layout Issues
1. **Enable Selection Mode**: Click widgets in your running app to inspect them
2. **Get Widget Tree**: See the complete hierarchy and nesting
3. **Check Properties**: Verify padding, margins, constraints
4. **Monitor Rebuilds**: Watch for unnecessary rebuilds

### Performance Analysis  
1. **Runtime Errors**: Monitor exceptions and errors
2. **Widget Rebuilds**: Track performance bottlenecks
3. **Hot Reload**: Test changes instantly without restart

### State Management Validation
1. **Provider State**: Inspect EventProvider and UserProfileProvider
2. **Widget State**: Check StatefulWidget states
3. **Real-time Updates**: Watch state changes as they happen

## Visual Testing Setup

### Golden Tests (Screenshots)
```dart
// Add to your test files
import 'package:golden_toolkit/golden_toolkit.dart';

testGoldens('calendar screen golden test', (tester) async {
  await tester.pumpWidgetBuilder(
    CalendarScreen(),
    wrapper: materialAppWrapper(
      theme: ThemeData.light(),
    ),
  );
  
  await screenMatchesGolden(tester, 'calendar_screen');
});
```

### Integration Test Screenshots  
```dart
// For full app screenshots
import 'package:integration_test/integration_test.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  testWidgets('app flow screenshots', (tester) async {
    await tester.pumpWidget(MyApp());
    
    // Navigate through your app
    await tester.tap(find.text('Get Started'));
    await tester.pumpAndSettle();
    
    // Take screenshot
    await binding.convertFlutterSurfaceToImage();
    await tester.takeScreenshot('onboarding_screen');
  });
}
```

## Next Steps

1. **Try Selection Mode**: Enable it and click on widgets in your app
2. **Inspect Calendar Widgets**: Look at your TableCalendar implementation  
3. **Monitor State Changes**: Watch Provider updates in real-time
4. **Set Up Golden Tests**: Add visual regression testing
5. **Performance Profiling**: Use DevTools integration for performance analysis

## Commands to Remember

```bash
# Start app (already running)
flutter run -d chrome --web-port=3000

# Connect to DevTools 
# DTD URI: ws://127.0.0.1:9101/ws

# View app
open http://localhost:3000
```

Your Flutter widget inspection environment is now fully operational! 🚀