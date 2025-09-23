# PolyHarmony Calendar Environment Setup Guide
## Comprehensive Environment Architecture & Best Practices

---

## 1. Environment Overview

### Current Environment Architecture

| Environment | Purpose | Database | Status | Owner |
|-------------|---------|----------|--------|-------|
| **Production** | Live user application | Supabase PostgreSQL | Active | DevOps Team |
| **Staging** | Pre-production testing | PostgreSQL 15 | Active | DevOps Team |
| **Development** | Feature development | PostgreSQL 15 | Active | Development Team |
| **Testing** | Automated testing | PostgreSQL 15 | Active | QA Team |

### Environment Specifications

#### Production Environment
- **Container**: Docker with security hardening
- **Database**: Supabase PostgreSQL 17
- **Authentication**: Supabase Auth
- **Deployment**: Docker Compose with health checks
- **Monitoring**: Health checks, security validation

#### Development Environment
- **Container**: Docker Compose (simple.yml)
- **Database**: PostgreSQL 15 with initialization scripts
- **Services**: App, PostgreSQL, Redis, MailHog
- **Ports**: 3000 (app), 5432 (db), 6379 (redis), 8025 (mail)
- **Features**: Hot reload, email testing, database inspection

---

## 2. Environment Configuration Best Practices

### 2.1 Environment Variable Management

#### Hierarchical Configuration Strategy
```bash
# Base configuration (shared defaults)
.env.base
├── NEXT_PUBLIC_APP_URL=http://localhost:3000
├── NODE_ENV=development
└── NEXT_TELEMETRY_DISABLED=1

# Environment-specific overrides
.env.development (development-specific settings)
.env.staging (staging-specific settings)
.env.production (production-specific settings)

# Local overrides (not committed to git)
.env.local (developer-specific overrides)
```

#### Required Environment Variables by Environment

| Variable | Development | Staging | Production | Description |
|----------|-------------|---------|------------|-------------|
| `NODE_ENV` | ✅ | ✅ | ✅ | Environment identifier |
| `DATABASE_URL` | ✅ | ✅ | ✅ | Database connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | ✅ | ✅ | Service role for admin operations |
| `ENCRYPTION_KEY` | ❌ | ✅ | ✅ | Data encryption key (64 chars) |
| `JWT_SECRET` | ❌ | ✅ | ✅ | JWT signing secret |

### 2.2 Database Configuration Standards

#### Connection Security
```yaml
# Secure database configuration
database:
  environment:
    POSTGRES_DB: polyharmony_production
    POSTGRES_USER: polyharmony_user
    POSTGRES_PASSWORD: ${SECURE_DB_PASSWORD}
    PGSSLMODE: require
    PGSSLCERT: /ssl/client-cert.pem
    PGSSLKEY: /ssl/client-key.pem
    PGSSLROOTCERT: /ssl/server-ca.pem
  security:
    - sslmode=require
    - connection_timeout=10
    - sslcert=/ssl/client-cert.pem
```

#### Database User Management
- **Production**: Dedicated database users with minimal privileges
- **Staging**: Separate user for testing and validation
- **Development**: Shared user with development-appropriate permissions

### 2.3 Docker Configuration Standards

#### Security Hardening
```dockerfile
# Production Dockerfile security standards
FROM node:22-alpine AS base

# Security: Non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Security: Minimal packages
RUN apk add --no-cache libc6-compat curl

# Security: Read-only filesystem
--read-only
--tmpfs /tmp:rw,noexec,nosuid,size=100m

# Security: Resource limits
deploy:
  resources:
    limits:
      memory: 2G
      cpus: '1.0'
    reservations:
      memory: 1G
      cpus: '0.5'
```

#### Health Check Standards
```yaml
# Comprehensive health checks
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

---

## 3. Deployment Procedures

### 3.1 Development Environment Setup

#### Prerequisites
- Docker and Docker Compose installed
- Node.js 22.x and npm 10.x
- Git repository access
- Environment variables configured

#### Quick Start
```bash
# Clone and setup
git clone <repository-url>
cd polyharmony-calendar

# Copy environment template
cp env.docker.example .env.local

# Start development environment
docker-compose -f docker-compose.simple.yml up

# Access points
# App: http://localhost:3000
# Database: localhost:5432
# Email Testing: http://localhost:8025
```

### 3.2 Production Deployment

#### Pre-deployment Checklist
- [ ] Environment variables validated
- [ ] Database backups completed
- [ ] Security scans passed
- [ ] Health checks configured
- [ ] Resource limits set
- [ ] Monitoring enabled

#### Deployment Process
```bash
# 1. Build production image
docker build -f Dockerfile.production -t polyharmony:production .

# 2. Deploy with health checks
docker-compose up -d

# 3. Verify deployment
curl -f http://localhost:3000/api/health

