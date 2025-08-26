# 🚨 CRITICAL PRODUCTION SAFETY RULES 🚨

## ❌ ABSOLUTELY FORBIDDEN IN PRODUCTION

### ruv-swarm is DEVELOPMENT ONLY
- **NEVER deploy ruv-swarm to production**
- **ruv-swarm BREAKS Vercel deployments** 
- **Causes build failures and 404 errors**
- **Is a LOCAL DEVELOPMENT TOOL ONLY**

### Immediate Action Required
If you see ANY ruv-swarm related files in production:
1. **IMMEDIATELY disable all ruv-swarm settings**
2. **Remove all ruv-swarm files from the repository**
3. **Revert any commits that enabled ruv-swarm features**
4. **Deploy the fix immediately**

## ✅ Safe Development vs ❌ Production

### Development (Local Only):
```bash
# OK for local development
export RUV_SWARM_HOOKS_ENABLED=false  # Even in dev, keep disabled for safety
npx ruv-swarm mcp start  # Local coordination only
```

### Production (Vercel/Public):
```bash
# NEVER in production
export RUV_SWARM_HOOKS_ENABLED=false  # MUST be false
# NO ruv-swarm commands
# NO ruv-swarm files
# NO ruv-swarm configuration
```

## 🛡️ Protection Measures

### .gitignore blocks:
- All ruv-swarm files and directories
- Any swarm-related configurations
- Development-only tools

### Settings Safety:
- `RUV_SWARM_HOOKS_ENABLED: "false"` always
- Production warnings in configuration
- Deployment guards in place

## 🚨 Emergency Protocol

If production fails due to ruv-swarm:
1. Set `RUV_SWARM_HOOKS_ENABLED: "false"`
2. Remove all ruv-swarm related files
3. Commit and deploy immediately
4. Check deployment succeeds before any other work

**Remember: ruv-swarm is a development coordination tool that must NEVER reach production servers.**