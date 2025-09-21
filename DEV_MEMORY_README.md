# Development Memory System with Mem0

This setup uses Mem0 to help you maintain context and remember important details during your development process.

## What is Mem0?

Mem0 is an open-source memory layer that provides persistent, contextual memory for AI agents. In this development context, it helps you:

- Remember decisions made during development
- Track bugs and their solutions
- Maintain context between coding sessions
- Search through your development history
- Keep track of features and architectural choices

## Quick Start

### 1. Start a Development Session

```bash
npm run mem:start
```

Or with context:
```bash
npm run mem:start '{"goal": "fix authentication issues", "focus": "login flow"}'
```

### 2. Log Development Activities

**Log a task:**
```bash
npm run mem:task "Fix login bug" "User can't login with email" "completed"
```

**Log a bug:**
```bash
npm run mem:bug "Memory leak in calendar component" "Component not unmounting properly" "Added cleanup in useEffect"
```

**Log a feature:**
```bash
npm run mem:feature "Dark mode toggle" "Added theme switching functionality" "components/ui/theme-toggle.tsx,app/layout.tsx"
```

**Log a decision:**
```bash
npm run mem:decision "Use Supabase for auth" "Better integration with existing stack" "Firebase,Auth0"
```

### 3. Search and Retrieve Information

**Search your development history:**
```bash
npm run mem:search "authentication" 10
```

**View recent history:**
```bash
npm run mem:history 20
```

**Get session summary:**
```bash
npm run mem:summary
```

### 4. End Your Session

```bash
npm run mem:end "Successfully implemented dark mode and fixed login issues"
```

## Available Commands

| Command | Description | Example |
|---------|-------------|---------|
| `npm run mem:start` | Start new dev session | `npm run mem:start '{"goal": "fix bugs"}'` |
| `npm run mem:task` | Log a development task | `npm run mem:task "Fix login" "Details" "completed"` |
| `npm run mem:bug` | Log a bug encounter | `npm run mem:bug "Login fails" "Error details" "Solution"` |
| `npm run mem:feature` | Log a feature worked on | `npm run mem:feature "Dark mode" "Description" "file1.tsx,file2.tsx"` |
| `npm run mem:decision` | Log an architectural decision | `npm run mem:decision "Use Supabase" "Reasoning" "Alt1,Alt2"` |
| `npm run mem:search` | Search development memories | `npm run mem:search "authentication" 5` |
| `npm run mem:history` | View recent development history | `npm run mem:history 10` |
| `npm run mem:summary` | Get current session summary | `npm run mem:summary` |
| `npm run mem:end` | End current session | `npm run mem:end "Session summary"` |

## Memory Types

The system tracks different types of development memories:

- **dev_session**: Session start/end information
- **dev_task**: Tasks and their status
- **dev_bug**: Bugs encountered and solutions
- **dev_feature**: Features worked on
- **dev_decision**: Architectural and design decisions

## Benefits for Development

1. **Context Continuity**: Remember what you were working on when you return to a project
2. **Bug Tracking**: Keep track of bugs and their solutions for future reference
3. **Decision Documentation**: Remember why certain architectural choices were made
4. **Feature History**: Track what features have been implemented
5. **Searchable Knowledge**: Quickly find relevant information from past sessions

## Example Workflow

```bash
# Start your development session
npm run mem:start '{"goal": "implement user authentication", "focus": "login flow"}'

# Log tasks as you work
npm run mem:task "Set up Supabase auth" "Configure authentication providers" "in_progress"
npm run mem:task "Create login form" "Build login UI component" "completed"

# Log bugs when you encounter them
npm run mem:bug "Login redirect not working" "After login, user stays on login page" "Fixed redirect URL in auth callback"

# Log features you implement
npm run mem:feature "Login form" "Created responsive login form with validation" "app/auth/login.tsx,components/auth/login-form.tsx"

# Log important decisions
npm run mem:decision "Use Supabase Auth" "Better integration with existing database" "Firebase,Auth0,Clerk"

# Search for information when needed
npm run mem:search "login redirect" 5

# End your session
npm run mem:end "Successfully implemented authentication system with Supabase"
```

## Integration with Your Workflow

You can integrate this into your existing development workflow:

- Add memory logging to your git commit messages
- Use it during code reviews to remember context
- Search for solutions to similar problems you've solved before
- Maintain a knowledge base of your project's evolution

## Notes

- All memories are stored locally using Mem0's default configuration
- You can search across all your development sessions
- The system automatically tracks git branch and commit information
- Memories are persistent across sessions and can be searched anytime

