# Self-Healing Workflows

## Purpose

Automatically detect and recover from errors without interrupting your flow.

## Self-Healing Features

### 1. Error Detection

Monitors for:

- Failed commands
- Syntax errors
- Missing dependencies
- Broken tests

### 2. Automatic Recovery

**Missing Dependencies:**

```bash
Error: Cannot find module 'express'
→ Automatically runs: npm install express
→ Retries original command
```

**Syntax Errors:**

```bash
Error: Unexpected token
→ Analyzes error location
→ Suggests fix through analyzer agent
→ Applies fix with confirmation
```

**Test Failures:**

```bash
Test failed: "user authentication"
→ Spawns debugger agent
→ Analyzes failure cause
→ Implements fix
→ Re-runs tests
```

### 3. Learning from Failures

Each recovery improves future prevention:

- Patterns saved to knowledge base
- Similar errors prevented proactively
- Recovery strategies optimized

## Hook Integration

```json
{
  "PostToolUse": [{
    "matcher": "^Bash$",
    "command": "npx ruv-swarm hook post-bash --exit-code '${tool.result.exitCode}' --auto-recover"
  }]
}
```

## Benefits

- 🛡️ Resilient workflows
- 🔄 Automatic recovery
- 📚 Learns from errors
- ⏱️ Saves debugging time
