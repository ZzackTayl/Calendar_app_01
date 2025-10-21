# MARM MCP Server (Memory Accurate Response Mode) - Complete Guide

## Overview

MARM MCP provides a universal, persistent memory layer beneath any AI client - blends semantic search, structured sessions, and smart summaries[49][52][61][63][64].

**Version**: v2.2.6  
**Developer**: Lyellr88/MARM-Systems  
**Tool Count**: 18 tools  
**Key Feature**: Cross-application memory sharing - shared database across Claude Desktop, VS Code, Cursor

---

## Why MARM Exists[49]

**The Problem**: Modern LLMs lose context over time and repeat prior ideas

**The Solution**: MARM captures and classifies important bits (decisions, configs, rationale) and recalls them by meaning

> "MARM solves the problem that modern LLMs poison their own context as it grows with distractions and dead ends"

---

## Installation and Setup

### Via pip
```bash
pip install marm-mcp-server
```

### Via Docker (Recommended)
```bash
docker pull lyellr88/marm-mcp-server:latest
docker run -d -p 8000:8000 lyellr88/marm-mcp-server
```

### Configuration

```json
{
  "mcpServers": {
    "marm": {
      "command": "marm-mcp-server",
      "args": ["--database-path", "~/.marm/memory.db"]
    }
  }
}
```

---

## Technology Stack

**Backend**:
- FastAPI with fastapi-mcp for MCP protocol compliance
- SQLite with connection pooling for persistence
- Thread-safe operations with asyncio

**AI/ML**:
- Sentence Transformers (all-MiniLM-L6-v2) for semantic search
- Embedding-based similarity matching

**Architecture**:
- Event-driven automation with error containment
- Lazy loading for resource optimization
- Response size limiting (1MB) for MCP protocol compliance

---

## Complete Tool/Command Reference

### Session Management Tools

#### 1. marm_start

**Purpose**: Initiate memory persistence

**Example**:
```
Start a new MARM session for my project
```

**What It Does**:
- Creates new session container
- Initializes memory context
- Starts tracking conversation

**When to Use**:
- Beginning new project
- Starting focused work session
- Creating memory boundary

---

#### 2. marm_refresh

**Purpose**: Clear session state

**Example**:
```
Clear my current session and start fresh
```

**Warning**: Doesn't delete memories, just clears active session

**When to Use**:
- Context becoming cluttered
- Switching to different project
- Resetting conversation context

---

### Memory Operations

#### 3. marm_smart_recall

**Purpose**: Conduct semantic searches across saved memories

**Example**:
```
What did I decide about the database schema last week?
```

**How It Works**:
1. Converts query to embedding
2. Searches memory database semantically
3. Returns most relevant memories
4. Ranks by similarity score

**When to Use**:
- Retrieving past decisions
- Finding related context
- Recalling configuration choices
- Building on previous work

**Pro Tip**: More specific queries yield better results

---

#### 4. marm_contextual_log

**Purpose**: Automatically classify and store content

**Example**:
```
Remember that we're using PostgreSQL 15 with pgvector extension
```

**Automatic Classification**:
- Decision
- Configuration
- Rationale
- Finding
- Todo
- Warning

**When to Use**:
- Capturing important decisions
- Storing configuration choices
- Recording lessons learned
- Creating memory anchors

---

#### 5. marm_summary

**Purpose**: Create summaries of context

**Example**:
```
Summarize everything we've discussed about authentication
```

**What It Generates**:
- Key points
- Decisions made
- Next actions
- Related contexts

**When to Use**:
- End of work session
- Creating documentation
- Reviewing progress
- Sharing context with team

---

#### 6. marm_context_bridge

**Purpose**: Link related memories between sessions

**Example**:
```
Connect this authentication discussion to the API security conversation from last week
```

**Creates**:
- Semantic links between contexts
- Cross-session references
- Knowledge graph connections

**When to Use**:
- Relating similar problems
- Building knowledge network
- Cross-project learning

---

### Logging System

#### 7. marm_log_session

**Purpose**: Create or switch containers

**Example**:
```
Create a new log session for the payment integration work
```

**Containers**: Organized memory buckets by project/topic

**When to Use**:
- Starting new project
- Organizing related work
- Separating concerns

