# Dart MCP Server (Official Dart & Flutter) - Complete Guide

## Overview

The official Dart and Flutter MCP server exposes Dart (and Flutter) development tool actions to compatible AI-assistant clients[103][105][110][113]. Built directly into the Dart SDK (version 3.9+), it provides deep integration with the Dart toolchain and Flutter DevTools.

**Developer**: Google/Dart Team (Official)  
**Version Required**: Dart SDK 3.9+ / Flutter 3.35+  
**Command**: `dart mcp-server`  
**Protocol**: Supports stdio transport, Tools, Resources, and Roots

---

## Installation and Setup

### Prerequisites
- Dart SDK 3.9 or later / Flutter SDK 3.35 or later
- MCP-compatible client (Cursor, VS Code with Copilot, Claude Desktop, Gemini CLI, GitHub Copilot)

### Start Command
```bash
dart mcp-server
```

### Configuration Examples

#### Cursor
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "dart": {
      "command": "dart",
      "args": ["mcp-server", "--force-roots-fallback"]
    }
  }
}
```

#### VS Code (GitHub Copilot)
Automatically configured if Dart extension v3.116+ is installed[110]

#### Gemini CLI
Add to `~/.gemini/settings.json`:
```json
{
  "mcpServers": {
    "dart": {
      "command": "dart",
      "args": ["mcp-server"]
    }
  }
}
```

#### Firebase Studio
Create `.idx/mcp.json`:
```json
{
  "mcpServers": {
    "dart": {
      "command": "dart",
      "args": ["mcp-server"]
    }
  }
}
```

---

## Complete Command Reference

### 1. analyze

**Purpose**: Perform static code analysis and detect errors early

**Example**:
```
Analyze lib/main.dart for errors and warnings
```

**When to Use**:
- Before committing code
- Identifying bugs and code quality issues
- Ensuring code meets style guidelines
- Pre-deployment validation

**Output**: Detailed analysis results with errors, warnings, and lints

---

### 2. format

**Purpose**: Format Dart files using standard Dart formatter

**Example**:
```
Format all files in lib/ directory
```

**When to Use**:
- Maintaining consistent code style
- Before code reviews
- Automated in pre-commit hooks
- Team style compliance

**Note**: Uses same formatter as `dart format` command

---

### 3. hot-reload

**Purpose**: Trigger hot reload on running Flutter application

**Example**:
```
Hot reload the app to see my UI changes
```

**Warning**: Only works with active debug session

**When to Use**:
- Rapid UI iteration
- Seeing changes immediately
- Development workflow optimization
- Debugging visual issues

---

### 4. hot-restart

**Purpose**: Perform VM Service Hot Restart

**Example**:
```
Hot restart the application to reset state
```

**When to Use**:
- Resetting application state
- After changing initialization code
- When hot reload isn't sufficient
- Testing from clean slate

---

### 5. pub-get

**Purpose**: Install package dependencies

**Example**:
```
Run pub get to install dependencies
```

**Warning**: Requires network access and valid pubspec.yaml

**When to Use**:
- After adding new dependencies
- Fresh project checkout
- Resolving dependency issues
- Before building project

---

### 6. pub-upgrade

**Purpose**: Upgrade all package dependencies to latest versions

**Example**:
```
Upgrade all packages to latest compatible versions
```

**Warning**: May introduce breaking changes - review changelogs

**When to Use**:
- Periodic dependency updates
- Security patch updates
- Feature updates
- Compatibility improvements

---

### 7. test

**Purpose**: Run tests and generate coverage reports

**Example**:
```
Run all tests with coverage
```

**Parameters**: `--coverage` flag for coverage reports

**When to Use**:
- Automated testing
- CI/CD pipelines
- Test-driven development
- Quality assurance

---

### 8. doctor

**Purpose**: Check development environment health

**Example**:
```
Run Flutter doctor to check setup
```

**Output**: Environment validation, missing tools, configuration issues

**When to Use**:
- Troubleshooting setup issues
- Verifying installation
- Onboarding new developers
- Environment debugging

---

### 9. resolve-symbol

**Purpose**: Resolve symbols to elements and fetch documentation

**Example**:
```
Get documentation for the StatefulWidget class
```

**When to Use**:
- Understanding APIs
- Fetching documentation
- Code exploration
- Learning new packages

---

### 10. search-packages

**Purpose**: Search pub.dev for packages

**Example**:
```
Find the best HTTP client package
```

**When to Use**:
- Discovering packages
- Finding solutions
- Evaluating alternatives
- Package research

---

### 11. manage-dependencies

**Purpose**: Add, remove, or update dependencies in pubspec.yaml

**Example**:
```
Add http package to dependencies
```

**When to Use**:
- Adding new packages
- Removing unused dependencies
- Version management
- Dependency cleanup

---

### 12. get-runtime-errors

**Purpose**: Fetch runtime errors from running application

**Example**:
```
Show me current runtime errors
```

**When to Use**:
- Debugging runtime issues
- Catching RenderFlex overflows
- Error investigation
- Production debugging

---

### 13. inspect-widget-tree

**Purpose**: Access Flutter widget tree structure

**Example**:
```
Show me the widget tree for current screen
```

**When to Use**:
- Understanding UI structure
- Debugging layout issues
- Performance analysis
- Widget optimization

---

### 14. get-selected-widget

**Purpose**: Get information about currently selected widget in DevTools

**Example**:
```
What widget is currently selected?
```

**When to Use**:
- Inspector integration
- Widget debugging
- UI analysis
- DevTools workflows

---

### 15. screenshot

**Purpose**: Capture screenshot of running Flutter application

**Example**:
```
Take a screenshot of the current screen
```

**When to Use**:
- Visual testing
- Documentation
- Bug reports
- Design reviews

---

## Application Introspection Features

The Dart MCP server's most powerful feature set is **live application interaction**:

### Live Debugging Workflow[121]
1. AI triggers hot reload
2. AI fetches runtime errors
3. AI inspects widget tree
4. AI captures screenshot
5. AI analyzes and suggests fixes
6. Repeat

This creates a **self-correcting feedback loop** where AI can see its changes in real-time.

---

## Social Listening: Real-World Usage

### From Flutter Blog[105]

> "Supercharge Your Dart & Flutter Development Experience with the Dart MCP Server - allows AI assistants to understand code context and perform actions on behalf of developers"

### From Flutter Forum[110]

Community discussion reveals:
- Works best with Dart SDK 3.9.0-163.0.dev or later
- GitHub Copilot integration requires Dart extension v3.116+
- Screenshot tool enables automated UI building

### From Very Good Ventures[113]

> "7 MCP Servers Every Dart and Flutter Developer Should Know - Dart MCP is #1 for direct language and framework integration"

### From Medium Article[105]

Key insights:
- Proper error details enable agents to fix issues autonomously
- Screenshot tool allows building UI from descriptions
- Integration reduces manual context switching

---

## Common Issues and Troubleshooting

### Issue 1: Version Compatibility

**Problem**: Server fails to start or commands not recognized

**Solution**: Ensure Dart SDK 3.9+ or Flutter SDK 3.35+
```bash
dart --version
flutter --version
```

---

### Issue 2: Roots Support

**Problem**: Client claims roots support but doesn't set them

**Solution**: Use `--force-roots-fallback` flag[103]
```json
{
  "args": ["mcp-server", "--force-roots-fallback"]
}
```

---

### Issue 3: Hot Reload Not Working

**Problem**: Hot reload command fails

**Root Cause**: No active debug session

**Solution**: Start app in debug mode first:
```bash
flutter run
```

---

### Issue 4: Runtime Errors Not Appearing

**Problem**: get-runtime-errors returns nothing

**Root Cause**: App must be running and connected to DevTools

**Solution**: Ensure Flutter DevTools connection is active

---

### Issue 5: Screenshot Fails

**Problem**: Screenshot command errors

**Root Cause**: Platform limitations or missing permissions

**Solution**: Check platform-specific screenshot permissions

---

## Integration with DCM MCP

The Dart MCP server **complements** DCM MCP (Dart Code Metrics):

**Division of Responsibilities**[8]:
- **Dart MCP**: Runtime actions, analyzer, formatter, hot reload, testing
- **DCM MCP**: Code quality metrics, static analysis, autofixes

**Combined Workflow**:
```
1. Dart MCP: Run tests
2. DCM MCP: Analyze code quality
3. DCM MCP: Apply safe fixes
4. Dart MCP: Format code
5. Dart MCP: Hot reload to see changes
6. Dart MCP: Verify no runtime errors
```

---

## Dynamic Tools Registration

**Advanced Feature**: Flutter apps can register custom tools at the MCP server[107]

**Use Cases**:
- App-specific debugging tools
- Custom inspection capabilities
- Domain-specific actions
- Plugin integration

**Implementation**: See Arenukvern/mcp_flutter for examples

---

## Best Practices for Junior Developers

### 1. Start with Analysis
Always run analyze before committing:
```
"Analyze my code and show me any issues"
```

### 2. Use Hot Reload Iteratively
Make small changes and hot reload frequently:
```
"Change button color to blue and hot reload"
```

### 3. Let AI Handle Formatting
Don't manually format - let tooling do it:
```
"Format all my Dart files"
```

### 4. Check Runtime Errors Frequently
```
"Are there any runtime errors?"
```

### 5. Leverage Documentation Lookup
```
"Show me documentation for TextField widget"
```

### 6. Use doctor for Environment Issues
```
"Run Flutter doctor and fix any issues"
```

---

## Advanced Features

### Package Management
AI can manage your pubspec.yaml:
```
"Add http package version 1.1.0"
"Remove unused dependencies"
"Upgrade all packages"
```

### Testing Automation
```
"Run all tests and show me failures"
"Run tests with coverage report"
"Test the authentication module"
```

### Widget Tree Analysis
```
"Show me the widget hierarchy"
"Find widgets causing performance issues"
"Optimize the widget tree"
```

---

## Comparison: Dart MCP vs DCM MCP

| Feature | Dart MCP | DCM MCP |
|---------|----------|---------|
| Purpose | Runtime & tooling | Code quality metrics |
| Focus | Analyzer, formatter, testing | Linting, metrics, autofixes |
| Live app | Yes (hot reload, errors) | No |
| Static analysis | Basic (analyzer) | Advanced (metrics) |
| Code fixes | No | Yes (safe autofixes) |
| Pub management | Yes | No |
| Screenshot | Yes | No |
| Widget analysis | Yes (tree) | Yes (performance) |

**Use Both**: They complement each other perfectly

---

## Client Compatibility

| Client | Support Level | Notes |
|--------|--------------|-------|
| VS Code (Copilot) | ✅ Full | Auto-configured with Dart extension |
| Cursor | ✅ Full | Manual configuration required |
| Gemini CLI | ✅ Full | Native support |
| Firebase Studio | ✅ Full | Built-in integration |
| Claude Desktop | ⚠️ Partial | Stdio support only |
| GitHub Copilot | ✅ Full | JetBrains, VS, Eclipse |

---

## Additional Resources

- [Official Dart MCP Documentation](https://dart.dev/tools/mcp-server)
- [Flutter Blog: Supercharge Development](https://blog.flutter.dev/supercharge-your-dart-flutter-development-experience-with-the-dart-mcp-server-2edcc8107b49)
- [Very Good Ventures: 7 Essential MCP Servers](https://verygood.ventures/blog/7-mcp-servers-every-dart-and-flutter-developer-should-know)
- [Pub.dev: mcp_server package](https://pub.dev/packages/mcp_server)
- [GitHub: Flutter MCP (Community)](https://github.com/Arenukvern/mcp_flutter)

---

*Last Updated: October 2025*
