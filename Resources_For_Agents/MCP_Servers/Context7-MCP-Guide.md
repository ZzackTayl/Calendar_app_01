# Context7 MCP Server - Complete Guide

## Overview

Context7 MCP provides up-to-date code documentation for any prompt by fetching the latest documentation from official sources[104][106]. It solves the problem of LLMs having outdated or incomplete knowledge about frameworks and libraries.

**Developer**: Upstash  
**Package**: `@upstash/context7`  
**Purpose**: Real-time documentation retrieval for accurate coding assistance  
**Key Feature**: Always current - pulls from official docs, not training data

---

## Installation and Setup

### Via npm
```bash
npx @upstash/context7
```

### Configuration

#### Cursor
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7"]
    }
  }
}
```

#### Claude Desktop
Add to config:
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["@upstash/context7"]
    }
  }
}
```

#### VS Code
Add to MCP settings:
```json
{
  "servers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7"]
    }
  }
}
```

---

## How Context7 Works

### The Problem It Solves[106]

**LLM Training Data is Outdated**:
- Models trained months/years ago
- Don't know about latest framework versions
- Miss recent API changes
- Suggest deprecated patterns

**Context7's Solution**:
- Fetches current documentation in real-time
- Pulls from official sources (GitHub, docs sites)
- Provides up-to-date context for any library
- Injects fresh docs into LLM context window

---

## Complete Command Reference

### 1. search-docs

**Purpose**: Search official documentation for specific topics

**Example**:
```
Search React documentation for useEffect hook
```

**Parameters**:
- `library`: Framework/library name (e.g., "react", "next.js")
- `query`: What to search for

**When to Use**:
- Learning new APIs
- Verifying syntax
- Finding best practices
- Checking latest features

**Output**: Relevant documentation snippets with source links

---

### 2. get-latest-docs

**Purpose**: Fetch latest documentation for a specific library

**Example**:
```
Get the latest Next.js 14 app router documentation
```

**Parameters**:
- `library`: Library name
- `version`: (Optional) Specific version

**When to Use**:
- Starting new project
- Upgrading framework version
- Ensuring current knowledge
- Avoiding deprecated patterns

---

### 3. fetch-api-reference

**Purpose**: Retrieve API reference for specific functions/components

**Example**:
```
Fetch API reference for Next.js Image component
```

**Parameters**:
- `library`: Framework name
- `api`: Specific API or component name

**When to Use**:
- Understanding API parameters
- Checking available options
- Learning component props
- Verifying type signatures

---

### 4. check-version

**Purpose**: Check latest available version of a library

**Example**:
```
What's the latest version of React?
```

**Parameters**:
- `library`: Library to check

**When to Use**:
- Planning upgrades
- Checking compatibility
- Security updates
- Feature availability

---

### 5. get-migration-guide

**Purpose**: Fetch migration guides for version upgrades

**Example**:
```
Show me the migration guide for React 18 to React 19
```

**Parameters**:
- `library`: Library name
- `from_version`: Current version
- `to_version`: Target version

**When to Use**:
- Planning upgrades
- Understanding breaking changes
- Migration strategy
- Code modernization

---

### 6. search-examples

**Purpose**: Find code examples from official documentation

**Example**:
```
Find examples of server components in Next.js
```

**Parameters**:
- `library`: Framework name
- `topic`: What to find examples for

**When to Use**:
- Learning by example
- Implementation guidance
- Best practice patterns
- Quick prototyping

---

### 7. get-changelog

**Purpose**: Retrieve recent changes and updates

**Example**:
```
Show me the latest changes in Tailwind CSS
```

**Parameters**:
- `library`: Library name
- `limit`: (Optional) Number of recent versions

**When to Use**:
- Staying updated
- Tracking new features
- Bug fix awareness
- Release planning

---

## Supported Frameworks and Libraries

Context7 supports major frameworks[106]:

### Frontend
- React
- Next.js
- Vue.js
- Nuxt
- Svelte
- SvelteKit
- Angular
- Solid.js

### Backend
- Node.js
- Express
- Fastify
- NestJS
- Hono

### Databases
- PostgreSQL
- MongoDB
- Redis
- Prisma
- Drizzle ORM

### Utilities
- TypeScript
- Tailwind CSS
- Zod
- tRPC

### And Many More...
Context7 can fetch docs for any library with public documentation

---

## Social Listening: Real-World Usage

### From Claude MCP[106]

> "Up-to-date Docs For Any Prompt - Context7 MCP ensures your AI assistant has the latest documentation, not outdated training data"

**Key Benefits Highlighted**:
- Always current information
- Reduces hallucinations
- Accurate API usage
- Latest best practices

### Community Feedback

**Common Use Cases**:
1. "Show me the latest Next.js 15 features"
2. "What's changed in React Server Components?"
3. "How do I use the new App Router in Next.js?"
4. "Migration guide from Vue 2 to Vue 3"

---

## Common Issues and Troubleshooting

### Issue 1: Documentation Not Found

**Problem**: Context7 can't find docs for a library

**Root Causes**:
- Library too new/obscure
- Typo in library name
- Documentation not publicly available

**Solution**:
```
Try variations of the library name:
- "nextjs" vs "next.js"
- "reactjs" vs "react"
- Check official package name on npm
```

---

### Issue 2: Outdated Documentation Returned

**Problem**: Docs seem outdated despite Context7

**Root Cause**: Cache not refreshed

**Solution**: Context7 automatically fetches fresh docs, but you can force refresh:
```
"Clear cache and fetch latest React documentation"
```

---

