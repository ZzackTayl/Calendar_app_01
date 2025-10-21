# PostgreSQL MCP Server - Complete Guide

## Overview

The PostgreSQL MCP Server is a lightweight server (mcp-postgres-server) that serves as a simple intermediary, allowing AI agents to query and interact with PostgreSQL databases through natural language[6][12][15][22].

**Package Name**: `mcp-postgres-server` (Anton O's implementation)  
**Protocol**: Model Context Protocol (MCP) via STDIO  
**Primary Use Case**: Development environments with SELECT-heavy workloads

---

## Multiple Implementations

There are several PostgreSQL MCP server implementations available:

### 1. Anton O's Lightweight Server
- **Package**: `mcp-postgres-server`
- **Focus**: Simple, fast, basic operations
- **Best For**: Quick setup, development environments

### 2. Postgres MCP Pro (CrystalDBA)[9]
- **Features**: Configurable read/write access, index tuning, explain plans, health checks
- **Focus**: Full DBA capabilities
- **Best For**: Production support, performance optimization

### 3. XiYan MCP Server
- **Features**: Text-to-SQL model integration
- **Focus**: Natural language queries
- **Best For**: Non-technical users, data analysis

---

## Installation and Setup

### Prerequisites
- PostgreSQL database (local or remote)
- Node.js and npm installed
- Database connection credentials

### Installation
```bash
npm install -g mcp-postgres-server
```

### Connection String Format
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

**Examples**:
- Local: `postgresql://postgres:password@localhost:5432/mydb`
- Remote: `postgresql://user:pass@db.example.com:5432/production`

### Configuration Examples

#### Claude Desktop
Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-postgres-server",
        "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
      ]
    }
  }
}
```

#### Cursor
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-postgres-server",
        "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
      ]
    }
  }
}
```

---

## Complete Command Reference

### 1. query

**Purpose**: Fetch data or perform analysis using read operations

**Example**:
```
Fetch the names of the top 10 users who signed up last month
```

**Translated SQL**:
```sql
SELECT name, created_at 
FROM users 
WHERE created_at >= NOW() - INTERVAL '1 month'
ORDER BY created_at DESC 
LIMIT 10;
```

**Warning**: Primarily intended for SELECT statements

**When to Use**:
- Data exploration and analysis
- Generating reports
- Debugging data issues
- Schema discovery queries

**Best Practice**: Use this for all read operations in production environments

**Security**: Safest command - no data modification risk

---

### 2. execute

**Purpose**: Modify data - use only in trusted development environments

**Example**:
```
Update the status column to 'completed' for all tasks older than 7 days
```

**Translated SQL**:
```sql
UPDATE tasks 
SET status = 'completed' 
WHERE created_at < NOW() - INTERVAL '7 days' 
  AND status != 'completed';
```

**⚠️ CRITICAL WARNING**: Risk of SQL Injection exists

**Security Measures**:
- Use prepared statements with parameterized queries
- Server supports PostgreSQL $1, $2 parameters to mitigate SQL injection[12]
- Do NOT use in production without robust security reviews
- Implement strict input validation
- Log all execute commands for audit

**When to Use**:
- Development and testing environments only
- Data migrations (with extreme caution)
- Administrative tasks in controlled settings

**Best Practice**: Never expose execute command to production AI agents

---

### 3. list_schemas

**Purpose**: Inspect database structure and understand organizational units

**Example**:
```
List all available schemas in the current database connection
```

**Output Example**:
```
public
auth
extensions
storage
```

**Warning**: Discovery tool - read-only

**When to Use**:
- Initial database exploration
- Understanding multi-schema architectures
- Preparing for schema-specific queries
- Documentation generation

---

### 4. list_tables

**Purpose**: Quickly monitor the tables in your local environment

**Example**:
```
What tables are in my database?
```

**Output Example**:
```
users
posts
comments
likes
notifications
```

**Warning**: Discovery tool - read-only

**When to Use**:
- Database exploration
- Verifying migrations
- Understanding data structure
- Generating ERD documentation

**Pro Tip**: Combine with describe_table for complete schema understanding

---

### 5. describe_table

**Purpose**: Ensure AI has schema awareness before generating SQL queries

**Example**:
```
Show me the structure of the users table
```

