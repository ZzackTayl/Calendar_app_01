-- Calendar Mobile Database Initialization
-- This script creates the initial tables for Calendar and User models

-- Create Calendar table
CREATE TABLE IF NOT EXISTS calendar (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create User table  
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_date ON calendar(date);
CREATE INDEX IF NOT EXISTS idx_calendar_title ON calendar(title);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_name ON "user"(name);

-- Insert some sample data for testing
INSERT INTO "user" (name, email, created_at) VALUES 
    ('John Doe', 'john.doe@example.com', CURRENT_TIMESTAMP),
    ('Jane Smith', 'jane.smith@example.com', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

INSERT INTO calendar (title, date) VALUES 
    ('Team Meeting', '2024-01-15 10:00:00'),
    ('Project Deadline', '2024-01-20 17:00:00'),
    ('Conference Call', '2024-01-22 14:30:00')
ON CONFLICT DO NOTHING;