-- Enable UUID generation extension prior to any tables that depend on uuid_generate_v4()
-- Safe to run multiple times on any environment
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