# 4. Monitor logs
docker-compose logs -f app
```

---

## 4. Security Standards

### 4.1 Authentication & Authorization

#### Supabase Configuration
```javascript
// Recommended Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
)
```

#### JWT Token Management
- Token expiration: 1 hour (production), 24 hours (development)
- Refresh token rotation: Enabled
- Secure cookie settings: HTTPOnly, Secure, SameSite=Strict

### 4.2 Data Protection

#### Encryption Standards
- **Password Hashing**: Argon2 with minimum 3 rounds
- **Data Encryption**: AES-256-GCM for sensitive data
- **Key Management**: Environment-based key rotation
- **Salt Generation**: Cryptographically secure random salts

#### Database Security
- SSL/TLS encryption for all connections
- Row Level Security (RLS) policies enabled
- Principle of least privilege for database users
- Regular security audits and penetration testing

### 4.3 Network Security

#### Container Security
- Non-root containers with minimal attack surface
- Read-only filesystems where possible
- Resource limits to prevent DoS attacks
- Network segmentation between services

#### API Security
- Rate limiting: 100 requests/minute per endpoint
- CORS configuration for allowed origins
- Input validation and sanitization
- API key authentication for internal services

---

## 5. Monitoring & Observability

### 5.1 Health Monitoring

#### Application Health Checks
```typescript
// Health check endpoint
export async function GET() {
  try {
    // Database connectivity check
    await db.execute(sql`SELECT 1`)

    // Redis connectivity check
    await redis.ping()

    // External services check
    const response = await fetch('https://api.supabase.com/health')
    if (!response.ok) throw new Error('Supabase API unavailable')

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        supabase: 'healthy'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    }, { status: 503 })
  }
}
```

### 5.2 Performance Monitoring

#### Key Metrics to Monitor
- Response time: P95 < 500ms
- Database query performance: < 100ms average
- Memory usage: < 70% of allocated
- CPU usage: < 60% of allocated
- Error rate: < 0.1%

#### Alert Thresholds
- Critical: Response time > 2s or error rate > 5%
- Warning: Response time > 1s or memory > 80%
- Info: Regular health check failures

---

## 6. Backup & Recovery

### 6.1 Database Backup Strategy

#### Automated Backups
```yaml
# Backup service configuration
backup-service:
  image: postgres:15-alpine
  environment:
    PGHOST: production-db
    PGUSER: backup_user
    PGPASSWORD: ${BACKUP_PASSWORD}
  volumes:
    - ./backups:/backups
  command: |
    bash -c "
    while true; do
      pg_dump -h production-db -U backup_user -d polyharmony > /backups/backup-\$(date +%Y%m%d-%H%M%S).sql
      sleep 86400  # Daily backups
    done
    "
```

#### Backup Verification
- Test restore procedures monthly
- Verify backup integrity after creation
- Monitor backup storage usage
- Alert on backup failures

### 6.2 Disaster Recovery

#### Recovery Time Objectives (RTO)
- Critical systems: < 4 hours
- Important systems: < 24 hours
- Non-critical systems: < 72 hours

#### Recovery Point Objectives (RPO)
- Database: < 1 hour (with continuous replication)
- Configuration: < 24 hours
- User data: < 6 hours

---

## 7. Troubleshooting Guide

### 7.1 Common Issues & Solutions

#### Database Connection Issues
```bash
# Check database connectivity
docker-compose exec db psql -U postgres -d polyharmony_dev -c "SELECT 1;"

# Verify environment variables
docker-compose exec app env | grep DATABASE_URL

# Check database logs
docker-compose logs db
```

#### Application Startup Issues
```bash
# Check application logs
docker-compose logs app

# Verify environment validation
docker-compose exec app npm run validate:env

# Check health endpoint
curl http://localhost:3000/api/health
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check for memory leaks
docker-compose logs app | grep -i memory

# Profile application performance
docker-compose exec app node --inspect=0.0.0.0:9229 app
```

### 7.2 Emergency Procedures

#### Service Recovery
```bash
# Restart specific service
docker-compose restart app

# Rebuild with no cache
docker-compose build --no-cache app

# Emergency database recovery
docker-compose exec db psql -U postgres -d polyharmony_dev < /backups/latest-backup.sql
```

#### Security Incidents
1. Isolate affected systems immediately
2. Preserve logs and evidence
3. Notify security team within 1 hour
4. Implement temporary workarounds
5. Conduct post-incident review

---

## 8. Maintenance Procedures

### 8.1 Regular Maintenance Tasks

#### Daily Tasks
- [ ] Review application logs for errors
- [ ] Check system resource usage
- [ ] Verify backup creation
- [ ] Monitor security alerts

#### Weekly Tasks
- [ ] Update security patches
- [ ] Review performance metrics
- [ ] Test disaster recovery procedures
- [ ] Clean up temporary files

#### Monthly Tasks
- [ ] Security audit and penetration testing
- [ ] Performance optimization review
- [ ] Dependency updates
- [ ] Documentation updates

### 8.2 Version Management

#### Application Versioning
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Tag releases in git with version numbers
- Maintain changelog for all releases
- Document breaking changes

#### Database Schema Versioning
- Use migrations for schema changes
- Test migrations in staging first
- Backup database before migrations
- Rollback plan for failed migrations

---

## 9. Best Practices Summary

### Security First
- Always use HTTPS in production
- Implement principle of least privilege
- Regular security audits and updates
- Encrypt sensitive data at rest and in transit

### Performance Optimization
- Monitor resource usage continuously
- Optimize database queries
- Implement caching strategies
- Regular performance testing

### Reliability Engineering
- Comprehensive health checks
- Automated backups and recovery
- Monitoring and alerting
- Disaster recovery planning

### Developer Experience
- Consistent development environment
- Comprehensive documentation
- Automated testing and validation
- Clear troubleshooting guides

---

*Document Status*: Active - Updated for September 2023 enhancements
*Last Review*: September 23, 2025
*Next Review*: December 23, 2025
*Owner*: Environment Architecture Team
