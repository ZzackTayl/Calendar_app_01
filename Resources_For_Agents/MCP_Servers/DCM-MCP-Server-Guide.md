# DCM MCP Server (Dart Code Metrics) - Complete Guide

## Overview

The DCM MCP server enables AI assistants to function as intelligent code quality gatekeepers for Dart and Flutter projects, offering access to static analysis, metrics calculation, and automated fixing capabilities[8][14].

**Version Required**: DCM 1.31.0 or higher  
**Package**: dcm  
**Protocol**: Model Context Protocol (MCP) via STDIO

---

## Installation and Setup

### Prerequisites
- DCM version 1.31.0+ installed and available on PATH
- MCP-capable client (Cursor, GitHub Copilot, JetBrains IDEs, Gemini CLI, VS Code)

### Start Command
```bash
dcm start-mcp-server --force-roots-fallback
```

### Configuration Examples

#### Cursor Configuration
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "dcm": {
      "command": "dcm",
      "args": ["start-mcp-server", "--force-roots-fallback"]
    }
  }
}
```

#### VS Code Configuration
Add to settings:
```json
{
  "dcm.enableMcpServer": true
}
```

#### GitHub Copilot
The DCM extension uses the VS Code MCP API to register the DCM MCP server automatically. Enable via:
```json
{
  "dcm.enableMcpServer": true
}
```

---

## Complete Command Reference

### 1. analyze

**Purpose**: Perform static code analysis and lint rule checking on files or directories

**Example**:
```
analyze my_flutter_project/lib/main.dart for lint rule violations
```

**Parameters**:
- File path or directory to analyze

**Warning**: Requires DCM version 1.31.0 or higher installed and available on PATH

**When to Use**:
- Before committing code to identify quality issues
- During PR reviews to catch violations
- As part of CI/CD quality gates
- When refactoring to ensure no new issues introduced

**Output**: Machine-readable findings with severity levels, rule IDs, file locations, and messages

---

### 2. analyze-widgets

**Purpose**: Flutter widget quality and performance analysis

**Example**:
```
analyze-widgets the new widget I just generated to check performance
```

**Parameters**:
- Widget file or directory containing widgets

**Warning**: The AI model must be able to properly handle the structure and context provided by the server

**When to Use**:
- After generating or modifying Flutter widgets
- To detect rebuild performance issues
- To identify missing semantics for accessibility
- To catch structural anti-patterns (e.g., single-child Column/Row)

**Output**: Widget-specific quality metrics and recommendations

---

### 3. analyze-assets

**Purpose**: Image asset optimization and issue detection within the project

**Example**:
```
analyze-assets the /assets folder and identify opportunities for image optimization
```

**Parameters**:
- Assets directory path

**Warning**: Focused on image optimization; ensure assets are correctly referenced in project structure

**When to Use**:
- Before releasing to production
- When app size becomes concern
- To identify oversized or incorrectly formatted images
- To detect unused asset files

**Output**: List of optimization opportunities with specific recommendations (compress, resize, convert format)

---

### 4. analyze-structure

**Purpose**: Project architecture and dependency visualization

**Example**:
```
analyze-structure the project to visualize dependencies before refactoring
```

**Parameters**:
- Project root or specific module

**Warning**: Provides visualization data; useful for auditing architecture

**When to Use**:
- Before major refactoring initiatives
- To identify circular dependencies
- To understand module coupling
- To audit overall project architecture

**Output**: Dependency graph and architecture metrics

---

### 5. fix

**Purpose**: Automatically apply safe fixes for detected quality issues

**Example**:
```
fix detected issues automatically using safe autofixes
```

**Parameters**:
- Target files or directories (defaults to issues found by analyze)

**Warning**: Applies safe autofixes; still requires review as AI-generated actions carry risk

**When to Use**:
- After running analyze to quickly resolve auto-fixable issues
- As part of automated quality workflows
- To maintain consistency across codebase
- Before code reviews to reduce noise

**Output**: List of applied fixes with before/after comparisons

**Best Practice**: Always run in a separate branch or with version control backup

---

### 6. format

**Purpose**: Ensure consistent code formatting across the codebase

**Example**:
```
format all Dart files in the 'src' directory to ensure consistent styling
```

**Parameters**:
- Files or directories to format

**Warning**: Ensures team style compliance is maintained consistently

**When to Use**:
- After applying fixes or making code changes
- Before committing to ensure style consistency
- As part of pre-commit hooks
- To enforce team coding standards

**Output**: Formatted files following project style rules

---

### 7. init

**Purpose**: Set up DCM and create baselines for static analysis

**Example**:
```
init DCM configuration and create baselines for the current project state
```

**Parameters**:
- Optional configuration parameters

**Warning**: Sets up initial configuration and baselines

**When to Use**:
- When first adding DCM to existing project
- To establish baseline for incremental adoption
- To configure initial rule sets and thresholds
- To preview high-priority rules not currently enabled

**Output**: Created configuration files and baseline snapshots

**Additional Feature**: `dcm init lints-preview` detects high-priority rules that would have caught issues (especially performance, memory leak risks) but are not currently enabled[8]

---

### 8. run (alias: r)

**Purpose**: Execute multiple commands at once in a predefined sequence

**Example**:
```
run analyze, analyze-widgets, and fix commands sequentially
```

**Parameters**:
- Comma-separated list of commands to chain

**Warning**: Allows chaining of multiple commands for efficiency

**When to Use**:
- To execute complete quality workflow in one prompt
- As part of automated pipelines
- For consistent pre-commit quality checks
- To save time on repetitive command sequences

**Output**: Combined output from all executed commands

---

## Social Listening: How Developers Use DCM MCP

### Real-World Feedback

**From DCM Blog**[8]:
> "AI Assistants and Agents can orchestrate the quality loop end-to-end, which boosts velocity and more importantly consistency. The key is integration: when your assistant can call real, trusted tools through a clean interface, quality becomes a repeatable team habit."

> "DCM MCP server gives agents structured access to analyze, fix, and verify as an ultimate code quality gatekeeper"

> "Instead of editor plugins for every task, you expose one server and any MCP aware assistant can orchestrate the work"

### Agentic Code Quality Workflow

The DCM team emphasizes using MCP to enable **"agentic code quality"**[8]:
1. AI generates code
2. AI runs DCM analyze on generated code
3. AI applies safe autofixes
4. AI formats the code
5. AI re-analyzes to verify quality
6. Process repeats until errors = 0

This creates a **self-correcting loop** where AI takes responsibility for code quality without human intervention.

---

## Common Issues and Troubleshooting

### Issue 1: Version Compatibility
**Problem**: DCM MCP server fails to start or commands not recognized  
**Solution**: Ensure DCM version 1.31.0 or higher is installed  
**Verification**: Run `dcm --version` in terminal

### Issue 2: PATH Configuration
**Problem**: Command not found when AI tries to invoke DCM  
**Solution**: Add DCM to system PATH or provide full path in configuration  
**Platform-specific**:
- macOS/Linux: Add to `~/.zshrc` or `~/.bashrc`
- Windows: Add to System Environment Variables

### Issue 3: Roots Support Fallback
**Problem**: Client claims roots support but doesn't set them properly  
**Solution**: Use `--force-roots-fallback` flag in start command  
**Why**: Some clients don't properly implement roots specification; fallback mode handles this[8][14]

### Issue 4: Generated Files Analyzed
**Problem**: Analysis runs on `.g.dart`, `.freezed.dart` files unnecessarily  
**Solution**: Exclude generated artifacts in DCM configuration:
```yaml
dart_code_metrics:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "build/**"
```

### Issue 5: Too Many Warnings Overwhelming
**Problem**: Analysis produces hundreds of warnings making it hard to focus  
**Solution**: Use baselines and incremental adoption:
1. Run `dcm init` to create baseline
2. Focus on new code first
3. Gradually enable stricter rules
4. Use `lints-preview` to understand impact before enabling rules

---

## Integration with Dart/Flutter MCP Server

DCM MCP works best when combined with the Dart/Flutter MCP server[8]:

**Division of Responsibilities**:
- **Dart/Flutter MCP**: Language/runtime actions, analyzer, format, hot reload
- **DCM MCP**: Code quality work, metrics, widget analysis, asset analysis

**Example Workflow: Branch Quality Gate**[8]
```
1. Dart MCP: Run analyzer across all .dart files
2. DCM MCP: Run analyze + safe autofix + format
3. Dart MCP: Run format on changed files
4. DCM MCP: Re-analyze to verify
5. Both: Compose PR summary with remaining issues
```

---

## Reusable Prompt Templates

### Discovery Prompt
```
Goal: Propose DCM rules that fit my intent, with YAML-ready IDs.

