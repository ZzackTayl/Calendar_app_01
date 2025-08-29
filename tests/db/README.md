# Database Testing Infrastructure

This directory contains comprehensive database testing infrastructure for the PolyHarmony Calendar application, providing isolated testing environments, data seeding, schema validation, and migration testing capabilities.

## 🏗️ Infrastructure Overview

### Docker Test Environment

- **`docker-compose.test.yml`** - Isolated test database configuration
- **`Dockerfile.test`** - Test-specific container configuration
- **Test Database**: PostgreSQL 15 on port 5433 (separate from dev)
- **Supabase Test Instance**: Available for full-stack integration testing

### Core Components

1. **Database Seeding** (`seed-data.ts`)
   - Realistic test data generation
   - User, relationship, event, and group creation
   - Configurable data scenarios for testing

2. **Database Cleanup** (`cleanup.ts`)
   - Safe database truncation
   - Foreign key constraint handling
   - Sequence reset capabilities

3. **Schema Validation** (`schema-validation.ts`)
   - Table structure verification
   - Constraint validation
   - Index performance checks
   - RLS policy verification

4. **Migration Testing** (`migration-testing.ts`)
   - Migration execution validation
   - Rollback testing
   - Data integrity checks
   - Performance monitoring

5. **Type Consistency** (`type-consistency.ts`)
   - TypeScript-Database alignment
   - Enum value consistency
   - Nullability validation
   - Type mapping verification

6. **Test Utilities** (`test-utilities.ts`)
   - High-level testing helpers
   - Test context management
   - Assertion utilities
   - Database health checks

## 🚀 Quick Start

### 1. Setup Test Environment

```bash
# Start test database
npm run test:db:setup

# Check database health
npm run test:db:health

# Seed with test data
npm run test:db:seed
```

### 2. Run Validations

```bash
# Complete validation suite
npm run test:db:validate

# Individual validations
npm run test:db:schema    # Schema validation
npm run test:db:types     # Type consistency
npm run test:db:migration # Migration tests
```

### 3. Integration Testing

```bash
# Full integration tests with app
npm run test:integration

# Supabase-specific tests
npm run test:supabase
```

### 4. Cleanup

```bash
# Clean test database
npm run test:db:clean

# Stop test environment
npm run test:db:teardown
```

## 📋 Available Scripts

### Environment Management
- `test:db:setup` - Start test database container
- `test:db:teardown` - Stop and remove test containers
- `test:db:reset` - Restart test database
- `test:db:logs` - View database logs

### Data Management
- `test:db:seed` - Populate database with test data
- `test:db:clean` - Clean all test data
- `test:db:health` - Check database health

### Validation & Testing
- `test:db:validate` - Run all validation tests
- `test:db:schema` - Validate database schema
- `test:db:types` - Check TypeScript type consistency
- `test:db:migration` - Test database migrations

### Integration Testing
- `test:integration` - Full integration test suite
- `test:supabase` - Supabase-specific integration tests

## 🧪 Writing Database Tests

### Basic Test Setup

```typescript
import { withDatabase } from '../db/test-utilities';

describe('User Management', () => {
  it('should create and retrieve users', async () => {
    await withDatabase(async (context) => {
      const { client, users } = context;
      
      // Use pre-seeded test users
      const testUser = users[0];
      
      // Perform test operations
      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('id', testUser.id)
        .single();
        
      expect(data).toBeTruthy();
      expect(data.email).toBe(testUser.email);
    });
  });
});
```

### Isolated Test Environment

```typescript
import { withIsolatedDatabase } from '../db/test-utilities';

describe('Event Privacy', () => {
  it('should respect privacy levels', async () => {
    await withIsolatedDatabase(async (context) => {
      // Each test gets a completely clean database
      const user = await context.seeder.createTestUser({
        email: 'privacy-test@example.com'
      });
      
      // Test privacy logic...
    });
  });
});
```

### Custom Data Scenarios

```typescript
import { withCleanDatabase } from '../db/test-utilities';

describe('Complex Relationships', () => {
  it('should handle polyamorous structures', async () => {
    await withCleanDatabase(async (context) => {
      // Create custom test data for specific scenario
      const alice = await context.seeder.createTestUser({ 
        email: 'alice@test.com' 
      });
      const bob = await context.seeder.createTestUser({ 
        email: 'bob@test.com' 
      });
      const charlie = await context.seeder.createTestUser({ 
        email: 'charlie@test.com' 
      });
      
      // Create relationships
      await context.seeder.createTestRelationship(
        alice.id, bob.id, { relationship_type: 'primary' }
      );
      
      // Test complex relationship scenarios...
    });
  });
});
```

## 🔍 Validation Features

### Schema Validation
- ✅ Table existence and structure
- ✅ Column types and constraints
- ✅ Foreign key relationships
- ✅ Index performance optimization
- ✅ RLS policy configuration
- ✅ Enum type consistency

