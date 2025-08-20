# Database Schemas

This directory contains all database schema files for the PolyHarmony application.

## 📋 Schema Files Overview

### 🎯 **Primary Schema (Recommended)**
- **`mvp_schema.sql`** - **Current production schema** - Use this for new deployments
  - Optimized for performance and privacy
  - Includes all necessary indexes and constraints
  - Supports the full feature set

### 🔄 **Alternative Schemas**
- **`database_schema.sql`** - Original schema design
- **`database_schema_fixed.sql`** - Corrected version of original
- **`polyharmony_schema.sql`** - Extended feature set schema
- **`postgresql_schema.sql`** - PostgreSQL-specific optimizations
- **`universal_schema.sql`** - Cross-database compatibility
- **`schema_postgres_clean.sql`** - Cleaned PostgreSQL version

## 🚀 **Quick Start**

For new deployments, use the primary schema:

```sql
-- Connect to your database and run:
\i schemas/mvp_schema.sql
```

## 📊 **Schema Features**

### Core Tables
- **`users`** - User accounts and profiles
- **`relationships`** - Partner relationships with privacy controls
- **`events`** - Calendar events with granular permissions
- **`groups`** - Polycule/group management
- **`group_members`** - Group membership and roles

### Privacy Features
- **Granular permissions** for every event
- **Relationship-based visibility** controls
- **Group privacy** settings
- **Audit trails** for data access

### Performance Optimizations
- **Indexed foreign keys** for fast joins
- **Composite indexes** for common queries
- **Partitioning** support for large datasets

## 🔧 **Setup Instructions**

### 1. Create Database
```sql
CREATE DATABASE polyharmony;
\c polyharmony;
```

### 2. Apply Schema
```sql
\i schemas/mvp_schema.sql
```

### 3. Verify Installation
```sql
\dt  -- List tables
\d users  -- Describe table structure
```

## 📈 **Migration Guide**

### From Previous Schemas
If migrating from an older schema:

1. **Backup your data**
2. **Review schema differences** using diff tools
3. **Create migration scripts** for data transformation
4. **Test thoroughly** in staging environment
5. **Apply to production** during maintenance window

### Schema Comparison
Use the included comparison script:
```bash
cd scripts
node compare-schemas.js
```

## 🧪 **Testing**

### Test Connection
```bash
cd scripts
node test-connection.js
```

### Test Setup
```bash
cd scripts
node test-setup.js
```

## 📚 **Schema Documentation**

Each schema file includes:
- **Table definitions** with constraints
- **Index specifications** for performance
- **Foreign key relationships**
- **Privacy control implementations**
- **Audit trail structures**

## 🔍 **Troubleshooting**

### Common Issues
1. **Permission errors** - Check database user privileges
2. **Constraint violations** - Verify data integrity
3. **Performance issues** - Ensure indexes are created
4. **Connection problems** - Verify connection parameters

### Support
- Check the main [README.md](../README.md)
- Review [Setup Guide](../docs/SETUP_GUIDE.md)
- Open an issue for schema-specific problems

## 📝 **Contributing**

When modifying schemas:
1. **Update the primary schema** (`mvp_schema.sql`)
2. **Document changes** in this README
3. **Test thoroughly** with sample data
4. **Update related documentation** and types
5. **Create migration scripts** if needed

---

**Note**: Always backup your database before applying schema changes in production.