Steps:
1) Query the rule catalog and filter rules based on ["performance", "memory-leaks"] 
   only on category ["common", "flutter"]
2) Output a table:
   | rule_id | category | severity | autofixable | why it matches my keywords |
3) Output a YAML-ready rules' IDs with same-line comments
4) Suggest what to try first (autofixable rules).
```

### Workspace Quality Pass
```
Goal: Run a full DCM quality pass across the whole branch: 
analyze → safe autofix → format → re-analyze → propose a PR commit message

Steps:
1. Analyze (whole workspace on current branch minus .g.dart files)
2. Apply only safe/autofixable changes (show diff preview)
3. Format files that were changed by autofixes
4. Re-run DCM analyze and show before/after counts
5. Propose PR commit message with fixed rule counts
6. Report remaining issues with file:line links
```

### Runtime Crash to Fix (with Dart MCP)
```
Goal: Triage runtime error, propose fix, apply safe changes, verify via hot reload

Steps:
1. Connect to Dart Tooling Daemon and fetch runtime errors (Dart MCP)
2. Expand failing widget context (Dart MCP)
3. Run DCM analyze only on implicated files
4. Propose minimal code edits, apply safe DCM fixes, format
5. Hot-reload app and re-query runtime errors (Dart MCP)
6. Summarize: what changed, which DCM rules fired, before/after runtime status
```

---

## Example Configuration File

```yaml
include: package:flutter_lints/flutter.yaml

