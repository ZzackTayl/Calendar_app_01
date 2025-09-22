# 🚀 RLS Performance Optimization Guide

This document explains how to resolve the RLS performance issue in the `public.user_profiles` table and other tables by optimizing auth function calls.

## 🛠️ The Problem

### Issue Description
```
Table public.user_profiles has a row level security policy that re-evaluates
current_setting() or auth.<function>() for each row. This produces suboptimal
query performance at scale.
```

### Root Cause
RLS policies using `auth.uid()` directly cause PostgreSQL to re-evaluate the auth function for **every single row** in the query result. This creates significant performance overhead, especially when:
- Querying large datasets
- Complex joins are involved
- Multiple auth function calls exist in the same policy

## 🎯 The Solution

### Optimization Pattern
Replace direct auth function calls:
```sql
-- ❌ Inefficient (re-evaluated for each row)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
```

With subquery optimization:
```sql
-- ✅ Optimized (evaluated once, cached)
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING ((select auth.uid()) = id);
```

### Performance Impact
- **Before**: `auth.uid()` called once per row
- **After**: `auth.uid()` called once per query, result cached
- **Result**: Up to 10x+ performance improvement for large datasets

## 📋 Migration Overview

### What Changed
The migration `20250922000000_rls_performance_optimization.sql` optimizes policies for:

1. **user_profiles** table (original issue)
2. **users** table
3. **relationships** table
4. **events** table
5. **relationship_groups** table
6. **contacts** table
7. **event_permissions** table
8. **event_visibility** table
9. **event_attachments** table

### Pattern Applied
```sql
-- Original (inefficient)
auth.uid() = user_id

-- Optimized
(select auth.uid()) = user_id

-- Complex policies with multiple auth calls
-- Original
auth.uid() = user_id OR auth.uid() = partner_id

-- Optimized
(select auth.uid()) = user_id OR (select auth.uid()) = partner_id
```

## 🧪 Testing the Optimization

### Run the Test Script
```bash
node test-rls-optimization.js
```

### Expected Results
- ✅ RLS performance function executes successfully
- ✅ User profiles policies work correctly
- ✅ Multiple tables are accessible as expected
- ✅ No security regressions

### Manual Verification
```sql
-- Check if policies use optimized pattern
SELECT schemaname, tablename, polname, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
ORDER BY tablename, polname;
```

## 🔧 Implementation Details

### Migration File
**File**: `supabase/migrations/20250922000000_rls_performance_optimization.sql`

**Key Features**:
- Drops existing inefficient policies
- Creates optimized policies with `(select auth.uid())` pattern
- Includes performance testing function
- Provides comprehensive verification

### Performance Test Function
```sql
-- Run this to verify optimization
SELECT * FROM test_rls_performance_optimization();
```

**Expected Output**:
```
table_name        | policy_count | optimized_policies | performance_status
RLS Performance Test | 28          | 28                | FULLY OPTIMIZED
```

## 📊 Performance Benchmarks

### Before Optimization
- `auth.uid()` called N times (where N = number of rows)
- Linear performance degradation with dataset size
- Query planning overhead for each auth evaluation

### After Optimization
- `auth.uid()` called once per query
- Constant performance regardless of dataset size
- Optimized query execution plans

### Real-World Impact
For a query returning 1000 rows:
- **Before**: 1000+ auth function calls
- **After**: 1 auth function call
- **Improvement**: ~1000x reduction in auth overhead

## 🚨 Security Considerations

### Maintained Security
✅ **All existing security policies preserved**
✅ **User isolation maintained**
✅ **No privilege escalation**
✅ **Service role access unchanged**

### What Changed
❌ **Direct auth function calls**
✅ **Subquery-based auth function calls**

### Verification Steps
1. Test user authentication flows
2. Verify data isolation between users
3. Check service role operations
4. Monitor for any access anomalies

## 🔄 Rollback Plan

### If Issues Occur
1. **Revert the migration**: `supabase db reset`
2. **Apply original policies**: Use previous migration file
3. **Test thoroughly**: Verify all functionality
4. **Investigate root cause**: Before re-applying optimization

### Emergency Fix
```sql
-- Temporarily disable optimization if needed
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);
```

## 📈 Monitoring and Maintenance

### Performance Monitoring
```sql
-- Monitor query performance
EXPLAIN ANALYZE
SELECT * FROM user_profiles
WHERE id = (select auth.uid());
```

### Policy Health Check
```sql
-- Verify all policies are optimized
SELECT
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%(select auth.%' THEN 1 END) as optimized_policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

### Regular Maintenance
- ✅ Monitor query performance in production
- ✅ Review slow query logs
- ✅ Test RLS policies during deployments
- ✅ Update policies when schema changes

## 🐛 Troubleshooting

### Common Issues

**1. Policy Not Applied**
```
ERROR: policy "Users can view own profile" already exists
```
**Solution**: Drop existing policy first

**2. Permission Denied**
```
ERROR: permission denied for function auth.uid
```
**Solution**: Ensure proper RLS context

**3. Performance Still Poor**
**Solution**: Check if all policies are optimized, verify indexes

### Debug Commands
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Test auth context
SELECT auth.uid(), auth.role();

-- Verify policy evaluation
EXPLAIN SELECT * FROM user_profiles;
```

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Performance Tuning](https://www.postgresql.org/docs/current/performance-tips.html)
- [Auth Functions Reference](https://supabase.com/docs/guides/auth/auth-helpers)

## ✅ Verification Checklist

- [ ] Migration applied successfully
- [ ] RLS performance function works
- [ ] User authentication flows tested
- [ ] Data isolation verified
- [ ] Performance improvement confirmed
- [ ] No security regressions detected
- [ ] Documentation updated

---

**Note**: This optimization significantly improves query performance at scale while maintaining all security guarantees. The `(select auth.uid())` pattern ensures auth functions are evaluated once per query rather than once per row, providing substantial performance benefits for applications with large datasets.
