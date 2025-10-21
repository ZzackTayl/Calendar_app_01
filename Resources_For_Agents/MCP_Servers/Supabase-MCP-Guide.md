# Supabase MCP Server - Complete Guide

## Overview

The Supabase MCP Server allows AI assistants to securely interact with Supabase projects - database management, authentication, and rapid application scaffolding[26][32][41][46].

**Hosting**: Remote at `https://mcp.supabase.com/mcp` or local via CLI at `http://localhost:54321/mcp`  
**Auth Method**: OAuth 2.0 (browser-based) - much simpler than manual PAT generation  
**Tool Count**: 20+ tools  
**Developer**: Supabase (Official)

---

## Why Supabase Built an MCP Server[26]

MCP standardizes how LLMs communicate with platforms. Before MCP, developers had to:
- Clone repos and set up configurations
- Remember file paths
- Keep servers updated manually
- Create and manage API tokens manually

**The Supabase MCP server solves these problems.**

---

## Installation and Setup

### Quick Setup (Most AI Clients)[26]

Add to your MCP configuration:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<personal-access-token>"
      ]
    }
  }
}
```

### Creating Personal Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate New Token"
3. Give it a descriptive name
4. Copy the token immediately (shown only once)
5. Replace `<personal-access-token>` in config

### Remote MCP (OAuth)[41]

**Preferred Method** for web-based AI agents like ChatGPT:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

**Benefits of OAuth**[32][41]:
- No manual PAT generation
- Stronger security model
- Better audit trails
- Easier to use

---

## Complete Tool/Command Reference

### Database Management Tools

#### 1. Query/Manage Database

**Purpose**: Rapid application scaffolding or adding features requiring schema modification

**Example**:
```
Add a 'due_date' column to the 'todos' table
```

**Translated SQL**:
```sql
ALTER TABLE todos ADD COLUMN due_date timestamp with time zone;
```

**⚠️ CRITICAL WARNING**: Never connect to production projects. Use development projects only[26][32]

**When to Use**:
- Building new features
- Schema modifications
- Data migrations in dev environment
- Prototyping database structures

**Security**: Always use Read-Only Mode if connecting to real data

---

#### 2. Design Tables and Track with Migrations

**Purpose**: Create and modify database schema with migration tracking

**Example**:
```
Create a new 'comments' table with id, user_id, post_id, content, and created_at columns
```

**Output**: Generated migration file + SQL execution

**When to Use**:
- Starting new projects
- Adding new features
- Database schema evolution
- Team collaboration on schema changes

---

#### 3. Fetch Data and Run Reports

**Purpose**: Query data for analysis and reporting

**Example**:
```
Show me the top 10 users by post count
```

**Translated SQL**:
```sql
SELECT user_id, COUNT(*) as post_count
FROM posts
GROUP BY user_id
ORDER BY post_count DESC
LIMIT 10;
```

**When to Use**:
- Data analysis
- Generating reports
- Debugging data issues
- Understanding data patterns

---

### Project Management Tools

#### 4. Fetch Project Configuration

**Purpose**: Retrieve project URLs, keys, and settings

**Example**:
```
Get the Supabase URL and anon key for my project
```

**Output**:
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
```

**Use Case**: Automatically configure `.env.local` files for Next.js or other frameworks[26]

---

#### 5. Spin Up New Supabase Projects

**Purpose**: Create new Supabase projects from AI

**Example**:
```
Create a new Supabase project called 'my-app-dev' in the us-east-1 region
```

**When to Use**:
- Starting new applications
- Creating development/staging environments
- Rapid prototyping

---

#### 6. Pause and Restore Projects

**Purpose**: Manage project lifecycle and costs

**Example**:
```
Pause the 'dev-testing' project
```

**When to Use**:
- Reducing costs for inactive projects
- Temporarily stopping development environments
- Resource management

---

### Database Branching Tools (Experimental)[26]

#### 7. Create Database Branches

**Purpose**: Spin up separate development databases for feature work

**Example**:
```
Create a new branch called 'feature-comments' from main
```