### Issue 3: Rate Limiting

**Problem**: Too many documentation requests

**Root Cause**: Hitting API limits

**Solution**: 
- Space out requests
- Be specific about what you need
- Cache frequently used docs locally

---

### Issue 4: Large Context Window Consumption

**Problem**: Documentation consumes too many tokens

**Root Cause**: Fetching entire documentation sets

**Solution**: Be specific in queries:
```
Bad: "Get all Next.js docs"
Good: "Get Next.js Image component documentation"
```

---

## Integration Patterns

### Pattern 1: Just-in-Time Documentation
```
1. Start coding task
2. AI detects unknown API
3. Context7 fetches current docs
4. AI generates correct code
```

### Pattern 2: Migration Assistant
```
1. "I'm upgrading from Next.js 13 to 14"
2. Context7 fetches migration guide
3. AI suggests code changes
4. Review and apply changes
```

### Pattern 3: Learning New Framework
```
1. "I want to build with Svelte"
2. Context7 provides getting started docs
3. AI explains concepts with examples
4. Build with confidence
```

### Pattern 4: API Verification
```
1. AI suggests code using library
2. Context7 verifies API exists
3. Confirms parameters correct
4. Prevents deprecated usage
```

---

## Best Practices

### 1. Be Specific with Library Names
```
Good: "Get React useEffect documentation"
Bad: "Get docs about effects"
```

### 2. Include Version When Relevant
```
"Fetch Next.js 14 App Router documentation"
```

### 3. Ask for Specific APIs
```
"Show me the Next.js Image component props"
```

### 4. Check Latest Before Starting
```
"What's the latest stable version of Vue?"
```

### 5. Use for Breaking Changes
```
"What breaking changes in Tailwind CSS v4?"
```

### 6. Leverage Examples
```
"Find examples of React Server Actions"
```

---

## Comparison: Context7 vs Static Knowledge

| Aspect | Context7 | LLM Training Data |
|--------|----------|------------------|
| Currency | ✅ Always current | ❌ Months/years old |
| Accuracy | ✅ From official source | ⚠️ May be outdated |
| Coverage | ✅ All public libraries | ⚠️ Limited to training |
| Breaking changes | ✅ Immediately aware | ❌ Doesn't know |
| New features | ✅ Available instantly | ❌ Wait for retraining |
| Migration guides | ✅ Latest guides | ❌ May not exist |

---

## Advanced Use Cases

### Documentation-Driven Development
Let Context7 guide implementation:
```
1. "I need to implement authentication"
2. Context7 fetches auth library docs
3. AI suggests implementation
4. Code generated with current patterns
```

### Framework Comparison
```
"Compare React Server Components vs Next.js Server Actions using latest docs"
```

### Security Updates
```
"Check if my React version has security issues and show upgrade path"
```

### Performance Optimization
```
"Show me latest performance best practices for Next.js 14"
```

---

## Context Window Management

### Token Budget Considerations

Context7 fetched docs consume tokens:
- Be selective about queries
- Request specific sections
- Use summaries when available
- Clear context between tasks

### Optimization Strategies
```
1. Start specific: "Next.js Image component props"
   Not general: "Next.js documentation"

2. Request summaries: "Summarize React 19 changes"
   Not full docs: "All React 19 documentation"

3. Sequential queries: Get what you need, when you need it
   Not bulk: Fetch everything upfront
```

---

## Integration with Other MCP Servers

### Combined with Dart MCP
```
1. Context7: Fetch Flutter widget docs
2. Dart MCP: Implement widget
3. Dart MCP: Hot reload
4. Context7: Check if using latest API
```

### Combined with GitHub MCP
```
1. Context7: Get latest framework version
2. GitHub MCP: Update package.json
3. GitHub MCP: Create PR
4. Context7: Fetch migration guide
```

---

## Example Workflows

### Starting New Project
```
1. "What's the latest Next.js version?"
2. "Show me the create-next-app command"
3. "Get started guide for Next.js 14 App Router"
4. "Show examples of server components"
```

### Debugging Issue
```
1. "My useEffect runs on every render"
2. Context7 fetches useEffect documentation
3. AI identifies dependency array issue
4. Suggests fix based on current best practices
```

### Learning New API
```
1. "I want to use React Server Actions"
2. Context7 provides latest Server Actions docs
3. AI explains with code examples
4. Implements feature correctly
```

---

## Best Practices for Junior Developers

### 1. Always Verify with Latest Docs
Don't trust old tutorials - use Context7 to verify

### 2. Check Version Compatibility
```
"Is this pattern compatible with React 18?"
```

### 3. Learn from Official Examples
```
"Show me official examples of this API"
```

### 4. Understand Breaking Changes
```
"What changed between version X and Y?"
```

### 5. Follow Migration Guides
```
"Guide me through upgrading from Next.js 13 to 14"
```

### 6. Stay Updated on Security
```
"Are there security updates for my dependencies?"
```

---

## Limitations

### 1. Requires Internet Connection
Cannot work offline - needs to fetch docs

### 2. Public Documentation Only
Cannot access private/internal documentation

### 3. Source Availability
Library must have publicly accessible docs

### 4. Token Consumption
Documentation fetching uses context window

---

## Additional Resources

- [GitHub: Upstash Context7](https://github.com/upstash/context7)
- [Claude MCP: Context7](https://www.claudemcp.com/servers/context7)
- [Upstash Blog: Introducing Context7](https://upstash.com/blog/context7)
- [MCP Registry: Context7](https://mcpmarket.com/server/context7)

---

*Last Updated: October 2025*
