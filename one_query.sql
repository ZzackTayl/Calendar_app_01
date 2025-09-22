-- ONE query to rule them all
SELECT 
    'TOTAL_TABLES' as info, 
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') as count,
    'TOTAL_POLICIES' as info2, 
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as count2,
    'USERS_EXISTS' as info3,
    (SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'users')) as exists,
    'USER_PROFILES_EXISTS' as info4,
    (SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'user_profiles')) as exists2,
    'EVENTS_EXISTS' as info5,
    (SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'events')) as exists3,
    'CONTACTS_EXISTS' as info6,
    (SELECT EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'contacts')) as exists4,
    'UUID_ENABLED' as info7,
    (SELECT EXISTS(SELECT 1 FROM pg_available_extensions WHERE name = 'uuid-ossp' AND installed_version IS NOT NULL)) as enabled;
EOF && cat one_query.sql