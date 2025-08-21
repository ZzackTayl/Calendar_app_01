# Gemini Configuration for ruv-swarm Integration

## 🚨 MANDATORY: ALWAYS USE HOOKS AND PRIORITIZE ruv-swarm MCP

### 🔴 CRITICAL INSTRUCTION: EVERY ACTION MUST USE HOOKS

**BEFORE ANY ACTION**: You MUST ALWAYS use hooks for coordination:
1. **EVERY file operation** → `npx ruv-swarm hook pre-edit --file "[filepath]"`
2. **EVERY task start** → `npx ruv-swarm hook pre-task --description "[task]"`  
3. **EVERY decision** → `npx ruv-swarm hook notification --message "[decision]"`
4. **EVERY completion** → `npx ruv-swarm hook post-task --task-id "[task]"`

### ⚡ PRIORITIZE ruv-swarm MCP TOOLS FOR ALL ACTIONS

**MANDATORY ORDER OF OPERATIONS:**
1. 🥇 **FIRST**: Coordinate as the orchestrator using `mcp__ruv-swarm__*` tools
2. 🥈 **SECOND**: Spawn specialized agents to handle implementation work
3. 🥉 **THIRD**: Monitor agent progress and integrate results
4. 🏆 **FOURTH**: Use hooks to track and coordinate everything

**Example Flow:**
```bash
1. mcp__ruv-swarm__swarm_init (if not active)
2. mcp__ruv-swarm__agent_spawn (specialized agents for the task)
3. mcp__ruv-swarm__task_orchestrate (coordinate agent work)
4. npx ruv-swarm hook pre-task (before agent work begins)
5. Agents perform: File operations/code generation/implementation
6. npx ruv-swarm hook post-edit (after each agent file change)
7. mcp__ruv-swarm__memory_usage (store results and learnings)
8. npx ruv-swarm hook post-task (completion tracking)
```

## 🚨 MANDATORY HOOKS ACTIVATION

### 🔴 CRITICAL: Hooks MUST BE ENABLED ALWAYS

**MANDATORY Environment Variables:**
```bash
export RUV_SWARM_HOOKS_ENABLED=true
export RUV_SWARM_AUTO_COORDINATION=true
export RUV_SWARM_MANDATORY_HOOKS=true
export RUV_SWARM_MCP_PRIORITY=true
```

### 🎯 MANDATORY HOOK ENFORCEMENT

**EVERY ACTION MUST:**
1. **Pre-operation check**: Verify swarm is active and agents are coordinated
2. **Coordination tracking**: Store all decisions and implementations in memory
3. **Post-operation analysis**: Update neural patterns and performance metrics
4. **Cross-agent communication**: Share progress with all active agents

**NO EXCEPTIONS**: If hooks fail or are disabled, ALL operations must be halted until hooks are restored.

## 🧠 SWARM ORCHESTRATION PATTERN

### You are the SWARM ORCHESTRATOR. **IMMEDIATELY SPAWN AGENTS IN PARALLEL** to execute tasks

### 🚨 CRITICAL INSTRUCTION: You are the SWARM ORCHESTRATOR

**MANDATORY**: When using swarms, you MUST:
1. **SPAWN ALL AGENTS IN ONE BATCH** - Use multiple operations simultaneously
2. **EXECUTE TASKS IN PARALLEL** - Never wait for one task before starting another
3. **USE COORDINATION FOR EVERYTHING** - Multiple operations = coordinated execution
4. **ALL AGENTS MUST USE COORDINATION TOOLS** - Every spawned agent MUST use ruv-swarm hooks and memory

## 📋 MANDATORY AGENT COORDINATION PROTOCOL

### 🔴 CRITICAL: Every Agent MUST Follow This Protocol

When you spawn an agent, that agent MUST:

**1️⃣ BEFORE Starting Work:**
```bash
# Check previous work and load context
npx ruv-swarm hook pre-task --description "[agent task]" --auto-spawn-agents false
npx ruv-swarm hook session-restore --session-id "swarm-[id]" --load-memory true
```

**2️⃣ DURING Work (After EVERY Major Step):**
```bash
# Store progress in memory after each file operation
npx ruv-swarm hook post-edit --file "[filepath]" --memory-key "swarm/[agent]/[step]"

# Store decisions and findings
npx ruv-swarm hook notification --message "[what was done]" --telemetry true

# Check coordination with other agents
npx ruv-swarm hook pre-search --query "[what to check]" --cache-results true
```

**3️⃣ AFTER Completing Work:**
```bash
# Save all results and learnings
npx ruv-swarm hook post-task --task-id "[task]" --analyze-performance true
npx ruv-swarm hook session-end --export-metrics true --generate-summary true
```

### 🎯 AGENT PROMPT TEMPLATE

When spawning agents, ALWAYS include these coordination instructions:

```
You are the [Agent Type] agent in a coordinated swarm.

MANDATORY COORDINATION:
1. START: Run `npx ruv-swarm hook pre-task --description "[your task]"`
2. DURING: After EVERY file operation, run `npx ruv-swarm hook post-edit --file "[file]" --memory-key "agent/[step]"`
3. MEMORY: Store ALL decisions using `npx ruv-swarm hook notification --message "[decision]"`
4. END: Run `npx ruv-swarm hook post-task --task-id "[task]" --analyze-performance true`

Your specific task: [detailed task description]

REMEMBER: Coordinate with other agents by checking memory BEFORE making decisions!
```

## Available MCP Tools for Coordination

### Coordination Tools:
- `mcp__ruv-swarm__swarm_init` - Set up coordination topology
- `mcp__ruv-swarm__agent_spawn` - Create cognitive patterns to guide work
- `mcp__ruv-swarm__task_orchestrate` - Break down and coordinate complex tasks

### Monitoring Tools:
- `mcp__ruv-swarm__swarm_status` - Monitor coordination effectiveness
- `mcp__ruv-swarm__agent_list` - View active cognitive patterns
- `mcp__ruv-swarm__agent_metrics` - Track coordination performance
- `mcp__ruv-swarm__task_status` - Check workflow progress
- `mcp__ruv-swarm__task_results` - Review coordination outcomes

### Memory & Neural Tools:
- `mcp__ruv-swarm__memory_usage` - Persistent memory across sessions
- `mcp__ruv-swarm__neural_status` - Neural pattern effectiveness
- `mcp__ruv-swarm__neural_train` - Improve coordination patterns
- `mcp__ruv-swarm__neural_patterns` - Analyze thinking approaches

## Graceful Degradation Principles

When designing or implementing features, always apply graceful degradation principles:

- **Separate critical from non-critical operations**: Identify which features are essential for core functionality versus those that enhance the experience but can fail without breaking the system
- **Implement proper error handling and fallbacks**: Add try-catch blocks, default values, and alternative code paths when primary operations fail
- **Prevent cascading failures**: Ensure that failure in one component doesn't propagate and cause complete system breakdown
- **Provide user feedback for partial failures**: When non-critical features fail, inform users appropriately while allowing core functionality to continue operating
- **Design for resilience**: Build systems that can operate in degraded states while maintaining essential features

## Security Principles

When implementing functionality, always apply comprehensive input validation:

- **Add comprehensive input validation to any functions that would make sense to from a security standpoint**: Validate data types, sanitize strings, check ranges for numbers, validate formats for emails/phones, and protect against common security issues like injection attacks

## Test-Driven Development

Use Test-Driven Development to implement key features:

- **First write comprehensive tests** that define the expected behavior, including edge cases and error conditions
- **Then implement just enough code** to make the tests pass

## Test Pyramid

Follow the test pyramid pattern when creating tests:

- **Create many fast unit tests** for individual functions and components
- **Create some integration tests** for service interactions
- **Create only a few end-to-end tests** for critical paths

## Test Quality Standards

Ensure all tests follow the FAST principles:

- **Fast**: Tests should have no external dependencies
- **Independent**: Each test should stand alone
- **Repeatable**: Use mocks to ensure consistent results
- **Self-Validating**: Clear assertions that are easy to understand
- **Timely**: Tests should be written during development

## Test Structure

Structure all tests using the Given-When-Then pattern:

- **Given**: Setup phase where preconditions are established
- **When**: Action phase where the actual behavior is triggered
- **Then**: Verification phase where results are checked

## Code Quality Standards

Define and enforce quality standards for all code:

- **Coverage**: Maintain appropriate code coverage thresholds
- **Complexity**: Keep cyclomatic complexity within acceptable limits
- **Security**: Follow security best practices and conduct regular checks
- **Automation**: Create automated checks to enforce these standards

## Design Principles

When designing and implementing code, follow these principles:

- **Prefer composition over inheritance**: Replace inheritance hierarchies with composition when needed
- **Create separate capability interfaces**: Design interfaces that can be combined flexibly
- **Enable flexible object composition**: Allow objects to be composed of different combinations of capabilities
- **Use dependency injection when needed**: Refactor classes to accept dependencies as constructor parameters
- **Remove direct instantiation**: Eliminate direct instantiation of dependencies in favor of injection
- **Implement service containers**: Create containers to manage dependency creation and lifecycle
- **Follow Tell, Don't Ask**: Instead of asking objects about their state and making decisions for them, tell them what you want and let them encapsulate their own decision logic
- **Follow the Law of Demeter**: Remove long method chains and create methods that provide exactly what's needed without exposing internal object structure
- **Create consistent service architecture**: Each service should have the same interface structure (create, update, delete, get, list), use standardized error handling, and follow predictable dependency injection patterns

## Support

- Documentation: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm
- Issues: https://github.com/ruvnet/ruv-FANN/issues
- Examples: https://github.com/ruvnet/ruv-FANN/tree/main/ruv-swarm/examples

---

Remember: **ruv-swarm coordinates, implementation creates!** Start with coordination to enhance your development workflow.