**When to Use**:
- Developing new features safely
- Testing schema migrations
- Experimenting without affecting main database
- Team members working on different features simultaneously

**Safety Feature**: If something goes wrong, easily reset branch to earlier version

---

### Development Tools

#### 8. Retrieve Logs

**Purpose**: Debug issues by accessing project logs

**Example**:
```
Show me the last 50 error logs from the API
```

**When to Use**:
- Debugging production issues
- Monitoring application health
- Investigating errors
- Performance troubleshooting

---

#### 9. Generate TypeScript Types

**Purpose**: Generate TypeScript types based on database schema

**Example**:
```
Generate TypeScript types for my database schema
```

**Output**: TypeScript interface definitions matching your database

**When to Use**:
- Setting up new TypeScript projects
- After schema modifications
- Ensuring type safety
- Improving developer experience

---

### Authentication Tools

#### 10. Handle Project Configuration

**Purpose**: Set up authentication, manage database schemas, handle project configurations

**Example**:
```
Set up email authentication and add users to the application
```

**When to Use**:
- Initial project setup
- Adding new auth providers
- Configuring security settings
- User management

---

### Feature Management

#### 11. Manage Feature Groups

**Purpose**: Enable/disable specific tool groups to reduce attack surface

**Example**:
```
Disable the 'storage' tools and enable only 'database query' tools
```

**Warning**: Tools can be enabled/disabled to limit LLM's actions[32]

**When to Use**:
- Customizing security for specific projects
- Reducing context pollution
- Limiting AI capabilities for safety
- Compliance requirements

**Available Groups**:
- Database queries
- Schema modifications
- Storage operations
- Auth management
- Project configuration

---

## Social Listening: Real-World Feedback

### From Supabase Blog[26][41]

> "Remote MCP solves limited client support - web-based AI agents like ChatGPT can now connect"

> "Authentication was clunky before - manual PAT generation added friction and had weaker security"

> "Setup was tricky - needed Node.js, correct version, OS-specific command modifications"

### From Reddit r/Supabase[38]

User feedback on AMA:
- "OAuth flow is much smoother than managing tokens"
- "Being able to create projects and configure auth from Cursor is game-changing"
- "Branching feature is incredible for safe development"

### From Builder.io[46]

Five things to try:
1. Query your database in natural language
2. Generate TypeScript types automatically
3. Create database migrations conversationally
4. Set up authentication providers
5. Branch databases for safe experimentation

---

## Common Issues and Troubleshooting

### Issue 1: Community Servers Deprecated[29][32][35]

**Problem**: Using Alexander Zuev's or Matt Arnold's community MCP servers

**Solution**: Migrate to official Supabase MCP server
- Official server brings maturity, security, and ease of use
- Community servers no longer maintained
- Use `@supabase/mcp-server-supabase@latest`

---

### Issue 2: Production Project Connected

**Problem**: Accidentally connected AI to production database

**⚠️ CRITICAL**: This is extremely dangerous

**Solution**:
1. Immediately disconnect the production project
2. Create development copy of database
3. Use Read-Only Mode if you must query production
4. Implement Project Scoping to restrict access

**Prevention**:
- Always use separate dev/staging projects
- Never share production credentials with AI tools
- Use database branching for development

---

### Issue 3: Region Variable Missing[32]

**Problem**: "Tenant not found" errors when connecting to Supabase

**Root Cause**: Missing or incorrect REGION environment variable

**Solution**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_URL": "https://xxx.supabase.co",
        "SUPABASE_KEY": "your-anon-key",
        "REGION": "us-east-1"
      }
    }
  }
}
```

**Note**: REGION must match your Supabase project's actual region

---

### Issue 4: Node.js Version Conflicts[32]

**Problem**: Server fails to start due to Node.js version incompatibility

**Solution**:
- Ensure Node.js 18+ is installed
- Use nvm to manage multiple Node versions
- Update npm to latest version

```bash
nvm install 18
nvm use 18
npm install -g npm@latest
```

---

### Issue 5: Windows Command Issues[26]

**Problem**: MCP server commands fail on Windows

**Solution**: Prefix commands with `cmd /c`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<token>"
      ]
    }
  }
}
```

