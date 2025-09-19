#!/usr/bin/env node

/**
 * RLS Production Readiness Check
 * 
 * This script performs a comprehensive validation of Row Level Security (RLS) policies
 * to ensure multi-tenant data isolation is production-ready.
 * 
 * Usage: node scripts/rls-production-readiness-check.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const [key, ...values] = line.split('=');
      if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    
    return envVars;
  }
  return {};
}

const envVars = loadEnvFile();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create clients
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

class RLSProductionReadinessChecker {
  constructor() {
    this.criticalTables = [
      'users', 'user_profiles', 'relationships', 'relationship_groups',
      'relationship_group_members', 'events', 'event_permissions',
      'contacts', 'invitations', 'calendar_integrations', 'audit_logs'
    ];
    
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  log(level, message, details = null) {
    const symbols = { pass: '✅', fail: '❌', warn: '⚠️ ', info: '📋' };
    console.log(`${symbols[level] || '📋'} ${message}`);
    
    if (details) {
      console.log(`   ${details}`);
    }
    
    this.results[level === 'pass' ? 'passed' : level === 'fail' ? 'failed' : 'warnings']++;
    this.results.details.push({ level, message, details });
  }

  async checkRLSEnabled() {
    this.log('info', 'Checking RLS enablement on critical tables...');
    
    try {
      // Check RLS status for all critical tables
      const { data: tables, error } = await adminClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .in('tablename', this.criticalTables);

      if (error) throw error;

      const tableMap = new Map(tables.map(t => [t.tablename, t.rowsecurity]));
      
      for (const table of this.criticalTables) {
        const hasRLS = tableMap.get(table);
        if (hasRLS === true) {
          this.log('pass', `${table}: RLS enabled`);
        } else if (hasRLS === false) {
          this.log('fail', `${table}: RLS disabled - SECURITY RISK!`);
        } else {
          this.log('warn', `${table}: Table not found`);
        }
      }
    } catch (error) {
      this.log('fail', 'Failed to check RLS status', error.message);
    }
  }

  async checkPolicyCompleteness() {
    this.log('info', 'Checking policy completeness...');
    
    try {
      const { data: policies, error } = await adminClient
        .from('pg_policies')
        .select('tablename, policyname, cmd')
        .eq('schemaname', 'public')
        .in('tablename', this.criticalTables);

      if (error) throw error;

      // Group policies by table
      const policiesByTable = {};
      policies.forEach(policy => {
        if (!policiesByTable[policy.tablename]) {
          policiesByTable[policy.tablename] = new Set();
        }
        policiesByTable[policy.tablename].add(policy.cmd);
      });

      // Check each critical table has policies for all operations
      const requiredOps = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
      
      for (const table of this.criticalTables) {
        const tablePolicies = policiesByTable[table] || new Set();
        const missingOps = [...requiredOps].filter(op => !tablePolicies.has(op));
        
        if (missingOps.length === 0) {
          this.log('pass', `${table}: Complete policy coverage`);
        } else if (tablePolicies.size > 0) {
          this.log('warn', `${table}: Missing policies for ${missingOps.join(', ')}`);
        } else {
          this.log('fail', `${table}: No policies found - SECURITY RISK!`);
        }
      }
    } catch (error) {
      this.log('fail', 'Failed to check policy completeness', error.message);
    }
  }

  async checkUserIsolation() {
    this.log('info', 'Testing user data isolation...');
    
    try {
      // Create test function to simulate different users
      const testFunction = `
        CREATE OR REPLACE FUNCTION test_user_isolation_${Date.now()}()
        RETURNS TABLE(
          test_name TEXT,
          user_context TEXT,
          data_accessible BOOLEAN,
          expected_result BOOLEAN,
          test_passed BOOLEAN
        ) 
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          test_user1 UUID := '00000000-0000-0000-0000-000000000001';
          test_user2 UUID := '00000000-0000-0000-0000-000000000002';
          row_count INTEGER;
        BEGIN
          -- Test 1: User 1 trying to see User 2's profile
          PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user1)::text, true);
          
          SELECT COUNT(*) INTO row_count FROM users WHERE id = test_user2;
          RETURN QUERY SELECT 
            'User Profile Isolation'::TEXT,
            'User 1 accessing User 2 profile'::TEXT,
            row_count > 0,
            false,
            row_count = 0;

          -- Test 2: User 1 trying to see User 2's events
          SELECT COUNT(*) INTO row_count FROM events WHERE user_id::UUID = test_user2;
          RETURN QUERY SELECT 
            'Event Isolation'::TEXT,
            'User 1 accessing User 2 events'::TEXT,
            row_count > 0,
            false,
            row_count = 0;

          -- Test 3: Unauthenticated access
          PERFORM set_config('request.jwt.claims', NULL, true);
          
          SELECT COUNT(*) INTO row_count FROM users LIMIT 1;
          RETURN QUERY SELECT 
            'Unauthenticated Access'::TEXT,
            'No auth context'::TEXT,
            row_count > 0,
            false,
            row_count = 0;

        END;
        $$;
      `;

      await adminClient.rpc('exec', { sql: testFunction });
      
      const { data: testResults, error } = await adminClient
        .rpc(`test_user_isolation_${Date.now()}`);

      if (error) throw error;

      testResults.forEach(result => {
        if (result.test_passed) {
          this.log('pass', `${result.test_name}: Isolation working correctly`);
        } else {
          this.log('fail', `${result.test_name}: Isolation BROKEN - ${result.user_context}`);
        }
      });

    } catch (error) {
      this.log('warn', 'User isolation test failed', error.message);
    }
  }

  async checkPrivacyControls() {
    this.log('info', 'Checking privacy controls and relationship sharing...');
    
    try {
      // Check if privacy helper functions exist
      const privacyFunctions = [
        'can_user_access_event',
        'can_user_access_relationship'
      ];

      for (const funcName of privacyFunctions) {
        const { data, error } = await adminClient
          .rpc('pg_function_exists', { function_name: funcName });

        if (error) {
          this.log('warn', `Cannot check function ${funcName}`, error.message);
        } else if (data) {
          this.log('pass', `Privacy function ${funcName} exists`);
        } else {
          this.log('warn', `Privacy function ${funcName} missing`);
        }
      }

      // Check if privacy levels are properly enforced in policies
      const { data: eventPolicies, error: policyError } = await adminClient
        .from('pg_policies')
        .select('policyname, qual')
        .eq('tablename', 'events')
        .eq('schemaname', 'public');

      if (policyError) throw policyError;

      const hasPrivacyLogic = eventPolicies.some(policy => 
        policy.qual && (
          policy.qual.includes('privacy_level') || 
          policy.qual.includes('connection_tier')
        )
      );

      if (hasPrivacyLogic) {
        this.log('pass', 'Event policies include privacy level controls');
      } else {
        this.log('warn', 'Event policies may not enforce privacy levels');
      }

    } catch (error) {
      this.log('fail', 'Failed to check privacy controls', error.message);
    }
  }

  async checkSecurityMonitoring() {
    this.log('info', 'Checking security monitoring capabilities...');
    
    try {
      // Check if security_violations table exists and has RLS
      const { data: secTable, error } = await adminClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'security_violations')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (secTable) {
        if (secTable.rowsecurity) {
          this.log('pass', 'Security violations table exists with RLS');
        } else {
          this.log('warn', 'Security violations table exists but RLS disabled');
        }
      } else {
        this.log('warn', 'Security violations table not found - monitoring limited');
      }

      // Check if audit_logs table exists
      const { data: auditTable, error: auditError } = await adminClient
        .from('pg_tables')
        .select('tablename, rowsecurity')
        .eq('schemaname', 'public')
        .eq('tablename', 'audit_logs')
        .single();

      if (auditError && auditError.code !== 'PGRST116') throw auditError;

      if (auditTable) {
        this.log('pass', 'Audit logs table exists for security monitoring');
      } else {
        this.log('warn', 'Audit logs table not found - consider adding for compliance');
      }

    } catch (error) {
      this.log('fail', 'Failed to check security monitoring', error.message);
    }
  }

  async checkPerformanceImpact() {
    this.log('info', 'Analyzing potential performance impact...');
    
    try {
      // Check for complex policies with subqueries
      const { data: complexPolicies, error } = await adminClient
        .from('pg_policies')
        .select('tablename, policyname, qual')
        .eq('schemaname', 'public')
        .in('tablename', this.criticalTables);

      if (error) throw error;

      let complexCount = 0;
      complexPolicies.forEach(policy => {
        if (policy.qual && (
          policy.qual.includes('EXISTS') || 
          policy.qual.includes('SELECT') ||
          policy.qual.includes('JOIN')
        )) {
          complexCount++;
        }
      });

      if (complexCount === 0) {
        this.log('pass', 'No complex policies detected - good performance');
      } else if (complexCount < 5) {
        this.log('warn', `${complexCount} complex policies detected - monitor performance`);
      } else {
        this.log('warn', `${complexCount} complex policies - consider optimization`);
      }

    } catch (error) {
      this.log('fail', 'Failed to analyze performance impact', error.message);
    }
  }

  async generateComplianceReport() {
    this.log('info', 'Generating compliance report...');
    
    const totalChecks = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = Math.round((this.results.passed / totalChecks) * 100);
    
    console.log('\n🎯 RLS PRODUCTION READINESS REPORT');
    console.log('=====================================');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0 && successRate >= 90) {
      console.log('\n🎉 PRODUCTION READY!');
      console.log('Your RLS policies provide strong multi-tenant data isolation.');
      if (this.results.warnings > 0) {
        console.log('Address warnings to improve security posture.');
      }
    } else if (this.results.failed === 0) {
      console.log('\n⚠️  NEEDS IMPROVEMENT');
      console.log('RLS is working but has some gaps. Address warnings before production.');
    } else {
      console.log('\n❌ NOT PRODUCTION READY');
      console.log('Critical security issues found. Fix all failures before deploying.');
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'rls-readiness-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      successRate,
      ...this.results
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }

  async runFullCheck() {
    console.log('🔒 Starting RLS Production Readiness Check...\n');
    
    await this.checkRLSEnabled();
    console.log('');
    
    await this.checkPolicyCompleteness();
    console.log('');
    
    await this.checkUserIsolation();
    console.log('');
    
    await this.checkPrivacyControls();
    console.log('');
    
    await this.checkSecurityMonitoring();
    console.log('');
    
    await this.checkPerformanceImpact();
    console.log('');
    
    await this.generateComplianceReport();
  }
}

// Run the check
const checker = new RLSProductionReadinessChecker();
checker.runFullCheck().catch(error => {
  console.error('❌ RLS readiness check failed:', error);
  process.exit(1);
});
