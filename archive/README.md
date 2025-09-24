# Utility Scripts

This directory contains utility scripts for database management, testing, and deployment.

## 📋 Available Scripts

### 🗄️ **Database Management**

- **`deploy-schema.js`** - Deploy database schema to Supabase
- **`test-connection.js`** - Test database connectivity
- **`test-setup.js`** - Verify database setup and permissions

### 🔧 **Development Tools**

- **`compare-schemas.js`** - Compare different schema versions (to be created)
- **`seed-data.js`** - Populate database with sample data (to be created)
- **`backup-db.js`** - Create database backups (to be created)

### 🛠️ **Manual Security & Audit Tools**

These scripts provide valuable functionality for manual operations and security auditing but are not integrated into automated CI/CD workflows:

#### Security Auditing

- **`audit-rls-relationships.js`** - Comprehensive audit of RLS policies for relationships tables
- **`check-rls-status.js`** - Quick validation of RLS policy status
- **`security-audit-sweep.js`** - Broad security audit sweep
- **`validate-env-security.js`** - Environment variable security validation
- **`validate-rls-policies.js`** - RLS policy validation
- **`validate-rls-policies.sql`** - SQL-based RLS policy checks

#### Database Analysis

- **`analyze-current-schema.js`** - Analyze current database schema structure
- **`check-table-structure.js`** - Verify table structures and constraints
- **`consolidate-migrations.js`** - Consolidate database migration files
- **`discover-api-endpoints.js`** - Discover and document API endpoints

#### Testing & Validation

- **`production-readiness-test.js`** - Comprehensive production readiness checks
- **`validate-api-security.js`** - API endpoint security validation
- **`validate-middleware-optimizations.js`** - Middleware performance validation
- **`validate-realtime-functionality.js`** - Real-time feature validation

#### Migration & Deployment

- **`migrate-api-endpoints.js`** - API endpoint migration utilities
- **`migrate-password-hashing.js`** - Password hashing migration
- **`deploy-enhanced-rls.js`** - Enhanced RLS policy deployment
- **`deploy-enhanced-schema.js`** - Enhanced schema deployment
- **`deploy-safe-rls.js`** - Safe RLS deployment with rollback

#### Monitoring & Health Checks

- **`service-health-check.js`** - Service health monitoring
- **`monitoring-alerts.js`** - Monitoring and alerting setup
- **`validate-realtime-infrastructure.js`** - Real-time infrastructure validation

**Usage Note:** These scripts are designed for manual execution during development, debugging, or security audits. They are not part of the automated build or deployment pipeline.

## 🚀 **Quick Start**

### Prerequisites
```bash
npm install
```

### Environment Setup
Create `.env.local` in the project root:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_connection_string
```

## 📖 **Script Documentation**

### `deploy-schema.js`
Deploys the database schema to your Supabase instance.

```bash
cd scripts
node deploy-schema.js
```

**Options:**
- `--schema=filename` - Specify schema file (default: mvp_schema.sql)
- `--dry-run` - Show what would be executed without running
- `--backup` - Create backup before deployment

### `test-connection.js`
Tests database connectivity and basic operations.

```bash
cd scripts
node test-connection.js
```

**What it tests:**
- Connection establishment
- Basic CRUD operations
- Permission verification
- Performance benchmarks

### `test-setup.js`
Verifies that your database is properly configured.

```bash
cd scripts
node test-setup.js
```

**Verification checks:**
- Table existence
- Index creation
- Constraint validation
- Sample data insertion

## 🧪 **Testing Workflow**

### 1. Test Connection
```bash
node test-connection.js
```

### 2. Verify Setup
```bash
node test-setup.js
```

### 3. Deploy Schema (if needed)
```bash
node deploy-schema.js
```

### 4. Run Integration Tests
```bash
npm test
```

## 🔍 **Troubleshooting**

### Common Issues

#### Connection Errors
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test with explicit values
node test-connection.js --url=your_url --key=your_key
```

#### Permission Errors
```bash
# Verify service role key has admin privileges
# Check if database user exists and has proper permissions
```

#### Schema Errors
```bash
# Validate SQL syntax
psql -f schemas/mvp_schema.sql --dry-run

# Check for syntax errors
node -c schemas/mvp_schema.sql
```

## 📝 **Adding New Scripts**

When creating new utility scripts:

1. **Follow naming convention**: `kebab-case.js`
2. **Include help text**: Use `--help` flag
3. **Add error handling**: Graceful failure with clear messages
4. **Document usage**: Include examples in this README
5. **Add to package.json**: Include in scripts section if appropriate

### Template
```javascript
#!/usr/bin/env node

const { program } = require('commander');

program
  .name('script-name')
  .description('What this script does')
  .option('--option', 'Option description')
  .action(async (options) => {
    try {
      // Script logic here
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
```

## 🔒 **Security Notes**

- **Never commit** `.env.local` files
- **Use service role keys** only in trusted environments
- **Validate inputs** before executing database operations
- **Log operations** for audit purposes
- **Backup data** before destructive operations

## 📚 **Related Documentation**

- [Database Schemas](../schemas/README.md)
- [Setup Guide](../docs/SETUP_GUIDE.md)
- [Technical Stack](../docs/TECH_STACK.md)

---

**Note**: Always test scripts in a development environment before running in production.