**Output Example**:
```
Table: users
Columns:
  id: bigint (PRIMARY KEY)
  email: varchar(255) (NOT NULL, UNIQUE)
  name: varchar(100)
  created_at: timestamp with time zone (DEFAULT NOW())
  updated_at: timestamp with time zone
  status: varchar(20) (DEFAULT 'active')
Indexes:
  users_pkey: PRIMARY KEY (id)
  users_email_idx: UNIQUE (email)
```

**Warning**: Provides column names, data types, constraints, and indexes

**When to Use**:
- Before generating complex queries
- Understanding data types for proper comparisons
- Identifying indexes for query optimization
- Planning schema modifications

**Pro Tip from Community**[12]:
> "Feed the whole schema at once for AI to write accurate queries using describe_table"

---

## Advanced Features (Postgres MCP Pro)

### Index Tuning
- Analyzes query patterns
- Suggests missing indexes
- Identifies unused indexes
- Provides EXPLAIN plans

### Health Checks
- Connection pool monitoring
- Slow query identification
- Database size metrics
- Table bloat analysis

### Explain Plans
- Query performance analysis
- Execution plan visualization
- Optimization recommendations

---

## Social Listening: How Developers Use PostgreSQL MCP

### Real-World Feedback

**From Reddit r/ClaudeAI**[12]:
> "Pro-tip: Feed the whole schema at once for AI to write accurate queries using describe_table"

> "The server supports prepared statement parameters (PostgreSQL $1, $2) to mitigate SQL injection"

**From AI Engineer's Deep Dive**[15]:
> "Postgres MCP Pro provides index tuning, explain plans, health checks - built to support the entire development process"

**From Gaurav Bytes**[21]:
> "Building a PostgreSQL MCP Server for AI Agents requires careful component architecture: connection pooling, query execution engine, schema introspection, and robust error handling"

**From Dev.to**[22]:
> "Introducing Postgres MCP Server: Query Your Database in Plain English with AI - the natural language interface removes SQL barriers for non-technical users"

### Common Use Cases

**1. Data Analysis Workflows**
- "Show me top customers by revenue this quarter"
- "Analyze user churn patterns by cohort"
- "Generate summary statistics for product categories"

**2. Schema Exploration**
- "What tables contain user data?"
- "Show me all foreign key relationships"
- "List tables with most columns"

**3. Development Debugging**
- "Find users with invalid email formats"
- "Show me orphaned records without parent references"
- "Identify duplicate entries in orders table"

---

## Common Issues and Troubleshooting

### Issue 1: SQL Injection Risk

**Problem**: AI-generated queries may contain user input without proper sanitization

**Solution**:
```javascript
// BAD - Vulnerable to injection
const query = `SELECT * FROM users WHERE email = '${userInput}'`;

// GOOD - Use parameterized queries
const query = 'SELECT * FROM users WHERE email = $1';
const values = [userInput];
```

**Best Practice**: Always use prepared statements with parameters

---

### Issue 2: Connection String Format

**Problem**: "Could not connect to database" errors

**Common Mistakes**:
- Missing port number
- Incorrect password encoding (special characters)
- Wrong database name
- SSL mode not specified

**Solution**:
```bash
# Encode special characters in password
postgresql://user:p%40ssw0rd@host:5432/db

# Add SSL requirement
postgresql://user:pass@host:5432/db?sslmode=require

# Specify connection timeout
postgresql://user:pass@host:5432/db?connect_timeout=10
```

---

### Issue 3: Supabase Regional Issues

**Problem**: "Tenant not found" errors when connecting to Supabase

**Root Cause**: Incorrect or missing REGION environment variable

**Solution**:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "mcp-postgres-server"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_KEY": "your-anon-key",
        "REGION": "us-east-1"
      }
    }
  }
}
```

**Note**: REGION must match your Supabase project's actual region[32]

---

### Issue 4: Performance with Large Result Sets

**Problem**: Queries hang or timeout with large datasets

**Solutions**:
1. **Add LIMIT clauses**:
```sql
SELECT * FROM large_table LIMIT 100;
```

2. **Use pagination**:
```sql
SELECT * FROM large_table 
ORDER BY id 
LIMIT 50 OFFSET 100;
```

3. **Aggregate instead of fetching all rows**:
```sql
SELECT category, COUNT(*), AVG(price) 
FROM products 
GROUP BY category;
```

---

### Issue 5: Permission Errors

**Problem**: "permission denied for table" errors

**Root Cause**: Database user lacks necessary permissions

**Solution**:
```sql
-- Grant SELECT on all tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO username;

