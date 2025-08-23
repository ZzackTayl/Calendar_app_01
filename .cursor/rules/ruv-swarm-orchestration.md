# RUV Swarm Orchestration Priority Rule

## 🚨 MANDATORY: ALWAYS USE RUV SWARM ORCHESTRATION FIRST

### 🔴 CRITICAL INSTRUCTION: RUV SWARM FIRST, DIRECT WORK LAST

**EVERY TASK MUST FOLLOW THIS ORDER:**
1. 🥇 **FIRST**: Initialize/check RUV Swarm status
2. 🥈 **SECOND**: Spawn appropriate specialized agents
3. 🥉 **THIRD**: Orchestrate task across agents
4. 🏆 **FOURTH**: Monitor and coordinate agent work
5. ⚠️ **LAST RESORT**: Direct work only if agents fail

### ⚡ MANDATORY WORKFLOW PATTERN

**FOR EVERY TASK:**
```
STEP 1: Check Swarm Status
- mcp_ruv-swarm_swarm_status
- If not active: mcp_ruv-swarm_swarm_init

STEP 2: Spawn Specialized Agents (Parallel)
- mcp_ruv-swarm_agent_spawn (researcher)
- mcp_ruv-swarm_agent_spawn (coder)
- mcp_ruv-swarm_agent_spawn (analyst)
- mcp_ruv-swarm_agent_spawn (tester)
- mcp_ruv-swarm_agent_spawn (coordinator)

STEP 3: Orchestrate Task
- mcp_ruv-swarm_task_orchestrate (detailed task description)

STEP 4: Monitor Progress
- mcp_ruv-swarm_task_status
- mcp_ruv-swarm_agent_metrics

STEP 5: Collect Results
- mcp_ruv-swarm_task_results
- mcp_ruv-swarm_memory_usage
```

### 🎯 WHEN TO FALL BACK TO DIRECT WORK

**ONLY use direct tools (Read/Write/Edit/Bash) if:**

1. **Agent Failure**: Agents consistently fail or timeout
2. **Simple Tasks**: Trivial fixes (1-2 lines, obvious changes)
3. **Debugging**: Investigating agent failures
4. **Emergency**: Critical system issues requiring immediate attention
5. **Agent Unavailable**: RUV Swarm tools not responding

**EXAMPLES OF WHEN TO USE DIRECT WORK:**
- ✅ Fixing a single typo in a comment
- ✅ Adding a console.log for debugging
- ✅ Quick file permission changes
- ✅ Emergency server restart
- ✅ Agent failure investigation

**EXAMPLES OF WHEN TO USE RUV SWARM:**
- ✅ Any feature implementation
- ✅ Code refactoring
- ✅ File creation/modification
- ✅ Testing and validation
- ✅ Performance optimization
- ✅ Documentation updates
- ✅ Configuration changes

### 🧠 AGENT SPECIALIZATION GUIDELINES

**Researcher Agent:**
- Code analysis and research
- Finding relevant documentation
- Understanding requirements
- Identifying best practices

**Coder Agent:**
- Writing and implementing code
- File creation and modification
- Code generation
- Implementation details

**Analyst Agent:**
- Performance analysis
- Code review and optimization
- Identifying issues and solutions
- Data analysis and insights

**Tester Agent:**
- Test creation and execution
- Quality assurance
- Bug detection and validation
- Performance testing

**Coordinator Agent:**
- Task breakdown and planning
- Progress tracking
- Integration of agent outputs
- Final quality checks

### 📊 SUCCESS METRICS

**Track these metrics to ensure effective orchestration:**
- Agent success rate > 90%
- Task completion time vs. direct work
- Code quality improvements
- Bug reduction
- Performance gains

### 🔄 CONTINUOUS IMPROVEMENT

**After each task:**
1. Analyze agent performance
2. Train neural patterns if needed
3. Update coordination strategies
4. Store learnings in memory
5. Optimize agent specializations

### ⚠️ EXCEPTION HANDLING

**If agents fail:**
1. Document the failure reason
2. Attempt agent retraining
3. Spawn new agents if needed
4. Fall back to direct work only as last resort
5. Update failure patterns for future prevention

### 🎯 IMPLEMENTATION CHECKLIST

**Before starting any task:**
- [ ] Check if RUV Swarm tools are available
- [ ] Assess task complexity (RUV Swarm vs. direct)
- [ ] Prepare detailed task description for orchestration
- [ ] Ensure proper agent spawning strategy
- [ ] Set up monitoring and coordination

**During task execution:**
- [ ] Monitor agent progress regularly
- [ ] Coordinate between agents as needed
- [ ] Handle any agent failures gracefully
- [ ] Maintain task context across agents

**After task completion:**
- [ ] Collect and integrate agent results
- [ ] Store learnings in memory
- [ ] Update agent performance metrics
- [ ] Document any issues for future improvement

---

**REMEMBER: RUV Swarm orchestration is the DEFAULT approach. Direct work is the EXCEPTION, not the rule.**
