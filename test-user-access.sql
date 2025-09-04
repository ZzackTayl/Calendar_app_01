-- Test queries to verify user data access for zacks@anthropologica.tech

-- 1. Check if the user exists in auth.users
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'zacks@anthropologica.tech';

-- 2. Check if user has any relationships (this was the original problem)
-- Note: This might fail if RLS is working properly and we're not authenticated as this user
SELECT COUNT(*) as relationship_count
FROM relationships 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'zacks@anthropologica.tech')
   OR partner_id = (SELECT id FROM auth.users WHERE email = 'zacks@anthropologica.tech');

-- 3. Check if there are any relationships in the table at all
SELECT COUNT(*) as total_relationships FROM relationships;

-- 4. Verify the relationships table structure
\d relationships;