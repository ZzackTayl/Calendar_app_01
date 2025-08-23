# RUV Swarm Quick Reference

## 🚨 MANDATORY WORKFLOW

**BEFORE ANY TASK:**
1. Check swarm status: `mcp_ruv-swarm_swarm_status`
2. Initialize if needed: `mcp_ruv-swarm_swarm_init`
3. Spawn agents: `mcp_ruv-swarm_agent_spawn` (multiple types)
4. Orchestrate: `mcp_ruv-swarm_task_orchestrate`
5. Monitor: `mcp_ruv-swarm_task_status`
6. Collect: `mcp_ruv-swarm_task_results`

## ⚠️ DIRECT WORK EXCEPTIONS

**ONLY use direct tools for:**
- Agent failures
- Trivial fixes (1-2 lines)
- Debugging agent issues
- Emergency situations
- Agent unavailability

## 🎯 AGENT TYPES

- **Researcher**: Analysis, documentation, requirements
- **Coder**: Implementation, file operations, code generation
- **Analyst**: Performance, optimization, insights
- **Tester**: QA, testing, validation
- **Coordinator**: Planning, tracking, integration

## 📋 CHECKLIST

- [ ] RUV Swarm tools available?
- [ ] Task complexity warrants orchestration?
- [ ] Agents spawned and coordinated?
- [ ] Progress monitored?
- [ ] Results collected and integrated?

**DEFAULT: Use RUV Swarm orchestration**
**EXCEPTION: Use direct work only when necessary**