---

#### 8. marm_log_entry

**Purpose**: Add structured entries with timestamps

**Example**:
```
Log that the API rate limit is 1000 requests per hour
```

**Structured Fields**:
- Timestamp
- Category
- Content
- Tags
- Priority

**When to Use**:
- Recording specific facts
- Time-stamped documentation
- Audit trails

---

### Notebook System

#### 9. marm_notebook_add

**Purpose**: Save reusable instructions

**Example**:
```
Save these deployment steps as a notebook entry
```

**Notebook Types**:
- Instructions
- Procedures
- Templates
- Best practices

**When to Use**:
- Creating runbooks
- Documenting workflows
- Saving templates
- Building knowledge base

---

#### 10. marm_notebook_use

**Purpose**: Activate saved notebooks

**Example**:
```
Load the deployment checklist notebook
```

**What Happens**:
- Notebook content loaded into context
- AI can reference steps
- Consistent process execution

**When to Use**:
- Following established procedures
- Executing checklists
- Applying templates
- Ensuring consistency

---

### System Tools

#### 11. marm_current_context

**Purpose**: Provide current date and time context

**Example**:
```
What's the current context?
```

**Returns**:
- Current date/time
- Active session
- Memory statistics
- Context state

**When to Use**:
- Time-based queries
- Session awareness
- Debugging memory state

---

## Social Listening: Real-World Usage

### From Reddit r/mcp[49]

> "MARM MCP Server: AI Memory Management for Production Use - captures and classifies important bits (decisions, configs, rationale) and recalls them by meaning"

Key community insights:
- Cross-application memory sharing is killer feature
- Semantic search quality depends on embedding model
- Response size limiting (1MB) essential for MCP compliance

### From YouTube[63][64]

> "Qwen-3 Coder CLI Forgets Everything. I Gave It a Perfect Memory - MARM provides the persistent memory layer that local LLMs desperately need"

**Use Case**: Pairing MARM with Qwen Code for persistent context across coding sessions

---

## Common Issues and Troubleshooting

### Issue 1: Database Lock Errors

**Problem**: SQLite database locked

**Cause**: Multiple clients accessing simultaneously

**Solution**:
- Use Docker deployment for better concurrency
- Configure connection pooling
- Implement retry logic

---

### Issue 2: Semantic Search Quality

**Problem**: Recall not finding relevant memories

**Causes**:
- Vague queries
- Insufficient memory content
- Embedding model limitations

**Solutions**:
1. Use more specific queries
2. Store more context with memories
3. Upgrade embedding model (all-MiniLM-L6-v2 → better model)

---

### Issue 3: Cross-Application Sync

**Problem**: Memories not showing up in different AI client

**Root Cause**: Different database paths

**Solution**: Share database path across clients
```json
{
  "mcpServers": {
    "marm": {
      "env": {
        "MARM_DB_PATH": "/shared/path/.marm/memory.db"
      }
    }
  }
}
```

---

### Issue 4: Memory Bloat

**Problem**: Database growing too large

**Solutions**:
1. Regular cleanup of old sessions
2. Archive infrequent memories
3. Summarize and compress old contexts
4. Periodic vacuum of SQLite database

---

### Issue 5: Slow Semantic Search

**Problem**: Recalls taking too long

**Optimizations**:
1. Index embeddings
2. Limit search scope
3. Cache frequent queries
4. Use more powerful hardware for embeddings

---

## Security and Privacy

### 1. Local Storage

**All memories stored locally** - no cloud sync by default

**Database Location**: `~/.marm/memory.db` (configurable)

**Encryption**: Consider encrypting database file at rest

---

### 2. Sensitive Information

**Be Careful Storing**:
- API keys
- Passwords
- Personal data
- Proprietary code

**Best Practice**: Store references, not actual secrets

---

### 3. Multi-User Environments

**Use Separate Databases** for different users/projects

```bash
--database-path ~/.marm/project_a.db
--database-path ~/.marm/project_b.db
```

---

### 4. Backup Strategy

**Regular Backups** of memory database:
```bash
sqlite3 ~/.marm/memory.db ".backup '~/backups/marm_backup.db'"
```

---

