-- ======================================================================
-- POSTGRESQL EXTENSIONS FOR TEST DATABASE
-- ======================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS if needed for location features
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_stat_statements for query performance monitoring in tests
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable pg_trgm for text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgcrypto for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create test database user with limited privileges
DO $$
BEGIN
    -- Create test user if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'test_user') THEN
        CREATE USER test_user WITH PASSWORD 'test_user_password';
    END IF;
    
    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE polyharmony_test TO test_user;
    GRANT USAGE ON SCHEMA public TO test_user;
    GRANT CREATE ON SCHEMA public TO test_user;
    
    -- Grant permissions on sequences (for UUID generation)
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO test_user;
    
    -- Grant table permissions
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO test_user;
END
$$;