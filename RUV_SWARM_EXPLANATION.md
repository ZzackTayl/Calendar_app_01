# RUV-Swarm: External MCP Tool (Not Project Dependency)

## What is RUV-Swarm?

**RUV-Swarm is an external MCP (Model Context Protocol) tool** that you use in Cursor/Claude for AI coding assistance. It's **NOT** meant to be integrated into your actual project codebase.

## Why It Was Removed

Your project had ruv-swarm incorrectly integrated because:

1. **AI assistants were running `npx ruv-swarm` commands** (as shown in your documentation)
2. **`npx` automatically installed ruv-swarm locally** when it wasn't found globally
3. **The package got added to `package.json` dependencies** (probably by an AI assistant trying to "fix" the missing dependency)
4. **This caused production deployment failures** because external tools shouldn't be in your project

## How to Use RUV-Swarm Properly

### In Cursor/Claude (External Tool)
```bash
# Install globally (not in your project)
npm install -g ruv-swarm

# Use as external MCP tool
npx ruv-swarm mcp start
```

### In Your Project (Don't Do This)
```bash
# ❌ DON'T: Install in your project
npm install ruv-swarm

# ❌ DON'T: Add to package.json dependencies
# ❌ DON'T: Import in your code
# ❌ DON'T: Run from project scripts
```

## What Was Removed

### Files Removed
- `ruv-swarm-fix.js` - External tool integration
- `suppress-warnings.js` - External tool integration  
- `ruv-swarm-wrapper*` - External tool wrappers
- `claude-swarm.*` - External tool integration files

### Package.json Changes
- ❌ Removed `ruv-swarm` from dependencies
- ❌ Removed all ruv-swarm related npm scripts
- ❌ Removed neural/swarm scripts that used ruv-swarm
- ✅ Clean, production-ready package.json

### Next.js Configuration
- ❌ Removed ruv-swarm webpack configuration
- ✅ Clean, standard Next.js config

## Benefits of This Fix

1. **🎯 Proper Separation**: External tools stay external
2. **🚀 Faster Builds**: No external tool processing
3. **📦 Smaller Bundles**: No unnecessary dependencies
4. **🔧 No Conflicts**: Clean dependency tree
5. **🛡️ Production Ready**: No external tool dependencies

## Using RUV-Swarm Going Forward

### For AI Coding Assistance
- Install globally: `npm install -g ruv-swarm`
- Use in Cursor/Claude as external MCP tool
- Keep it separate from your project codebase

### For Your Project
- Focus on your actual application code
- Keep dependencies clean and minimal
- Don't integrate external AI tools into your project

## Summary

**RUV-Swarm is an external AI coding tool, not a project dependency.** It should be used alongside your development environment (Cursor/Claude) but not integrated into your actual project code. This fix ensures your project remains clean and production-ready while still allowing you to use RUV-Swarm for AI assistance when needed.
