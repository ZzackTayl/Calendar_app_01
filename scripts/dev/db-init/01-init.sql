-- PolyHarmony Calendar Database Initialization
-- This script sets up the local development database

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create basic tables structure for development
-- This mirrors your Supabase schema for local testing

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample data for testing
INSERT INTO users (email) VALUES ('test@example.com') ON CONFLICT (email) DO NOTHING;
INSERT INTO events (title, description, start_time, end_time, user_id) 
VALUES (
    'Sample Event', 
    'This is a test event for development', 
    NOW() + INTERVAL '1 hour', 
    NOW() + INTERVAL '2 hours',
    (SELECT id FROM users WHERE email = 'test@example.com')
) ON CONFLICT DO NOTHING;