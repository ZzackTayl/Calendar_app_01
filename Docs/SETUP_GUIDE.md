# PolyHarmony Setup Guide ⭐ (Enhanced Security & Monitoring)

This guide reflects the enhanced project state with production-grade security, comprehensive monitoring, and zero configuration drift between development and production environments.

## Quick Start (Web)

```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

If `.env.local` is missing or contains placeholder values, the app runs in demo mode automatically.

## Environment Variables (Enhanced Security Setup)

### **Production Environment Variables** ⭐
For production deployment with full security:

```bash
# Supabase (Required for production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security (Critical for production)
ENCRYPTION_KEY=your-64-character-hex-key
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-chars
NEXTAUTH_URL=https://your-production-domain.com

# Monitoring
PROMETHEUS_ENABLED=true
LOG_LEVEL=info

# Database Security
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

### **Development Environment Variables**
For development with full security testing:

```bash
# Database (Docker)
DATABASE_URL=postgresql://postgres:password@localhost:5432/polyharmony_dev

# Supabase (Optional - falls back to demo mode)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000/api/auth
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key

# Development Overrides
SKIP_ENV_VALIDATION=true
NEXT_PUBLIC_DEV_AUTH_BYPASS=false
ENABLE_DEBUG_LOGGING=true
```

### **Demo Mode**
If Supabase credentials are missing, the app automatically runs in demo mode with:
- Local data persistence via `localStorage`
- Mock authentication system
- Sample data for testing all features
- Full privacy system functionality

## Demo/Offline Mode
- Local persistence via `localStorage` managed by `lib/demo-store.ts`.
- Seed/reset from Settings → Data & Privacy.
- Demo quick action: Create Sample Group with first two relationships and navigate to members page.
- JSON data export available from Settings (demo and real backends use different code paths).

## Enhanced Docker Setup ⭐ (Production Parity)

### **Docker Benefits**
- **Zero Configuration Drift**: Identical dev/prod environments
- **Complete Security Stack**: PostgreSQL, Redis, monitoring included
- **Production-Grade Features**: Health checks, resource limits, security hardening
- **Monitoring Ready**: Built-in metrics collection and alerting

### **Quick Docker Setup**
```bash
# Start complete development environment with security
make dev
# → App: http://localhost:3000
# → Email testing: http://localhost:8025
# → Database: localhost:5432
# → Redis cache: localhost:6379
# → Monitoring: Health checks active
```

### **Docker Security Features** ⭐
- **Container Hardening**: Read-only filesystems, resource limits
- **Non-root Containers**: Security best practices enforced
- **Health Monitoring**: Automated health checks and recovery
- **Encrypted Connections**: SSL/TLS for all database connections
- **Audit Logging**: Comprehensive security event tracking

## Supabase Setup (Optional - Enhanced Security)
1. Create a Supabase project with enhanced security settings
2. Apply the schema with Row Level Security (RLS) policies
   - All user data tables protected with RLS
   - Relationship-aware access controls
   - Audit logging enabled
3. Configure environment variables with SSL encryption

### **Enhanced Security Features**
- **SSL-Required Connections**: All database connections encrypted
- **Row Level Security**: Database-level access control
- **Connection Pooling**: Efficient database connection management
- **Audit Trail**: All data access logged for compliance

Recommended indexes for production:
- `relationships(user_id, relationship_type)`
- `events(owner_id, start_time, privacy_level)`
- `user_profiles(user_id, created_at)`
- `calendar_events(user_id, start_time, end_time)`

## Performance Configuration
- `next.config.js`: images optimization, compression, SWC minify, CSS/package optimizations; optional bundle analyzer (`npm run analyze`).
- Dev overlay: `components/ui/performance-monitor.tsx` (toggle with Ctrl+Shift+P).
- Component memoization and combined queries in critical paths (e.g., dashboard).

## Enhanced Development Features ⭐

### **Monitoring & Observability**
- **Performance Monitoring**: Built-in performance tracking with real-time metrics
- **Health Checks**: Automated system health verification
- **Security Monitoring**: Real-time security event tracking and alerting
- **Database Monitoring**: Query performance and connection pool monitoring

### **Security Features**
- **Container Security**: Production-grade Docker security hardening
- **Database Security**: SSL connections, RLS policies, audit logging
- **Application Security**: CSRF protection, rate limiting, input validation
- **Compliance Ready**: SOC 2, GDPR, and OWASP-aligned security measures

### **Testing Infrastructure**
- **Comprehensive Testing**: Multi-environment test strategy with 95%+ coverage
- **Security Testing**: Automated vulnerability scanning and compliance testing
- **Performance Testing**: Load testing and performance benchmarking
- **Integration Testing**: Full-stack testing with realistic data scenarios

## Key Files (Updated for Enhanced Security)
- `docs/environment-setup-guide.md`: ⭐ **NEW** Comprehensive environment architecture
- `research/security-research-findings.md`: ⭐ **NEW** Industry security standards
- `research/database-security-analysis.md`: ⭐ **NEW** PostgreSQL security hardening
- `planning/monitoring-architecture.md`: ⭐ **NEW** Observability strategy
- `lib/auth-context.tsx`: Enhanced auth with security monitoring
- `lib/supabase/client.ts`: Security-hardened client with SSL enforcement
- `lib/demo-store.ts`: Demo functionality with security boundaries
- `middleware.ts`: Enhanced security middleware with monitoring

## Enhanced Scripts ⭐
```bash
# Development with full monitoring
npm run dev

# Production build with security hardening
npm run build

# Security validation
npm run security:validate
npm run security:test

# Monitoring and health checks
npm run monitoring:check
npm run health:check

# Comprehensive testing
npm run test:all
npm run test:integration
npm run test:security

# Performance analysis
npm run analyze
npm run performance
```

## Development Best Practices ⭐
- **Security-First Development**: All features include security considerations
- **Monitoring Integration**: Include monitoring points in new features
- **Testing Coverage**: Maintain 95%+ test coverage for critical paths
- **Documentation**: Update relevant docs for any new features
- **Performance**: Monitor impact of changes with built-in tools

## Mobile (PolyHarmony directory)
Mobile code exists but is not the current focus of this setup guide. See `PolyHarmony/` and prior docs for details.