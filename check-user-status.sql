-- SQL queries to check user authentication status in Supabase
-- Run these in the Supabase SQL editor to verify the user's actual state

-- 1. Check if the user exists in auth.users table
SELECT 
    id,
    email,
    created_at,
    updated_at,
    email_confirmed_at,
    last_sign_in_at,
    confirmation_sent_at,
    recovery_sent_at,
    email_change_sent_at,
    is_sso_user,
    deleted_at
FROM auth.users 
WHERE email = 'zacks@anthropologica.tech';

-- 2. Check user metadata
SELECT 
    id,
    email,
    raw_user_meta_data,
    raw_app_meta_data,
    user_metadata,
    app_metadata
FROM auth.users 
WHERE email = 'zacks@anthropologica.tech';

-- 3. Check for any pending confirmation tokens
SELECT 
    id,
    user_id,
    token_hash,
    token_type,
    created_at,
    updated_at
FROM auth.refresh_tokens 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'zacks@anthropologica.tech'
);

-- 4. Check authentication audit log
SELECT 
    created_at,
    payload,
    error_message
FROM auth.audit_log_entries 
WHERE payload->>'email' = 'zacks@anthropologica.tech'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if user has any application data (relationships, events)
SELECT 
    (SELECT COUNT(*) FROM relationships WHERE user_id = u.id) as relationship_count,
    (SELECT COUNT(*) FROM events WHERE user_id = u.id) as event_count
FROM auth.users u
WHERE u.email = 'zacks@anthropologica.tech';