## Integration Patterns

### Pattern 1: Cross-Session Project Context
```
Day 1:
1. Start new project session
2. Make architectural decisions
3. Log them with marm_contextual_log

Day 2:
4. marm_smart_recall "What database did we choose?"
5. Continue work with full context
```

### Pattern 2: Team Knowledge Sharing
```
1. Create shared MARM database
2. Each developer logs decisions
3. AI recalls collective knowledge
4. Reduces repeated discussions
```

### Pattern 3: Learning Journal
```
1. Log lessons learned after each task
2. Create summaries weekly
3. Build notebooks from patterns
4. Recall when facing similar problems
```

### Pattern 4: Multi-Client Workflow
```
Cursor (morning):
1. Code with MARM context

Claude Desktop (afternoon):
2. Same MARM database
3. AI remembers morning decisions

VS Code (evening):
3. Continue with full context
```

---

## Example Prompts for Developers

### Memory Creation
```
"Remember that we're using React 18 with Vite"

"Log this API design decision: RESTful over GraphQL due to team familiarity"

"Store this deployment procedure in a notebook"

"Create a summary of today's architecture decisions"
```

### Memory Recall
```
"What did I decide about error handling?"

"Show me all decisions related to authentication"

"When did I last work on the payment integration?"

"What configuration did I use for the database?"
```

### Session Management
```
"Start a new session for the mobile app refactor"

"Switch to my API development session"

"Clear current session and start fresh"

"Show me all my active sessions"
```

---

## Best Practices for Junior Developers

### 1. Be Specific When Logging

```
# Bad
"Using database"

# Good
"Using PostgreSQL 15 with pgvector extension for vector similarity search"
```

### 2. Create Topic-Based Sessions

Organize memories by project or feature:
- `project_a_backend`
- `mobile_app_ui`
- `payment_integration`

### 3. Regular Summaries

End each work session with summary:
```
"Summarize today's progress on the API"
```

### 4. Use Notebooks for Procedures

Save reusable workflows:
- Deployment checklists
- Testing procedures
- Code review guidelines

### 5. Cross-Reference Related Memories

Use `marm_context_bridge` to link related work

### 6. Clean Up Old Sessions

Archive or delete sessions from completed projects

---

## Performance Tuning

### Database Optimization
```sql
-- Vacuum database monthly
VACUUM;

-- Analyze for better query planning
ANALYZE;

-- Add indexes for common queries
CREATE INDEX idx_timestamp ON memories(timestamp);
CREATE INDEX idx_category ON memories(category);
```

### Embedding Cache
Cache embeddings for frequently recalled queries

### Batch Operations
Insert multiple memories at once for better performance

---

## Comparison: MARM vs Native AI Memory

| Feature | MARM | Native (Claude Projects, etc.) |
|---------|------|-------------------------------|
| Cross-application | ✅ Yes | ❌ No |
| Semantic search | ✅ Yes | ⚠️ Limited |
| Structured logging | ✅ Yes | ❌ No |
| Notebooks | ✅ Yes | ❌ No |
| Local storage | ✅ Yes | ⚠️ Cloud-based |
| Control | ✅ Full | ⚠️ Limited |

---

## Advanced Features

### Custom Embedding Models

Replace default model with better one:
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-mpnet-base-v2')  # Better quality
# or
model = SentenceTransformer('all-MiniLM-L12-v2')  # Faster
```

### API Integration

MARM provides REST API for custom integrations:
```bash
POST /api/memory/add
GET /api/memory/search?query=authentication
GET /api/sessions/list
```

### Webhook Support

Trigger actions on memory events:
- Memory added
- Session started
- Summary generated

---

## Additional Resources

- [MARM GitHub Repository](https://github.com/Lyellr88/MARM-Systems)
- [MARM Documentation on Glama](https://glama.ai/mcp/servers/@Lyellr88/marm-mcp/)
- [MCP Market: MARM](https://mcpmarket.com/server/marm)
- [YouTube: Perfect Memory for Qwen-3](https://www.youtube.com/watch?v=mi2KmpV3Wvg)
- [PyPI: marm-mcp-server](https://libraries.io/pypi/marm-mcp-server)

---

*Last Updated: October 2025*