---

## Security Best Practices

### 1. Never Connect to Production[26][32]

**Always use development projects for AI interactions**

Create separate environments:
```bash
# Create dev project
supabase projects create my-app-dev

# Branch from production (schema only, no data)
supabase db branch create feature-work --from production
```

---

### 2. Use Read-Only Mode for Real Data[32]

If you must query production:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<token>",
        "--read-only"
      ]
    }
  }
}
```

---

### 3. Project Scoping[32]

Restrict AI access to specific projects:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--access-token",
        "<token>",
        "--project-id",
        "abc123def456"
      ]
    }
  }
}
```

---

### 4. Use OAuth When Possible[41]

OAuth provides:
- Better security model
- Clearer audit trails
- Easier token rotation
- Automatic permission scoping

---

### 5. Feature Group Restrictions[32]

Disable dangerous tools:
```
"Disable all schema modification tools, only enable database queries"
```

This limits what AI can do to your database.

---

## Future Roadmap[26]

### Native Authorization (Coming Soon)
- OAuth 2 login flow instead of manual PAT
- Open browser for Supabase login
- Automatic authentication
- Better security and user experience

### Better Schema Discovery
- Expanded beyond `list_tables`
- Access to views, triggers, functions, policies
- More structured query methods
- Reduced token usage

### More Protections
- Auto-detecting destructive operations
- Requiring confirmation before executing
- Enhanced database branching
- Automatic rollback capabilities

### Edge Functions Support
- Create Edge Functions from AI
- Deploy directly from chat
- Edit existing functions
- Manage function configurations

---

## Integration Patterns

### Pattern 1: Full Stack App Scaffolding
```
1. "Create a new Supabase project for my blog app"
2. "Design tables for users, posts, and comments with proper relationships"
3. "Set up email authentication"
4. "Generate TypeScript types"
5. "Show me the .env.local configuration"
```

### Pattern 2: Safe Feature Development
```
1. "Create a database branch called 'add-user-profiles'"
2. "Add a profiles table with avatar_url, bio, and website fields"
3. "Test some queries against the new schema"
4. "If good, merge branch to main"
```

### Pattern 3: Data Analysis
```
1. "Connect to my dev project in read-only mode"
2. "Show me user growth trends over last 30 days"
3. "Identify users who haven't logged in for 90 days"
4. "Generate a CSV report of these insights"
```

---

## Example Prompts for Developers

### Setup Prompts
```
"Create a new Supabase project called 'my-saas-app' in us-west-2"

"Set up Google OAuth authentication for my project"

"Generate TypeScript types for my database schema"

"Show me my project's Supabase URL and anon key"
```

### Development Prompts
```
"Add a 'premium' boolean column to the users table"

"Create a posts table with title, content, author_id, and created_at"

"Set up Row Level Security so users can only see their own posts"

"Create a database branch for testing the new comments feature"
```

### Query Prompts
```
"Show me all users who signed up in the last 7 days"

"Count the number of posts per user"

"Find users with incomplete profiles"

"Generate a report of most active users this month"
```

---

## Best Practices for Junior Developers

### 1. Always Use Development Projects
Never let AI touch production data

### 2. Start with Schema Design
Let AI help design your database schema before writing code

### 3. Use TypeScript Type Generation
Keep types in sync with database automatically

### 4. Leverage Database Branching
Experiment safely without fear of breaking things

### 5. Read-Only Mode for Learning
Connect to sample projects in read-only mode to learn SQL

### 6. Review AI-Generated Migrations
Always review migrations before applying to understand changes

---

## Additional Resources

- [Supabase MCP Server Announcement](https://supabase.com/blog/mcp-server)
- [Remote MCP Server Announcement](https://supabase.com/blog/remote-mcp-server)
- [Builder.io: Five Things to Try](https://www.builder.io/blog/supabase-mcp)
- [Official Documentation](https://supabase.com/docs/guides/mcp)
- [GitHub Repository](https://github.com/supabase/mcp-server-supabase)

---

*Last Updated: October 2025*