dart_code_metrics:
  extends:
    - recommended
  
  rules:
    # Performance
    - avoid-slow-collection-methods
    - prefer-bytes-builder
    - avoid-map-keys-contains
    
    # Flutter-specific
    - avoid-single-child-column-or-row
    - avoid-border-all
    - avoid-incorrect-image-opacity
    - avoid-returning-widgets
    - avoid-unnecessary-setstate
    - pass-existing-future-to-future-builder
    - pass-existing-stream-to-stream-builder
    - prefer-const-border-radius
    - prefer-dedicated-media-query-methods
    
    # Code quality
    - prefer-declaring-const-constructor
    - prefer-match-file-name: true
    
    # Memory management
    - avoid-undisposed-instances:
        ignored-instances:
          - SomeClass
        ignored-invocations:
          - WithAutoDispose
    
    # Code organization
    - arguments-ordering:
        alphabetize: true
        first:
          - some
          - name
        last:
          - child
          - children
  
  metrics:
    halstead-volume: 50
    cyclomatic-complexity: 10
    lines-of-code: 10
    maximum-nesting-level: 5
  
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "build/**"
```

---

## Best Practices for Junior Developers

### 1. Start with Read-Only Analysis
- Run `analyze` frequently to understand code quality
- Review warnings before attempting fixes
- Learn what each rule checks for and why it matters

### 2. Use Safe Autofixes First
- Let DCM apply obvious fixes automatically
- Review changes before committing
- Understand what was changed and why

### 3. Incremental Rule Adoption
- Don't enable all rules at once
- Start with recommended preset
- Add stricter rules gradually as team matures

### 4. Combine with Dart Analyzer
- DCM complements, doesn't replace, Dart analyzer
- Use both for comprehensive quality checks
- Dart analyzer catches errors, DCM catches quality issues

### 5. Automate Quality Checks
- Add DCM to pre-commit hooks
- Include in CI/CD pipelines
- Make quality checks automatic, not optional

### 6. Leverage AI Assistance
- Use prompts to automate repetitive quality tasks
- Let AI chain commands for complete workflows
- Review AI-applied fixes to learn patterns

---

## Additional Resources

- [DCM Official Documentation](https://dcm.dev/)
- [DCM MCP Server Docs](https://dcm.dev/docs/ide-integrations/mcp-server/)
- [DCM Blog: Agentic Code Quality](https://dcm.dev/blog/2025/08/25/agentic-code-quality-dcm-mcp/)
- [GitHub: DCM Prompt Library](https://dcm.dev/blog/2025/08/25/agentic-code-quality-dcm-mcp/#download-prompts--contribute)

---

*Last Updated: October 2025*