-- Grant specific permissions
GRANT SELECT, INSERT, UPDATE ON specific_table TO username;

-- For read-only access (recommended for AI)
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE mydb TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

---

## Security Best Practices

### 1. Read-Only Access for Production[71]

**Always use read-only database roles for AI agents in production**:

```sql
CREATE ROLE ai_agent_readonly WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE production_db TO ai_agent_readonly;
GRANT USAGE ON SCHEMA public TO ai_agent_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ai_agent_readonly;

-- Ensure future tables also get SELECT
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT ON TABLES TO ai_agent_readonly;
```

### 2. Network-Level Protection

```sql
-- PostgreSQL pg_hba.conf
# Only allow connections from specific IP
host    all    ai_agent_readonly    10.0.1.50/32    scram-sha-256

# Require SSL
hostssl all    ai_agent_readonly    0.0.0.0/0       scram-sha-256
```

### 3. Query Timeout Limits

```sql
-- Set statement timeout for role
ALTER ROLE ai_agent_readonly SET statement_timeout = '30s';

-- Per-session timeout
SET statement_timeout = '30s';
```

### 4. Audit Logging

```sql
-- Enable query logging for AI agent role
ALTER ROLE ai_agent_readonly SET log_statement = 'all';
```

### 5. Row-Level Security (RLS)

```sql
-- Enable RLS on sensitive table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for AI agent
CREATE POLICY ai_agent_read ON users
FOR SELECT TO ai_agent_readonly
USING (status = 'active' AND is_public = true);
```

---

## Integration Patterns

### Pattern 1: Schema-First Analysis

```
1. Run list_schemas to understand database structure
2. Run list_tables to see available tables
3. Run describe_table on relevant tables
4. Execute targeted query with full schema context
```

**Benefits**: AI generates accurate queries with proper column names and types

### Pattern 2: Exploratory Analysis

```
1. Start with broad query: "What data is available?"
2. Refine based on results: "Show me more details about X"
3. Generate insights: "Compare X vs Y over time"
```

**Benefits**: Natural conversation flow, progressive refinement

### Pattern 3: Automated Reporting

```
1. Define template queries with parameters
2. AI fills parameters based on user request
3. Execute query and format results
4. Generate summary insights
```

**Benefits**: Consistent output, reduced error rate

---

## Example Prompts for Junior Developers

### Exploration Prompts

```
"Show me all tables and their row counts"

"Describe the structure of the users table"

"List all foreign key relationships in the database"

"Find tables with more than 1 million rows"
```

### Analysis Prompts

```
"Calculate average order value by customer segment"

"Show me daily active users for the last 30 days"

"Identify users who haven't logged in for 90 days"

"Generate revenue breakdown by product category"
```

### Debugging Prompts

```
"Find records in orders table without matching users"

"Show me duplicate email addresses in users table"

"List all NULL values in required columns"

"Identify products with invalid price values"
```

---

## Best Practices for Junior Developers

### 1. Always Start with describe_table
Before querying data, understand the schema structure to avoid errors

### 2. Use LIMIT in Development
Never run `SELECT * FROM large_table` without LIMIT clause

### 3. Test Queries Incrementally
Start with simple queries, add complexity gradually

### 4. Understand Your Permissions
Know what operations your database role can perform

### 5. Monitor Query Performance
Use EXPLAIN to understand query execution plans

### 6. Handle NULLs Explicitly
PostgreSQL NULLs behave differently than empty strings

### 7. Use Transactions for Multiple Updates
```sql
BEGIN;
UPDATE table1 SET ...;
UPDATE table2 SET ...;
COMMIT; -- or ROLLBACK if error
```

---

## Additional Resources

- [Official PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Postgres MCP Pro GitHub](https://github.com/crystaldba/postgres-mcp)
- [Anton O's PostgreSQL MCP Server](https://www.npmjs.com/package/mcp-postgres-server)
- [Supabase PostgreSQL MCP Integration](https://supabase.com/blog/mcp-server)
- [SQL Injection Prevention Guide](https://owasp.org/www-community/attacks/SQL_Injection)

---

*Last Updated: October 2025*