### Type Consistency
- ✅ TypeScript-PostgreSQL type mapping
- ✅ Enum value alignment
- ✅ Nullability consistency
- ✅ Interface completeness
- ✅ Naming convention validation

### Migration Testing
- ✅ Migration execution safety
- ✅ Rollback capability
- ✅ Data integrity preservation
- ✅ Performance impact analysis
- ✅ Schema evolution tracking

### Data Integrity
- ✅ Foreign key constraint validation
- ✅ Unique constraint enforcement
- ✅ Check constraint verification
- ✅ Trigger functionality
- ✅ RLS policy enforcement

## 🐳 Docker Configuration

### Test Database Container
- **Image**: `postgres:15-alpine`
- **Port**: `5433` (avoids conflicts)
- **Database**: `polyharmony_test`
- **Volume**: Persistent test data storage
- **Health Checks**: Automatic readiness detection

### Application Test Container
- **Build**: Custom test Dockerfile
- **Dependencies**: Waits for database health
- **Environment**: Test-specific configuration
- **Profiles**: Conditional container startup

### Network Isolation
- **Test Network**: `polyharmony-test-network`
- **Service Discovery**: Container-to-container communication
- **Port Mapping**: External access for debugging

## 📊 Monitoring & Reporting

### Health Checks
- Database connectivity
- Schema integrity
- RLS policy status
- Performance metrics

### Detailed Reports
- Schema validation report
- Type consistency analysis
- Migration test results
- Performance benchmarks

### Debugging Tools
- Database logs access
- Query performance analysis
- Connection monitoring
- Error tracking

## 🔧 Configuration

### Environment Variables

```bash
# Test database connection
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_SERVICE_KEY=your_test_service_key

# Database credentials
POSTGRES_DB=polyharmony_test
POSTGRES_USER=postgres
POSTGRES_PASSWORD=test_password_123

# Test settings
NODE_ENV=test
DISABLE_EXTERNAL_APIS=true
```

### Docker Compose Profiles
- `integration-tests` - Full app + database testing
- `supabase-tests` - Supabase-specific testing

## 🚨 Best Practices

### Test Isolation
- Always use isolated database environments
- Clean up after each test suite
- Avoid test interdependencies
- Use transactions for atomic operations

### Data Management
- Use realistic but anonymized test data
- Implement proper cleanup procedures
- Monitor database growth
- Regular backup validation

### Performance
- Optimize test data volume
- Use database indexing effectively
- Monitor query performance
- Implement connection pooling

### Security
- Never use production credentials
- Implement proper access controls
- Validate RLS policies thoroughly
- Test permission boundaries

## 🔗 Integration Points

### Vitest Integration
- Configured in `vitest.config.ts`
- Setup file: `tests/setup.ts`
- Custom matchers and helpers

### CI/CD Pipeline
- Automated test database setup
- Parallel test execution
- Artifact collection
- Performance monitoring

### Development Workflow
- Pre-commit schema validation
- Migration testing automation
- Type consistency checks
- Performance regression detection

## 📈 Metrics & Analytics

### Test Coverage
- Database operation coverage
- Schema validation coverage
- Edge case testing
- Performance benchmarks

### Quality Gates
- All schema validations pass
- Type consistency maintained
- Migration tests successful
- Performance within thresholds

## 🆘 Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check port usage
   lsof -i :5433
   
   # Kill conflicting processes
   docker-compose -f docker-compose.test.yml down
   ```

2. **Permission Issues**
   ```bash
   # Reset Docker volumes
   docker-compose -f docker-compose.test.yml down -v
   docker volume prune
   ```

3. **Schema Mismatches**
   ```bash
   # Regenerate types
   npx supabase gen types typescript --local > lib/supabase/types.ts
   
   # Validate consistency
   npm run test:db:types
   ```

4. **Migration Failures**
   ```bash
   # Check migration logs
   npm run test:db:logs
   
   # Reset and reapply
   npm run test:db:reset
   npm run test:db:migration
   ```

### Debug Mode
```bash
# Enable verbose logging
DEBUG=true npm run test:db:validate

# Access database directly
docker-compose -f docker-compose.test.yml exec test-db psql -U postgres -d polyharmony_test
```

## 📚 Further Reading

- [Supabase Testing Documentation](https://supabase.com/docs/guides/testing)
- [PostgreSQL Testing Best Practices](https://wiki.postgresql.org/wiki/Testing)
- [Docker Compose Testing Patterns](https://docs.docker.com/compose/testing/)
- [Vitest Configuration Guide](https://vitest.dev/config/)

---

This infrastructure provides a robust foundation for database testing, ensuring data integrity, type safety, and schema consistency across the PolyHarmony Calendar application.